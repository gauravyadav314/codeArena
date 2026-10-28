import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSubmission, type TestCase } from '../src/services/judge.service';

test('Judge Service - evaluateSubmission JavaScript', async (t) => {
  const twoSumTestCases: TestCase[] = [
    { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
    { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
  ];

  await t.test('evaluates valid twoSum solution as ACCEPTED', async () => {
    const code = `
      function twoSum(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
          const diff = target - nums[i];
          if (map.has(diff)) return [map.get(diff), i];
          map.set(nums[i], i);
        }
        return [];
      }
    `;

    const verdict = await evaluateSubmission(code, twoSumTestCases, undefined, 'javascript');
    assert.equal(verdict.status, 'ACCEPTED');
    assert.equal(verdict.passedCount, 2);
    assert.equal(verdict.totalCount, 2);
    assert.equal(verdict.results.length, 2);
  });

  await t.test('evaluates incorrect solution as WRONG_ANSWER', async () => {
    const wrongCode = `
      function twoSum(nums, target) {
        return [0, 0];
      }
    `;

    const verdict = await evaluateSubmission(wrongCode, twoSumTestCases, undefined, 'javascript');
    assert.equal(verdict.status, 'WRONG_ANSWER');
    assert.equal(verdict.passedCount, 0);
  });

  await t.test('reports RUNTIME_ERROR when no valid function exists', async () => {
    const invalidCode = 'const x = 42;';
    const verdict = await evaluateSubmission(invalidCode, twoSumTestCases, undefined, 'javascript');
    assert.equal(verdict.status, 'RUNTIME_ERROR');
  });

  await t.test('detects TIME_LIMIT_EXCEEDED on infinite loop', async () => {
    const loopCode = `
      function twoSum(nums, target) {
        while(true) {}
        return [];
      }
    `;
    const verdict = await evaluateSubmission(loopCode, twoSumTestCases, undefined, 'javascript');
    assert.equal(verdict.status, 'TIME_LIMIT_EXCEEDED');
  });
});
