/**
 * Computes a unified CodeArena Composite Rating based on:
 * - LeetCode rating (weight 0.35)
 * - Codeforces rating (weight 0.45, normalized due to higher competitive rigor)
 * - CodeChef rating (weight 0.20)
 *
 * When not all platforms are connected, uses a weighted average of the
 * connected platforms so partial connections still give a fair rating.
 */
export function calculateCompositeScore(
  leetcodeRating: number = 0,
  codeforcesRating: number = 0,
  codechefRating: number = 0
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  if (leetcodeRating > 0) {
    weightedSum += leetcodeRating * 0.35;
    totalWeight += 0.35;
  }

  if (codeforcesRating > 0) {
    weightedSum += codeforcesRating * 0.45;
    totalWeight += 0.45;
  }

  if (codechefRating > 0) {
    weightedSum += codechefRating * 0.20;
    totalWeight += 0.20;
  }

  if (totalWeight === 0) return 1200; // baseline rating

  // Normalise to the weight that is actually present so a user with only
  // one platform still gets a sensible score in the same range.
  return Math.round(weightedSum / totalWeight);
}

export function getRatingTier(rating: number): string {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1700) return 'Expert';
  if (rating >= 1500) return 'Specialist';
  if (rating >= 1300) return 'Apprentice';
  return 'Novice';
}
