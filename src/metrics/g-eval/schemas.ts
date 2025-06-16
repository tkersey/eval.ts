import { z } from 'zod';

/**
 * Schema for evaluation steps generation response
 */
export const EvaluationStepsSchema = z.object({
  steps: z.array(z.string()).min(3).max(4),
});

export type EvaluationStepsResponse = z.infer<typeof EvaluationStepsSchema>;

/**
 * Schema for evaluation result
 */
export const EvaluationResultSchema = z.object({
  score: z.number(),
  reason: z.string(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;