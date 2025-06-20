import { z } from 'zod';
/**
 * Schema for evaluation steps generation response
 */
export declare const EvaluationStepsSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    steps: string[];
}, {
    steps: string[];
}>;
export type EvaluationStepsResponse = z.infer<typeof EvaluationStepsSchema>;
/**
 * Schema for evaluation result
 */
export declare const EvaluationResultSchema: z.ZodObject<{
    score: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    score: number;
    reason: string;
}, {
    score: number;
    reason: string;
}>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
