import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProvisionalKFactor,
  computeExpectedScore,
  calculateMatchElo,
} from '../src/services/elo.service';

test('ELO Rating Service - Provisional K-Factor Engine', async (t) => {
  await t.test('assigns K = 40 for newcomer with under 10 matches', () => {
    assert.equal(getProvisionalKFactor(0, 1200), 40);
    assert.equal(getProvisionalKFactor(5, 1400), 40);
    assert.equal(getProvisionalKFactor(9, 1350), 40);
  });

  await t.test('assigns K = 16 for elite ratings >= 2400', () => {
    assert.equal(getProvisionalKFactor(20, 2400), 16);
    assert.equal(getProvisionalKFactor(50, 2650), 16);
  });

  await t.test('assigns K = 24 for veteran ratings >= 2000', () => {
    assert.equal(getProvisionalKFactor(30, 2050), 24);
  });

  await t.test('assigns standard K = 32 for established regular players', () => {
    assert.equal(getProvisionalKFactor(15, 1500), 32);
    assert.equal(getProvisionalKFactor(40, 1800), 32);
  });
});

test('ELO Rating Service - Match Outcomes & Calculations', async (t) => {
  await t.test('equal rating duel gives symmetric delta', () => {
    // Both 1500, established players (K=32)
    const result = calculateMatchElo(1500, 20, 1500, 20, 'PLAYER_1_WIN');

    assert.equal(result.player1RatingBefore, 1500);
    assert.equal(result.player1RatingAfter, 1516);
    assert.equal(result.player1Delta, 16);

    assert.equal(result.player2RatingBefore, 1500);
    assert.equal(result.player2RatingAfter, 1484);
    assert.equal(result.player2Delta, -16);
  });

  await t.test('underdog win produces significantly larger rating delta', () => {
    // Underdog 1200 beats 1800
    const result = calculateMatchElo(1200, 20, 1800, 20, 'PLAYER_1_WIN');

    // Expected score is tiny, so gain should approach K = 32
    assert.ok(result.player1Delta >= 30);
    assert.ok(result.player2Delta <= -30);
  });

  await t.test('favorite win produces small rating delta', () => {
    // 1800 beats 1200
    const result = calculateMatchElo(1800, 20, 1200, 20, 'PLAYER_1_WIN');

    // Expected score is almost 1, so gain should be very small
    assert.ok(result.player1Delta <= 5);
    assert.ok(result.player2Delta >= -5);
  });

  await t.test('equal rating draw produces zero net change', () => {
    const result = calculateMatchElo(1500, 20, 1500, 20, 'DRAW');

    assert.equal(result.player1Delta, 0);
    assert.equal(result.player2Delta, 0);
    assert.equal(result.player1RatingAfter, 1500);
    assert.equal(result.player2RatingAfter, 1500);
  });

  await t.test('enforces floor rating of 100 on severe losses', () => {
    const result = calculateMatchElo(105, 20, 1800, 20, 'PLAYER_2_WIN');
    assert.ok(result.player1RatingAfter >= 100);
  });
});

