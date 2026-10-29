import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../src/validators/auth.validator';
import { createMatchSchema, submitMatchCodeSchema } from '../src/validators/match.validator';
import { runProblemCodeSchema } from '../src/validators/problem.validator';
import { syncProfileSchema } from '../src/validators/user.validator';

describe('Zod Validators - Auth Schemas', () => {
  it('validates correct registration payload', () => {
    const valid = {
      username: 'grandmaster_dev',
      email: 'gm@codearena.dev',
      password: 'password123',
      name: 'Grandmaster Dev',
      bio: 'Competitive coding enthusiast',
    };
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects registration with invalid email', () => {
    const invalid = {
      username: 'dev_user',
      email: 'not-an-email',
      password: 'password123',
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects registration with short username', () => {
    const invalid = {
      username: 'ab',
      email: 'valid@example.com',
      password: 'password123',
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates correct login payload', () => {
    const valid = {
      identifier: 'grandmaster_dev',
      password: 'password123',
    };
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects login with empty identifier', () => {
    const invalid = {
      identifier: '',
      password: 'password123',
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Zod Validators - Match & Problem Schemas', () => {
  it('validates create match with default duration', () => {
    const payload = {
      problemId: 'prob-two-sum-uuid',
      player1Username: 'tourist',
    };
    const result = createMatchSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationSeconds).toBe(900);
    }
  });

  it('rejects submit with unsupported language', () => {
    const payload = {
      code: 'print("hello")',
      language: 'ruby',
    };
    const result = submitMatchCodeSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('validates run code with valid language and testcases', () => {
    const payload = {
      code: 'function twoSum(nums, target) { return [0, 1]; }',
      language: 'javascript',
      testCases: [{ input: [[2, 7], 9], expected: [0, 1] }],
    };
    const result = runProblemCodeSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates sync profile with rating boundaries', () => {
    const valid = {
      username: 'tourist',
      leetcodeRating: 2850,
      codeforcesRating: 3400,
      codechefRating: 2900,
    };
    const result = syncProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

