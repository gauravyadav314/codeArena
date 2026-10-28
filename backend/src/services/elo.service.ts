import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { getRatingTier } from './rating.service';

export interface EloCalculationResult {
  player1RatingBefore: number;
  player1RatingAfter: number;
  player1Delta: number;
  player2RatingBefore: number;
  player2RatingAfter: number;
  player2Delta: number;
}

/**
 * Determines provisional K-factor based on player match experience and rating tier.
 * - Under 10 matches: K = 40 (rapid placement)
 * - Rating >= 2400: K = 16 (high tier rating stabilization)
 * - Rating >= 2000: K = 24
 * - Standard: K = 32
 */
export function getProvisionalKFactor(matchesPlayed: number, currentRating: number): number {
  if (matchesPlayed < 10) return 40;
  if (currentRating >= 2400) return 16;
  if (currentRating >= 2000) return 24;
  return 32;
}

/**
 * Computes Expected ELO score: E = 1 / (1 + 10^((opp - self) / 400))
 */
export function computeExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates ELO rating adjustments for two players.
 * Supports winner-take-all and draw scenarios.
 */
export function calculateMatchElo(
  p1Rating: number,
  p1Matches: number,
  p2Rating: number,
  p2Matches: number,
  outcome: 'PLAYER_1_WIN' | 'PLAYER_2_WIN' | 'DRAW'
): EloCalculationResult {
  const k1 = getProvisionalKFactor(p1Matches, p1Rating);
  const k2 = getProvisionalKFactor(p2Matches, p2Rating);

  const e1 = computeExpectedScore(p1Rating, p2Rating);
  const e2 = computeExpectedScore(p2Rating, p1Rating);

  let s1 = 0.5;
  let s2 = 0.5;

  if (outcome === 'PLAYER_1_WIN') {
    s1 = 1;
    s2 = 0;
  } else if (outcome === 'PLAYER_2_WIN') {
    s1 = 0;
    s2 = 1;
  }

  const p1Delta = Math.round(k1 * (s1 - e1));
  const p2Delta = Math.round(k2 * (s2 - e2));

  const p1RatingAfter = Math.max(100, p1Rating + p1Delta);
  const p2RatingAfter = Math.max(100, p2Rating + p2Delta);

  return {
    player1RatingBefore: p1Rating,
    player1RatingAfter: p1RatingAfter,
    player1Delta: p1Delta,
    player2RatingBefore: p2Rating,
    player2RatingAfter: p2RatingAfter,
    player2Delta: p2Delta,
  };
}

/**
 * Finalizes a match with atomic ELO rating application inside a serializable Prisma transaction.
 * Idempotent: If match is already COMPLETED or DRAW, returns the existing state without re-updating.
 */
