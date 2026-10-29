import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useProblems(filters?: { difficulty?: string; category?: string; search?: string }) {
  return useQuery({
    queryKey: ['problems', filters],
    queryFn: async () => {
      const res = await api.getProblems(filters);
      return res.data;
    },
  });
}

export function useProblem(slug?: string) {
  return useQuery({
    queryKey: ['problem', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Problem slug is required');
      const res = await api.getProblem(slug);
      return res.data;
    },
    enabled: Boolean(slug),
  });
}

export function useMatches(status?: string) {
  return useQuery({
    queryKey: ['matches', status],
    queryFn: async () => {
      const res = await api.getMatches(status);
      return res.data;
    },
    refetchInterval: 5000, // Background poll as fallback
  });
}

export function useMatch(code?: string) {
  return useQuery({
    queryKey: ['match', code],
    queryFn: async () => {
      if (!code) throw new Error('Match code is required');
      const res = await api.getMatch(code);
      return res.data;
    },
    enabled: Boolean(code),
    refetchInterval: 4000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.getUsers();
      return res.data;
    },
  });
}

export function useUserProfile(username?: string) {
  return useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      const res = await api.getUser(username);
      return res.data;
    },
    enabled: Boolean(username),
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await api.getMe();
        return res.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useCreateMatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { problemId?: string; player1Username: string; durationSeconds?: number }) =>
      api.createMatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useJoinMatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, username }: { code: string; username: string }) => api.joinMatch(code, username),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.code] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
