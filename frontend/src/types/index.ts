export interface UserProfile {
  id: string;
  userId: string;
  leetcodeUsername?: string | null;
  leetcodeRating: number;
  leetcodeSolved: number;
  leetcodeEasy: number;
  leetcodeMedium: number;
  leetcodeHard: number;
  codeforcesHandle?: string | null;
  codeforcesRating: number;
  codeforcesRank?: string | null;
  codeforcesMaxRating: number;
  codechefHandle?: string | null;
  codechefRating: number;
  codechefStars?: string | null;
  compositeScore: number;
  lastSyncedAt?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  arenaRating: number;
  ratingTier: string;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile | null;
  submissions?: Submission[];
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  starterCode: string;
  testCases: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  acceptanceRate: number;
  createdAt: string;
  _count?: {
    submissions: number;
  };
}

export interface Match {
  id: string;
  code: string;
  player1Id: string;
  player1: User;
  player2Id?: string | null;
  player2?: User | null;
  problemId: string;
  problem: Problem;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'DRAW';
  winnerId?: string | null;
  player1Score: number;
  player2Score: number;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds: number;
  createdAt: string;
  submissions?: Submission[];
  _count?: {
    submissions: number;
  };
}

export interface Submission {
  id: string;
  matchId?: string | null;
  userId: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  problemId: string;
  problem?: Problem;
  language: string;
  code: string;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  submittedAt: string;
}

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
