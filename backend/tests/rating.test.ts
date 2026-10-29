import { describe, it, expect } from 'vitest';
import { calculateCompositeScore, getRatingTier } from '../src/services/rating.service';

describe('Rating Service - calculateCompositeScore', () => {
  it('returns baseline 1200 if no ratings are provided', () => {
    const score = calculateCompositeScore(undefined, undefined, undefined);
    expect(score).toBe(1200);
  });

  it('computes weighted score when all 3 platforms are provided', () => {
    // LC: 2000 (0.35) = 700, CF: 1800 (0.45) = 810, CC: 1900 (0.20) = 380 -> 1890
    const score = calculateCompositeScore(2000, 1800, 1900);
    expect(score).toBe(1890);
  });

  it('normalizes fairly when only single platform is connected', () => {
    // Only LC 2000 provided -> should equal 2000
    const score = calculateCompositeScore(2000, 0, 0);
    expect(score).toBe(2000);
  });
});

describe('Rating Service - getRatingTier', () => {
  it('assigns Grandmaster for rating >= 2100', () => {
    expect(getRatingTier(2400)).toBe('Grandmaster');
    expect(getRatingTier(2100)).toBe('Grandmaster');
  });

  it('assigns Master for rating >= 1900 and < 2100', () => {
    expect(getRatingTier(2050)).toBe('Master');
    expect(getRatingTier(1900)).toBe('Master');
  });

  it('assigns Expert for rating >= 1700 and < 1900', () => {
    expect(getRatingTier(1850)).toBe('Expert');
    expect(getRatingTier(1700)).toBe('Expert');
  });

  it('assigns Specialist for rating >= 1500 and < 1700', () => {
    expect(getRatingTier(1600)).toBe('Specialist');
    expect(getRatingTier(1500)).toBe('Specialist');
  });

  it('assigns Apprentice for rating >= 1300 and < 1500', () => {
    expect(getRatingTier(1400)).toBe('Apprentice');
    expect(getRatingTier(1300)).toBe('Apprentice');
  });

  it('assigns Novice for rating < 1300', () => {
    expect(getRatingTier(1200)).toBe('Novice');
    expect(getRatingTier(800)).toBe('Novice');
  });
});
