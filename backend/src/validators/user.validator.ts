import { z } from 'zod';

export const usernameParamSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
});

export const syncProfileSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  leetcodeUsername: z.string().trim().optional(),
  codeforcesHandle: z.string().trim().optional(),
  codechefHandle: z.string().trim().optional(),
  leetcodeRating: z.number().int().min(0).max(4000).optional(),
  leetcodeSolved: z.number().int().min(0).optional(),
  codeforcesRating: z.number().int().min(0).max(4000).optional(),
  codechefRating: z.number().int().min(0).max(4000).optional(),
});

