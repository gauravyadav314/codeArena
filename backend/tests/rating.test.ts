import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompositeScore, getRatingTier } from '../src/services/rating.service';

test('Rating Service - calculateCompositeScore', async (t) => {
  await t.test('returns baseline 1200 if no ratings are provided', () => {
    const score = calculateCompositeScore(0, 0, 0);
    assert.equal(score, 1200);
  });

  await t.test('computes weighted score when all 3 platforms are provided', () => {
    // Leetcode 2000 (0.35) -> 700
    // Codeforces 1800 (0.45) -> 810
    // Codechef 1900 (0.20) -> 380
    // Sum = 1890, total weight = 1.0 -> 1890
    const score = calculateCompositeScore(2000, 1800, 1900);
    assert.equal(score, 1890);
  });

  await t.test('normalizes fairly when only single platform is connected', () => {
    // Single LeetCode rating 2100 should remain ~2100
    const score = calculateCompositeScore(2100, 0, 0);
    assert.equal(score, 2100);
  });
});

test('Rating Service - getRatingTier', async (t) => {
  await t.test('assigns Grandmaster for rating >= 2100', () => {
    assert.equal(getRatingTier(2150), 'Grandmaster');
    assert.equal(getRatingTier(2100), 'Grandmaster');
  });

  await t.test('assigns Master for rating >= 1900 and < 2100', () => {
    assert.equal(getRatingTier(1950), 'Master');
  });

  await t.test('assigns Expert for rating >= 1700 and < 1900', () => {
    assert.equal(getRatingTier(1750), 'Expert');
  });

  await t.test('assigns Specialist for rating >= 1500 and < 1700', () => {
    assert.equal(getRatingTier(1550), 'Specialist');
  });

  await t.test('assigns Apprentice for rating >= 1300 and < 1500', () => {
    assert.equal(getRatingTier(1350), 'Apprentice');
  });

  await t.test('assigns Novice for rating < 1300', () => {
    assert.equal(getRatingTier(1200), 'Novice');
    assert.equal(getRatingTier(800), 'Novice');
  });
});
