import { describe, it, expect } from 'vitest';
import {
  getProvisionalKFactor,
  computeExpectedScore,
  calculateMatchElo,
} from '../src/services/elo.service';

describe('ELO Rating Service - Provisional K-Factor Engine', () => {
  it('assigns K = 40 for newcomer with under 10 matches', () => {
    expect(getProvisionalKFactor(0, 1200)).toBe(40);
    expect(getProvisionalKFactor(5, 1400)).toBe(40);
    expect(getProvisionalKFactor(9, 1350)).toBe(40);
  });

  it('assigns K = 16 for elite ratings >= 2400', () => {
    expect(getProvisionalKFactor(20, 2400)).toBe(16);
    expect(getProvisionalKFactor(50, 2650)).toBe(16);
  });

  it('assigns K = 24 for veteran ratings >= 2000', () => {
    expect(getProvisionalKFactor(30, 2050)).toBe(24);
  });

  it('assigns standard K = 32 for established regular players', () => {
    expect(getProvisionalKFactor(15, 1500)).toBe(32);
    expect(getProvisionalKFactor(40, 1800)).toBe(32);
  });
});

describe('ELO Rating Service - Match Outcomes & Calculations', () => {
  it('equal rating duel gives symmetric delta', () => {
    const result = calculateMatchElo(1500, 20, 1500, 20, 'PLAYER_1_WIN');

    expect(result.player1RatingBefore).toBe(1500);
    expect(result.player1RatingAfter).toBe(1516);
    expect(result.player1Delta).toBe(16);

    expect(result.player2RatingBefore).toBe(1500);
    expect(result.player2RatingAfter).toBe(1484);
    expect(result.player2Delta).toBe(-16);
  });

  it('underdog win produces significantly larger rating delta', () => {
    const result = calculateMatchElo(1200, 20, 1800, 20, 'PLAYER_1_WIN');

    expect(result.player1Delta).toBeGreaterThanOrEqual(30);
    expect(result.player2Delta).toBeLessThanOrEqual(-30);
  });

  it('favorite win produces small rating delta', () => {
    const result = calculateMatchElo(1800, 20, 1200, 20, 'PLAYER_1_WIN');

    expect(result.player1Delta).toBeLessThanOrEqual(5);
    expect(result.player2Delta).toBeGreaterThanOrEqual(-5);
  });

  it('equal rating draw produces zero net change', () => {
    const result = calculateMatchElo(1500, 20, 1500, 20, 'DRAW');

    expect(result.player1Delta).toBe(0);
    expect(result.player2Delta).toBe(0);
    expect(result.player1RatingAfter).toBe(1500);
    expect(result.player2RatingAfter).toBe(1500);
  });

  it('enforces floor rating of 100 on severe losses', () => {
    const result = calculateMatchElo(105, 20, 1800, 20, 'PLAYER_2_WIN');
    expect(result.player1RatingAfter).toBeGreaterThanOrEqual(100);
  });
});
