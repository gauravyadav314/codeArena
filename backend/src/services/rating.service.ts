/**
 * Computes a unified CodeArena Composite Rating based on:
 * - LeetCode rating (weight ~0.35)
 * - Codeforces rating (weight ~0.45, normalized due to higher competitive rigor)
 * - CodeChef rating (weight ~0.20)
 */
export function calculateCompositeScore(
  leetcodeRating: number = 0,
  codeforcesRating: number = 0,
  codechefRating: number = 0
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  if (leetcodeRating > 0) {
    // Leetcode ratings generally range 1400-2400
    weightedSum += leetcodeRating * 0.35;
    totalWeight += 0.35;
  }

  if (codeforcesRating > 0) {
    // Codeforces ratings range 1000-2600+
    weightedSum += codeforcesRating * 0.45;
    totalWeight += 0.45;
  }

  if (codechefRating > 0) {
    // CodeChef ratings range 1200-2500
    weightedSum += codechefRating * 0.20;
    totalWeight += 0.20;
  }

  if (totalWeight === 0) return 1200; // baseline rating
  return Math.round(weightedSum / totalWeight);
}

export function getRatingTier(rating: number): string {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1600) return 'Expert';
  if (rating >= 1400) return 'Specialist';
  if (rating >= 1200) return 'Apprentice';
  return 'Novice';
}
