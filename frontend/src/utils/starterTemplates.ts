export interface LanguageOption {
  id: string;
  name: string;
  badge: string;
  extension: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'javascript', name: 'JavaScript (Node.js)', badge: 'JS', extension: 'js' },
  { id: 'typescript', name: 'TypeScript', badge: 'TS', extension: 'ts' },
  { id: 'python', name: 'Python 3', badge: 'PY', extension: 'py' },
  { id: 'cpp', name: 'C++ (GCC / Clang)', badge: 'C++', extension: 'cpp' },
  { id: 'java', name: 'Java (OpenJDK)', badge: 'JAVA', extension: 'java' },
];

export const PROBLEM_TEMPLATES: Record<string, Record<string, string>> = {
  'two-sum': {
    javascript: `function twoSum(nums, target) {
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
    typescript: `function twoSum(nums: number[], target: number): number[] {
  // Write your solution here
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
`,
    cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int diff = target - nums[i];
            if (map.count(diff)) {
                return {map[diff], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};`,
    java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                return new int[] { map.get(diff), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`,
  },

  'valid-parentheses': {
    javascript: `function isValid(s) {
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
    typescript: `function isValid(s: string): boolean {
  // Write your solution here
  const stack: string[] = [];
  const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`,
    python: `def isValid(s: str) -> bool:
    # Write your solution here
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack
`,
    cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your solution here
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char top = st.top();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) {
                    return false;
                }
                st.pop();
            }
        }
        return st.empty();
    }
};`,
    java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`,
  },

  'longest-substring-without-repeating-characters': {
    javascript: `function lengthOfLongestSubstring(s) {
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
    typescript: `function lengthOfLongestSubstring(s: string): number {
  // Write your solution here
  let maxLen = 0;
  let start = 0;
  const seen = new Map<string, number>();
  for (let end = 0; end < s.length; end++) {
    const char = s[end];
    if (seen.has(char) && (seen.get(char) ?? -1) >= start) {
      start = (seen.get(char) ?? 0) + 1;
    }
    seen.set(char, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}`,
    python: `def lengthOfLongestSubstring(s: str) -> int:
    # Write your solution here
    seen = {}
    max_len = 0
    start = 0
    for end, char in enumerate(s):
        if char in seen and seen[char] >= start:
            start = seen[char] + 1
        seen[char] = end
        max_len = max(max_len, end - start + 1)
    return max_len
`,
    cpp: `#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your solution here
        unordered_map<char, int> seen;
        int maxLen = 0;
        int start = 0;
        for (int end = 0; end < s.length(); end++) {
            char c = s[end];
            if (seen.count(c) && seen[c] >= start) {
                start = seen[c] + 1;
            }
            seen[c] = end;
            maxLen = max(maxLen, end - start + 1);
        }
        return maxLen;
    }
};`,
    java: `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        Map<Character, Integer> seen = new HashMap<>();
        int maxLen = 0;
        int start = 0;
        for (int end = 0; end < s.length(); end++) {
            char c = s.charAt(end);
            if (seen.containsKey(c) && seen.get(c) >= start) {
                start = seen.get(c) + 1;
            }
            seen.put(c, end);
            maxLen = Math.max(maxLen, end - start + 1);
        }
        return maxLen;
    }
}`,
  },

  'container-with-most-water': {
    javascript: `function maxArea(height) {
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
    typescript: `function maxArea(height: number[]): number {
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
    python: `def maxArea(height: list[int]) -> int:
    # Write your solution here
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        h = min(height[left], height[right])
        max_water = max(max_water, h * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water
`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        // Write your solution here
        int left = 0, right = height.size() - 1;
        int maxWater = 0;
        while (left < right) {
            int h = min(height[left], height[right]);
            maxWater = max(maxWater, h * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return maxWater;
    }
};`,
    java: `import java.util.*;

class Solution {
    public int maxArea(int[] height) {
        // Write your solution here
        int left = 0, right = height.length - 1;
        int maxWater = 0;
        while (left < right) {
            int h = Math.min(height[left], height[right]);
            maxWater = Math.max(maxWater, h * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return maxWater;
    }
}`,
  },
};

export function getStarterCode(slug: string, language: string, defaultStarterCode?: string): string {
  const problemMap = PROBLEM_TEMPLATES[slug];
  if (problemMap && problemMap[language]) {
    return problemMap[language];
  }

  // Fallbacks for custom problems
  if (language === 'cpp') {
    return `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    // Define your solution method here
};
`;
  }

  if (language === 'java') {
    return `import java.util.*;

class Solution {
    // Define your solution method here
}
`;
  }

  if (language === 'python') {
    return `# Write your Python 3 solution here
def solution(*args):
    pass
`;
  }

  if (language === 'typescript') {
    return defaultStarterCode || `function solution(...args: any[]): any {
  // Write your TypeScript solution here
}
`;
  }

  return defaultStarterCode || `function solution(...args) {
  // Write your solution here
}
`;
}
