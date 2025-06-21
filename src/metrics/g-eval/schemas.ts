/**
 * Schema for evaluation steps generation response
 */
export interface EvaluationStepsResponse {
  steps: string[];
}

/**
 * Schema for evaluation result
 */
export interface EvaluationResult {
  score: number;
  reason: string;
}