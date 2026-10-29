import type { User, Problem, Match, JudgeVerdict, Submission } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    credentials: 'include', // Support httpOnly cookie sessions
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} (${response.statusText})`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      } else if (errJson.message) {
        errorMsg = errJson.message;
      }
    } catch {
      // ignore JSON parse failures
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Authentication
  async register(payload: {
    username: string;
    email: string;
    password?: string;
    name?: string;
    bio?: string;
  }): Promise<{ success: boolean; data: { user: User; accessToken: string } }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    identifier: string;
    password?: string;
  }): Promise<{ success: boolean; data: { user: User; accessToken: string } }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ success: boolean; data: User }> {
    return request('/api/auth/me');
  },

  // Users & Leaderboard
  async getUsers(): Promise<{ success: boolean; count: number; data: User[] }> {
    return request('/api/users');
  },

  async getUser(username: string): Promise<{ success: boolean; data: User }> {
    return request(`/api/users/${encodeURIComponent(username)}`);
  },

  async syncProfile(payload: {
    username: string;
    leetcodeUsername?: string;
    codeforcesHandle?: string;
    codechefHandle?: string;
    leetcodeRating?: number;
    leetcodeSolved?: number;
    codeforcesRating?: number;
    codechefRating?: number;
  }): Promise<{ success: boolean; message: string; data: User }> {
    return request('/api/users/sync-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerUser(payload: {
    username: string;
    email: string;
    name?: string;
    bio?: string;
  }): Promise<{ success: boolean; message: string; data: User }> {
    return request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Problems
  async getProblems(params?: {
    difficulty?: string;
    category?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: Problem[] }> {
    const query = new URLSearchParams();
    if (params?.difficulty && params.difficulty !== 'All') query.set('difficulty', params.difficulty);
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request(`/api/problems${qs ? `?${qs}` : ''}`);
  },

  async getProblem(slug: string): Promise<{ success: boolean; data: Problem & { submissions: Submission[] } }> {
    return request(`/api/problems/${encodeURIComponent(slug)}`);
  },

  async runProblemCode(slug: string, code: string, language: string = 'javascript'): Promise<{ success: boolean; data: JudgeVerdict }> {
    return request(`/api/problems/${encodeURIComponent(slug)}/run`, {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  },

  async submitProblemCode(
    slug: string,
    payload: { code: string; username: string; language?: string }
  ): Promise<{ success: boolean; message: string; data: { verdict: JudgeVerdict; submission: Submission } }> {
    return request(`/api/problems/${encodeURIComponent(slug)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Matches (1v1 Arena)
  async getMatches(status?: string): Promise<{ success: boolean; count: number; data: Match[] }> {
    const qs = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/matches${qs}`);
  },

  async getMatch(code: string): Promise<{ success: boolean; data: Match }> {
    return request(`/api/matches/${encodeURIComponent(code)}`);
  },

  async createMatch(payload: {
    problemId?: string;
    player1Username: string;
    durationSeconds?: number;
  }): Promise<{ success: boolean; data: Match }> {
    return request('/api/matches/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async joinMatch(code: string, username: string): Promise<{ success: boolean; data: Match }> {
    return request(`/api/matches/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify({ player2Username: username, username }),
    });
  },

  async submitMatchCode(
    code: string,
    payload: {
      username: string;
      codeContent?: string;
      code?: string;
      language?: string;
    }
  ): Promise<{
    success: boolean;
    data: {
      jobId: string;
      submissionId: string;
      status: string;
      verdict?: JudgeVerdict;
    };
  }> {
    const finalCode = payload.codeContent || payload.code || '';
    return request(`/api/matches/${encodeURIComponent(code)}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        code: finalCode,
        language: payload.language || 'javascript',
      }),
    });
  },

  async getSubmissionStatus(jobId: string): Promise<{ success: boolean; data: any }> {
    return request(`/api/matches/submissions/status/${encodeURIComponent(jobId)}`);
  },

  async drawMatch(code: string, username?: string): Promise<{ success: boolean; message: string; data: Match }> {
    return request(`/api/matches/${encodeURIComponent(code)}/draw`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async getMatchMessages(code: string): Promise<{
    success: boolean;
    data: Array<{ id: string; senderUsername?: string; username?: string; text: string; createdAt?: string; timestamp?: string }>;
  }> {
    return request(`/api/matches/${encodeURIComponent(code)}/messages`);
  },

  async sendMatchMessage(
    code: string,
    payload: { senderUsername: string; text: string }
  ): Promise<{
    success: boolean;
    data: { id: string; senderUsername: string; text: string; createdAt: string };
  }> {
    return request(`/api/matches/${encodeURIComponent(code)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Matchmaking Queue
  async joinMatchmakingQueue(): Promise<{ success: boolean; data: any }> {
    return request('/api/matches/queue/join', {
      method: 'POST',
    });
  },

  async leaveMatchmakingQueue(): Promise<{ success: boolean; message: string }> {
    return request('/api/matches/queue/leave', {
      method: 'POST',
    });
  },

  async getMatchmakingQueueStatus(): Promise<{ success: boolean; data: any }> {
    return request('/api/matches/queue/status');
  },
};
