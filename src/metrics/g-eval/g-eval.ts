import { BaseMetric } from '../../core/base-metric';
import { LLMTestCase, MetricResult, GEvalConfig, EvaluationParam } from '../../core/types';
import { BaseLLM } from '../../models/base-llm';
import { 
  generateEvaluationStepsPrompt, 
  generateEvaluationPrompt,
  extractTestCaseContent 
} from './templates';
import { 
  EvaluationStepsSchema, 
  EvaluationResultSchema,
  EvaluationResult 
} from './schemas';

/**
 * G-Eval metric implementation
 * 
 * G-Eval is a flexible LLM-based evaluation metric that can evaluate
 * any combination of test case parameters based on custom criteria.
 */
export class GEval extends BaseMetric<GEvalConfig> {
  private evaluationSteps: string[] | null = null;

  constructor(model: BaseLLM, config: GEvalConfig) {
    super(model, config);
    
    // Validate configuration
    if (config.evaluationParams.length === 0) {
      throw new Error('At least one evaluation parameter must be specified');
    }
    
    if (config.strictMode && config.rubric) {
      throw new Error('Rubric is not supported in strict mode');
    }
    
    // Set evaluation steps if provided
    if (config.evaluationSteps) {
      this.evaluationSteps = config.evaluationSteps;
    }
  }

  /**
   * Evaluate a test case using G-Eval
   */
  async evaluate(testCase: LLMTestCase): Promise<MetricResult> {
    try {
      // Validate test case has required parameters
      this.validateTestCase(testCase);

      // Generate evaluation steps if not provided
      if (!this.evaluationSteps) {
        this.evaluationSteps = await this.generateEvaluationSteps();
      }

      // Extract relevant content from test case
      const testCaseContent = extractTestCaseContent(
        testCase,
        this.config.evaluationParams
      );

      // Evaluate the test case
      const result = await this.evaluateTestCase(
        this.evaluationSteps,
        testCaseContent
      );

      // Calculate score based on log probabilities if available
      const finalScore = await this.calculateFinalScore(result);

      // Check if evaluation was successful
      const success = this.isSuccessful(finalScore);

      return {
        score: finalScore,
        success,
        reason: result.reason,
        evaluationCost: this.evaluationCost,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        score: 0,
        success: false,
        reason: `Evaluation failed: ${errorMessage}`,
        error: errorMessage,
        evaluationCost: this.evaluationCost,
      };
    }
  }

  /**
   * Validate that test case has all required parameters
   */
  protected validateTestCase(testCase: LLMTestCase): void {
    const missingParams: EvaluationParam[] = [];

    for (const param of this.config.evaluationParams) {
      if (!(param in testCase) || testCase[param as keyof LLMTestCase] === undefined) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      throw new Error(
        `Test case is missing required parameters: ${missingParams.join(', ')}`
      );
    }
  }

  /**
   * Generate evaluation steps using LLM
   */
  private async generateEvaluationSteps(): Promise<string[]> {
    const prompt = generateEvaluationStepsPrompt(
      this.config.evaluationParams,
      this.config.criteria
    );

    const response = await this.model.generateStructured(
      prompt,
      EvaluationStepsSchema
    );

    // Update cost if model provides usage
    const rawResponse = await this.model.generateRaw(prompt);
    if (rawResponse.usage) {
      this.evaluationCost += this.model.calculateCost(rawResponse.usage);
    }

    return response.steps;
  }

  /**
   * Evaluate test case using generated steps
   */
  private async evaluateTestCase(
    evaluationSteps: string[],
    testCaseContent: Record<string, string>
  ): Promise<EvaluationResult> {
    const prompt = generateEvaluationPrompt(
      evaluationSteps,
      testCaseContent,
      this.config.strictMode || false,
      this.config.rubric
    );

    const response = await this.model.generateStructured(
      prompt,
      EvaluationResultSchema
    );

    // Update cost if model provides usage
    const rawResponse = await this.model.generateRaw(prompt);
    if (rawResponse.usage) {
      this.evaluationCost += this.model.calculateCost(rawResponse.usage);
    }

    return response;
  }

  /**
   * Calculate final score, potentially using log probabilities
   */
  private async calculateFinalScore(result: EvaluationResult): Promise<number> {
    // If no log probabilities requested or in strict mode, return score as-is
    if (!this.config.topLogprobs || this.config.strictMode) {
      return result.score;
    }

    // Generate evaluation again to get log probabilities
    const testCaseContent = extractTestCaseContent(
      {} as LLMTestCase, // We don't need the actual test case here
      this.config.evaluationParams
    );

    const prompt = generateEvaluationPrompt(
      this.evaluationSteps!,
      testCaseContent,
      false,
      this.config.rubric
    );

    const rawResponse = await this.model.generateRaw(prompt, {
      topLogprobs: this.config.topLogprobs,
    });

    if (rawResponse.usage) {
      this.evaluationCost += this.model.calculateCost(rawResponse.usage);
    }

    // If we have log probabilities, calculate weighted score
    if (rawResponse.logprobs) {
      return this.calculateWeightedScore(rawResponse.logprobs);
    }

    // Otherwise return original score
    return result.score;
  }

  /**
   * Calculate weighted score from log probabilities
   */
  private calculateWeightedScore(
    logprobs: Array<{ token: string; logprob: number; topLogprobs?: Array<{ token: string; logprob: number }> }>
  ): number {
    // Find score tokens (digits 0-10)
    const scoreTokens = logprobs.filter(lp => {
      const token = lp.token.trim();
      return /^\d+$/.test(token) && parseInt(token) >= 0 && parseInt(token) <= 10;
    });

    if (scoreTokens.length === 0) {
      // No score tokens found, return middle score
      return 5;
    }

    // Calculate weighted average based on log probabilities
    let weightedSum = 0;
    let totalWeight = 0;

    for (const scoreToken of scoreTokens) {
      const score = parseInt(scoreToken.token.trim());
      const weight = Math.exp(scoreToken.logprob); // Convert log prob to probability
      
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 5;
  }

  /**
   * Get the name of this metric
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get the evaluation steps (for inspection/debugging)
   */
  getEvaluationSteps(): string[] | null {
    return this.evaluationSteps;
  }
}