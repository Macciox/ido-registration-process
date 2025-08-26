import { z } from 'zod';

export const Evidence = z.object({
  page: z.number().optional(),
  url: z.string().url().optional(),
  snippet: z.string().min(20),
});

export const Result = z.object({
  status: z.enum(['FOUND', 'NEEDS_CLARIFICATION', 'MISSING']),
  coverage_score: z.number().int().min(0).max(100),
  evidence: z.array(Evidence),
  reasoning: z.string().min(20),
});

export type EvidenceType = z.infer<typeof Evidence>;
export type ResultType = z.infer<typeof Result>;