import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing records...');
  await prisma.submission.deleteMany();
  await prisma.match.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  console.log('[Seed] Seeding Users and Profiles...');
  const gaurav = await prisma.user.create({
    data: {
      username: 'gauravyadav',
      email: 'gaurav@codearena.dev',
      name: 'Gaurav Yadav',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Full-Stack Architect & Competitive Programmer. Passionate about real-time distributed systems and algorithms.',
      arenaRating: 2185,
      ratingTier: 'Grandmaster',
      wins: 48,
      losses: 9,
      draws: 2,
      streak: 8,
      profile: {
        create: {
          leetcodeUsername: 'gaurav_algo',
          leetcodeRating: 2240,
          leetcodeSolved: 742,
          leetcodeEasy: 280,
          leetcodeMedium: 372,
          leetcodeHard: 90,
          codeforcesHandle: 'gaurav_cf',
          codeforcesRating: 1980,
          codeforcesRank: 'Candidate Master',
          codeforcesMaxRating: 2045,
          codechefHandle: 'gaurav_cc',
          codechefRating: 2120,
          codechefStars: '5★',
          compositeScore: 2145,
          lastSyncedAt: new Date(),
        },
      },
    },
  });

  const sophia = await prisma.user.create({
    data: {
      username: 'sophia_code',
      email: 'sophia@codearena.dev',
      name: 'Sophia Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Algorithms enthusiast, ICPC Regionalist, and Python optimization geek.',
      arenaRating: 1980,
      ratingTier: 'Master',
      wins: 34,
      losses: 12,
      draws: 4,
      streak: 3,
      profile: {
        create: {
          leetcodeUsername: 'sophiac',
          leetcodeRating: 2090,
          leetcodeSolved: 580,
          leetcodeEasy: 210,
          leetcodeMedium: 290,
          leetcodeHard: 80,
          codeforcesHandle: 'sophia_icpc',
          codeforcesRating: 1840,
          codeforcesRank: 'Expert',
          codeforcesMaxRating: 1890,
          codechefHandle: 'sophia_cc',
          codechefRating: 1950,
          codechefStars: '4★',
          compositeScore: 1960,
          lastSyncedAt: new Date(),
        },
      },
    },
  });

  const alex = await prisma.user.create({
    data: {
      username: 'alex_turner',
      email: 'alex@codearena.dev',
      name: 'Alex Turner',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Systems engineer specializing in Rust and C++. Speed-coding challenger.',
      arenaRating: 1720,
      ratingTier: 'Specialist',
      wins: 21,
      losses: 15,
      draws: 1,
      streak: 1,
      profile: {
        create: {
          leetcodeUsername: 'alexturner',
          leetcodeRating: 1850,
          leetcodeSolved: 420,
          leetcodeEasy: 180,
          leetcodeMedium: 200,
          leetcodeHard: 40,
          codeforcesHandle: 'alex_t',
          codeforcesRating: 1620,
          codeforcesRank: 'Specialist',
          codeforcesMaxRating: 1680,
          codechefHandle: 'alex_chef',
          codechefRating: 1710,
          codechefStars: '3★',
          compositeScore: 1730,
          lastSyncedAt: new Date(),
        },
      },
    },
  });

  console.log('[Seed] Seeding Problems...');
  const p1 = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      category: 'Arrays & Hashing',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

### Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
      starterCode: `function twoSum(nums, target) {
  // Write your solution here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      testCases: JSON.stringify([
        { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
        { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
        { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
      ]),
      timeLimitMs: 1500,
      memoryLimitMb: 256,
      acceptanceRate: 53.4,
    },
  });

  const p2 = await prisma.problem.create({
    data: {
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      difficulty: 'Easy',
      category: 'Stack',
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example:
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\``,
      starterCode: `function isValid(s) {
  // Write your solution here
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`,
      testCases: JSON.stringify([
        { input: { s: '()' }, expected: true },
        { input: { s: '()[]{}' }, expected: true },
        { input: { s: '(]' }, expected: false },
        { input: { s: '([)]' }, expected: false },
      ]),
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      acceptanceRate: 41.2,
    },
  });

  const p3 = await prisma.problem.create({
    data: {
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'Medium',
      category: 'Sliding Window',
      description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

### Example:
\`\`\`
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
\`\`\``,
      starterCode: `function lengthOfLongestSubstring(s) {
  // Write your solution here
  let maxLen = 0;
  let start = 0;
  const seen = new Map();
  for (let end = 0; end < s.length; end++) {
    const char = s[end];
    if (seen.has(char) && seen.get(char) >= start) {
      start = seen.get(char) + 1;
    }
    seen.set(char, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}`,
      testCases: JSON.stringify([
        { input: { s: 'abcabcbb' }, expected: 3 },
        { input: { s: 'bbbbb' }, expected: 1 },
        { input: { s: 'pwwkew' }, expected: 3 },
      ]),
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      acceptanceRate: 35.8,
    },
  });

  const p4 = await prisma.problem.create({
    data: {
      title: 'Container With Most Water',
      slug: 'container-with-most-water',
      difficulty: 'Medium',
      category: 'Two Pointers',
      description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.

### Example:
\`\`\`
Input: height = [1,8,6,2,5,4,8,3,7]
Output: 49
\`\`\``,
      starterCode: `function maxArea(height) {
  // Write your solution here
  let left = 0, right = height.length - 1;
  let max = 0;
  while (left < right) {
    const h = Math.min(height[left], height[right]);
    max = Math.max(max, h * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return max;
}`,
      testCases: JSON.stringify([
        { input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] }, expected: 49 },
        { input: { height: [1, 1] }, expected: 1 },
      ]),
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      acceptanceRate: 54.9,
    },
  });

  const p5 = await prisma.problem.create({
    data: {
      title: 'Climbing Stairs',
      slug: 'climbing-stairs',
      difficulty: 'Easy',
      category: 'Dynamic Programming',
      description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

### Example 1:
\`\`\`
Input: n = 2
Output: 2
Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps
\`\`\`

### Example 2:
\`\`\`
Input: n = 3
Output: 3
Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step
\`\`\`

### Constraints:
- 1 <= n <= 45`,
      starterCode: `function climbStairs(n) {
  // Write your solution here
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}`,
      testCases: JSON.stringify([
        { input: 2, expected: 2 },
        { input: 3, expected: 3 },
        { input: 5, expected: 8 },
        { input: 10, expected: 89 },
      ]),
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      acceptanceRate: 51.8,
    },
  });

  const p6 = await prisma.problem.create({
    data: {
      title: 'Best Time to Buy and Sell Stock',
      slug: 'best-time-to-buy-and-sell-stock',
      difficulty: 'Easy',
      category: 'Arrays & Hashing',
      description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i-th\` day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.

### Example:
\`\`\`
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.
\`\`\`

### Constraints:
- 1 <= prices.length <= 10^5
- 0 <= prices[i] <= 10^4`,
      starterCode: `function maxProfit(prices) {
  // Write your solution here
  let minPrice = Infinity;
  let maxProfit = 0;
  for (const price of prices) {
    if (price < minPrice) {
      minPrice = price;
    } else if (price - minPrice > maxProfit) {
      maxProfit = price - minPrice;
    }
  }
  return maxProfit;
}`,
      testCases: JSON.stringify([
        { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 5 },
        { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 },
        { input: { prices: [1, 2] }, expected: 1 },
      ]),
      timeLimitMs: 1500,
      memoryLimitMb: 256,
      acceptanceRate: 54.2,
    },
  });

  const p7 = await prisma.problem.create({
    data: {
      title: 'Maximum Subarray',
      slug: 'maximum-subarray',
      difficulty: 'Medium',
      category: 'Dynamic Programming',
      description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

### Example:
\`\`\`
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.
\`\`\`

### Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
      starterCode: `function maxSubArray(nums) {
  // Write your solution here (Kadane's algorithm)
  let maxSum = nums[0];
  let currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
      testCases: JSON.stringify([
        { input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expected: 6 },
        { input: { nums: [1] }, expected: 1 },
        { input: { nums: [5, 4, -1, 7, 8] }, expected: 23 },
      ]),
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      acceptanceRate: 50.1,
    },
  });

  const p8 = await prisma.problem.create({
    data: {
      title: 'Reverse Linked List',
      slug: 'reverse-linked-list',
      difficulty: 'Easy',
      category: 'Linked List',
      description: `Given the head of a singly linked list, reverse the list, and return the reversed list.

For this problem, the input is an array representing the linked list values. Return the array in reversed order.

### Example:
\`\`\`
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]
\`\`\`

### Constraints:
- The number of nodes in the list is the range [0, 5000]
- -5000 <= Node.val <= 5000`,
      starterCode: `function reverseList(head) {
  // head is an array; return the reversed array
  return head.slice().reverse();
}`,
      testCases: JSON.stringify([
        { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
        { input: { head: [1, 2] }, expected: [2, 1] },
        { input: { head: [] }, expected: [] },
      ]),
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      acceptanceRate: 72.8,
    },
  });

  console.log('[Seed] Seeding Sample Arena Match...');
  const match = await prisma.match.create({
    data: {
      code: 'ARENA-742',
      player1Id: gaurav.id,
      player2Id: sophia.id,
      problemId: p1.id,
      status: 'COMPLETED',
      winnerId: gaurav.id,
      player1Score: 100,
      player2Score: 85,
      startedAt: new Date(Date.now() - 1000 * 60 * 20),
      endedAt: new Date(Date.now() - 1000 * 60 * 5),
      durationSeconds: 900,
    },
  });

  await prisma.submission.create({
    data: {
      matchId: match.id,
      userId: gaurav.id,
      problemId: p1.id,
      language: 'javascript',
      code: p1.starterCode,
      status: 'ACCEPTED',
      passedCount: 3,
      totalCount: 3,
      runtimeMs: 42,
    },
  });

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
