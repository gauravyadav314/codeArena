import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds fresh data
      gcTime: 1000 * 60 * 5, // 5 minutes cache garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // Prevents disrupting active code editor typing
    },
  },
});
