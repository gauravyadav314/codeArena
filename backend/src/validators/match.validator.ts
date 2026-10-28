import { z } from 'zod';

export const matchCodeParamSchema = z.object({
  code: z.string().trim().min(5, 'Invalid match code format'),
});

export const createMatchSchema = z.object({
  problemId: z.string().trim().min(1, 'problemId is required'),
  player1Username: z.string().trim().min(3).optional(),
  durationSeconds: z.number().int().min(60).max(3600).optional().default(900),
});

export const joinMatchSchema = z.object({
  player2Username: z.string().trim().min(3).optional(),
});

export const submitMatchCodeSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  language: z.enum(['javascript', 'typescript', 'python', 'cpp', 'java']),
  username: z.string().trim().min(1).optional(),
});

export const drawMatchSchema = z.object({
  username: z.string().trim().min(1).optional(),
});

export const matchMessageSchema = z.object({
  senderUsername: z.string().trim().min(1, 'Sender username is required'),
  text: z.string().trim().min(1, 'Message text cannot be empty').max(500, 'Message cannot exceed 500 characters'),
});

