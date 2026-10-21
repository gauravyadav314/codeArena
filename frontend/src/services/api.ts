import type { User, Problem, Match, JudgeVerdict, Submission } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
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
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
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

  async runProblemCode(slug: string, code: string, language: string = 'javascript'): Promise<{ success: boolean; verdict: JudgeVerdict }> {
    return request(`/api/problems/${encodeURIComponent(slug)}/run`, {
      method: 'POST',
      body: JSON.stringify({ code, language }),
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
  }): Promise<{ success: boolean; message: string; data: Match }> {
    return request('/api/matches/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async joinMatch(code: string, username: string): Promise<{ success: boolean; message: string; data: Match }> {
    return request(`/api/matches/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  async submitMatchCode(
    code: string,
    payload: {
      username: string;
      codeContent: string;
      language?: string;
    }
  ): Promise<{
    success: boolean;
    verdict: JudgeVerdict;
    submission: Submission;
    match: Match;
  }> {
    return request(`/api/matches/${encodeURIComponent(code)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