export async function finalizeMatchResult(params: {
  matchId: string;
  winnerUserId?: string | null;
  isDraw?: boolean;
}) {
  const { matchId, winnerUserId, isDraw } = params;

  return await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      throw new NotFoundError(`Match ${matchId} not found`);
    }

    // Idempotency guard: Don't process already finalized matches
    if (match.status === 'COMPLETED' || match.status === 'DRAW') {
      return {
        alreadyFinalized: true,
        match,
      };
    }

    if (!match.player2) {
      throw new BadRequestError('Match cannot be finalized without two players');
    }

    const p1 = match.player1;
    const p2 = match.player2;

    const p1Matches = p1.wins + p1.losses + p1.draws;
    const p2Matches = p2.wins + p2.losses + p2.draws;

    let outcome: 'PLAYER_1_WIN' | 'PLAYER_2_WIN' | 'DRAW' = 'DRAW';
    let finalStatus = 'DRAW';
    let winnerId: string | null = null;

    if (!isDraw && winnerUserId) {
      if (winnerUserId === p1.id) {
        outcome = 'PLAYER_1_WIN';
        finalStatus = 'COMPLETED';
        winnerId = p1.id;
      } else if (winnerUserId === p2.id) {
        outcome = 'PLAYER_2_WIN';
        finalStatus = 'COMPLETED';
        winnerId = p2.id;
      }
    }

    const elo = calculateMatchElo(p1.arenaRating, p1Matches, p2.arenaRating, p2Matches, outcome);

    const now = new Date();

    // Determine stat increments
    const p1WinsInc = outcome === 'PLAYER_1_WIN' ? 1 : 0;
    const p1LossesInc = outcome === 'PLAYER_2_WIN' ? 1 : 0;
    const p1DrawsInc = outcome === 'DRAW' ? 1 : 0;
    const p1NewStreak = outcome === 'PLAYER_1_WIN' ? p1.streak + 1 : outcome === 'PLAYER_2_WIN' ? 0 : p1.streak;

    const p2WinsInc = outcome === 'PLAYER_2_WIN' ? 1 : 0;
    const p2LossesInc = outcome === 'PLAYER_1_WIN' ? 1 : 0;
    const p2DrawsInc = outcome === 'DRAW' ? 1 : 0;
    const p2NewStreak = outcome === 'PLAYER_2_WIN' ? p2.streak + 1 : outcome === 'PLAYER_1_WIN' ? 0 : p2.streak;

    // 1. Update Match record
    const updatedMatch = await tx.match.update({
      where: { id: match.id },
      data: {
        status: finalStatus,
        winnerId,
        player1Score: outcome === 'PLAYER_1_WIN' ? 100 : outcome === 'DRAW' ? 50 : 0,
        player2Score: outcome === 'PLAYER_2_WIN' ? 100 : outcome === 'DRAW' ? 50 : 0,
        player1RatingBefore: elo.player1RatingBefore,
        player1RatingAfter: elo.player1RatingAfter,
        player2RatingBefore: elo.player2RatingBefore,
        player2RatingAfter: elo.player2RatingAfter,
        endedAt: now,
      },
      include: {
        player1: true,
        player2: true,
        problem: true,
      },
    });

    // 2. Update Player 1
    await tx.user.update({
      where: { id: p1.id },
      data: {
        arenaRating: elo.player1RatingAfter,
        ratingTier: getRatingTier(elo.player1RatingAfter),
        wins: { increment: p1WinsInc },
        losses: { increment: p1LossesInc },
        draws: { increment: p1DrawsInc },
        streak: p1NewStreak,
      },
    });

    // 3. Update Player 2
    await tx.user.update({
      where: { id: p2.id },
      data: {
        arenaRating: elo.player2RatingAfter,
        ratingTier: getRatingTier(elo.player2RatingAfter),
        wins: { increment: p2WinsInc },
        losses: { increment: p2LossesInc },
        draws: { increment: p2DrawsInc },
        streak: p2NewStreak,
      },
    });

    // 4. Create RatingHistory records
    await tx.ratingHistory.createMany({
      data: [
        {
          userId: p1.id,
          matchId: match.id,
          ratingBefore: elo.player1RatingBefore,
          ratingAfter: elo.player1RatingAfter,
          change: elo.player1Delta,
          reason: outcome === 'PLAYER_1_WIN' ? 'MATCH_WIN' : outcome === 'PLAYER_2_WIN' ? 'MATCH_LOSS' : 'MATCH_DRAW',
          createdAt: now,
        },
        {
          userId: p2.id,
          matchId: match.id,
          ratingBefore: elo.player2RatingBefore,
          ratingAfter: elo.player2RatingAfter,
          change: elo.player2Delta,
          reason: outcome === 'PLAYER_2_WIN' ? 'MATCH_WIN' : outcome === 'PLAYER_1_WIN' ? 'MATCH_LOSS' : 'MATCH_DRAW',
          createdAt: now,
        },
      ],
    });

    return {
      alreadyFinalized: false,
      match: updatedMatch,
      eloDeltas: {
        player1: { before: elo.player1RatingBefore, after: elo.player1RatingAfter, delta: elo.player1Delta },
        player2: { before: elo.player2RatingBefore, after: elo.player2RatingAfter, delta: elo.player2Delta },
      },
    };
  });
}

