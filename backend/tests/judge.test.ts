import { describe, it, expect } from 'vitest';
import { evaluateSubmission, type TestCase } from '../src/services/judge.service';

const twoSumTestCases: TestCase[] = [
  { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
  { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
];

describe('Judge Service - evaluateSubmission JavaScript', () => {
  it('evaluates valid twoSum solution as ACCEPTED', async () => {
    const code = `
      function twoSum(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
          const complement = target - nums[i];
          if (map.has(complement)) {
            return [map.get(complement), i];
          }
          map.set(nums[i], i);
        }
        return [];
      }
    `;

    const verdict = await evaluateSubmission(code, twoSumTestCases, undefined, 'javascript');
    expect(verdict.status).toBe('ACCEPTED');
    expect(verdict.passedCount).toBe(2);
    expect(verdict.totalCount).toBe(2);
    expect(verdict.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it('evaluates incorrect solution as WRONG_ANSWER', async () => {
    const wrongCode = `
      function twoSum(nums, target) {
        return [0, 0];
      }
    `;

    const verdict = await evaluateSubmission(wrongCode, twoSumTestCases, undefined, 'javascript');
    expect(verdict.status).toBe('WRONG_ANSWER');
    expect(verdict.passedCount).toBeLessThan(3);
  });

  it('reports RUNTIME_ERROR when no valid function exists', async () => {
    const invalidCode = `
      const notAFunction = 42;
    `;

    const verdict = await evaluateSubmission(invalidCode, twoSumTestCases, undefined, 'javascript');
    expect(verdict.status).toBe('RUNTIME_ERROR');
  });

  it('detects TIME_LIMIT_EXCEEDED on infinite loop', async () => {
    const loopCode = `
      function twoSum(nums, target) {
        while(true) {}
      }
    `;

    const verdict = await evaluateSubmission(loopCode, twoSumTestCases, undefined, 'javascript');
    expect(verdict.status).toBe('TIME_LIMIT_EXCEEDED');
  });

  it('blocks sandbox escape attempts (process / constructor) with security violation', async () => {
    const maliciousCode = `
      function twoSum(nums, target) {
        const p = this.constructor.constructor('return process')();
        return [0, 1];
      }
    `;

    const verdict = await evaluateSubmission(maliciousCode, twoSumTestCases, undefined, 'javascript');
    expect(verdict.status).toBe('RUNTIME_ERROR');
    expect(verdict.message).toContain('Security violation');
  });
});
