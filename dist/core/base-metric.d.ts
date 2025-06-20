import { LLMTestCase, MetricResult, MetricConfig } from './types';
import { BaseLLM } from '../models/base-llm';
/**
 * Abstract base class for all evaluation metrics
 */
export declare abstract class BaseMetric<TConfig extends MetricConfig = MetricConfig> {
    protected config: TConfig;
    protected model: BaseLLM;
    protected evaluationCost: number;
    constructor(model: BaseLLM, config: TConfig);
    /**
     * Evaluate a test case and return the metric result
     */
    abstract evaluate(testCase: LLMTestCase): Promise<MetricResult>;
    /**
     * Validate that the test case has all required parameters
     */
    protected abstract validateTestCase(testCase: LLMTestCase): void;
    /**
     * Check if the evaluation was successful based on the score and threshold
     */
    protected isSuccessful(score: number): boolean;
    /**
     * Get the total cost of evaluation
     */
    getEvaluationCost(): number;
    /**
     * Reset the evaluation cost
     */
    resetCost(): void;
}
