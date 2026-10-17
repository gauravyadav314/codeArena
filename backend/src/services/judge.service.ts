import vm from 'vm';

export interface TestCase {
  input: any;
  expected: any;
}

export interface TestResult {
  testIndex: number;
  passed: boolean;
  input: any;
  expected: any;
  actual?: any;
  error?: string;
  runtimeMs: number;
}

export interface JudgeVerdict {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  results: TestResult[];
  message: string;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-6;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function evaluateSubmission(
  code: string,
  testCases: TestCase[],
  functionName?: string
): JudgeVerdict {
  const totalCount = testCases.length;
  if (totalCount === 0) {
    return {
      status: 'ACCEPTED',
      passedCount: 0,
      totalCount: 0,
      runtimeMs: 1,
      results: [],
      message: 'No test cases specified.',
    };
  }

  // Attempt to detect function name if not supplied
  let fnName = functionName;
  if (!fnName) {
    const fnMatch = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
    const constMatch = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
    fnName = fnMatch?.[1] || constMatch?.[1];
  }

  if (!fnName) {
    return {
      status: 'RUNTIME_ERROR',
      passedCount: 0,
      totalCount,
      runtimeMs: 0,
      results: [],
      message: 'Could not find a valid function declaration in submitted code.',
    };
  }

  const results: TestResult[] = [];
  let allPassed = true;
  let totalRuntime = 0;
  let verdictStatus: JudgeVerdict['status'] = 'ACCEPTED';

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const startTime = performance.now();

    try {
      const sandbox = {
        console: { log: () => {}, error: () => {} },
        Math,
        Array,
        Object,
        Map,
        Set,
        String,
        Number,
        Boolean,
        JSON,
      };

      const context = vm.createContext(sandbox);

      // Execute submitted code
      vm.runInContext(code, context, { timeout: 1500 });

      // Build argument call
      const input = tc.input;
      let argsToPass: any[];
      if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
        argsToPass = Object.values(input);
      } else if (Array.isArray(input)) {
        argsToPass = [input];
      } else {
        argsToPass = [input];
      }

      (context as any).__test_args = argsToPass;
      const runnerCode = `(${fnName})(...__test_args);`;
      const actual = vm.runInContext(runnerCode, context, { timeout: 1500 });

      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      totalRuntime += elapsed;

      const passed = deepEqual(actual, tc.expected);
      if (!passed) {
        allPassed = false;
        if (verdictStatus === 'ACCEPTED') {
          verdictStatus = 'WRONG_ANSWER';
        }
      }

      results.push({
        testIndex: i + 1,
        passed,
        input: tc.input,
        expected: tc.expected,
        actual,
        runtimeMs: elapsed,
      });
    } catch (err: any) {
      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      totalRuntime += elapsed;
      allPassed = false;

      const isTimeout = err?.message?.includes('timed out');
      verdictStatus = isTimeout ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR';

      results.push({
        testIndex: i + 1,
        passed: false,
        input: tc.input,
        expected: tc.expected,
        error: err?.message || 'Execution error',
        runtimeMs: elapsed,
      });
      break;
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const avgRuntime = Math.round(totalRuntime / Math.max(results.length, 1));

  let message = 'All test cases passed!';
  if (verdictStatus === 'WRONG_ANSWER') {
    message = `Failed on test case ${results.findIndex((r) => !r.passed) + 1} of ${totalCount}.`;
  } else if (verdictStatus === 'TIME_LIMIT_EXCEEDED') {
    message = 'Time Limit Exceeded (>1500ms). Check your algorithmic complexity.';
  } else if (verdictStatus === 'RUNTIME_ERROR') {
    message = `Runtime Error: ${results[results.length - 1]?.error || 'Unknown error'}`;
  }

  return {
    status: verdictStatus,
    passedCount,
    totalCount,
    runtimeMs: avgRuntime,
    results,
    message,
  };
}
