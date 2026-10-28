import { z } from 'zod';

export const problemSlugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Problem slug is required'),
});

export const runProblemCodeSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  language: z.enum(['javascript', 'typescript', 'python', 'cpp', 'java']),
  testCases: z
    .array(
      z.object({
        input: z.any(),
        expected: z.any(),
      })
    )
    .optional(),
});

export const submitProblemCodeSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  language: z.enum(['javascript', 'typescript', 'python', 'cpp', 'java']),
  username: z.string().trim().min(1).optional(),
});

