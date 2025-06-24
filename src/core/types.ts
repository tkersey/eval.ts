/**
 * Core types for DeepEval TypeScript implementation
 */

/**
 * Represents a test case for LLM evaluation
 */
export interface LLMTestCase {
  input: string;
  actualOutput: string;
  expectedOutput?: string;
  context?: string[];
  retrievalContext?: string[];
  toolsCalled?: string[];
  metadata?: Record<string, unknown>;
  dataset?: string;
}

/**
 * Base result returned by all metrics
 */
export interface MetricResult {
  score: number;
  success: boolean;
  reason: string;
  error?: string;
}

/**
 * Configuration for metric evaluation
 */
export interface MetricConfig {
  threshold: number;
  strictMode?: boolean;
  verbose?: boolean;
}

/**
 * Evaluation parameters that can be used in G-Eval
 */
export type EvaluationParam = 
  | 'input'
  | 'actualOutput'
  | 'expectedOutput'
  | 'context'
  | 'retrievalContext'
  | 'toolsCalled';

/**
 * Rubric for scoring with descriptions
 */
export interface Rubric {
  score: number;
  description: string;
}

/**
 * Configuration specific to G-Eval metric
 */
export interface GEvalConfig extends MetricConfig {
  name: string;
  evaluationParams: EvaluationParam[];
  criteria?: string;
  evaluationSteps?: string[];
  rubric?: Rubric[];
  topLogprobs?: number;
}