import { BaseMetric } from '../../core/base-metric';
import { LLMTestCase, MetricResult, GEvalConfig } from '../../core/types';
import { BaseLLM } from '../../models/base-llm';
/**
 * G-Eval metric implementation
 *
 * G-Eval is a flexible LLM-based evaluation metric that can evaluate
 * any combination of test case parameters based on custom criteria.
 */
export declare class GEval extends BaseMetric<GEvalConfig> {
    private evaluationSteps;
    constructor(model: BaseLLM, config: GEvalConfig);
    /**
     * Evaluate a test case using G-Eval
     */
    evaluate(testCase: LLMTestCase): Promise<MetricResult>;
    /**
     * Validate that test case has all required parameters
     */
    protected validateTestCase(testCase: LLMTestCase): void;
    /**
     * Generate evaluation steps using LLM
     */
    private generateEvaluationSteps;
    /**
     * Evaluate test case using generated steps
     */
    private evaluateTestCase;
    /**
     * Calculate final score, potentially using log probabilities
     */
    private calculateFinalScore;
    /**
     * Calculate weighted score from log probabilities
     */
    private calculateWeightedScore;
    /**
     * Get the name of this metric
     */
    getName(): string;
    /**
     * Get the evaluation steps (for inspection/debugging)
     */
    getEvaluationSteps(): string[] | null;
}
