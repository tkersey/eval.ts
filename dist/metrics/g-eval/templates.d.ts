import { EvaluationParam, Rubric } from '../../core/types';
/**
 * Template for generating evaluation steps
 */
export declare function generateEvaluationStepsPrompt(evaluationParams: EvaluationParam[], criteria?: string): string;
/**
 * Template for evaluating a test case
 */
export declare function generateEvaluationPrompt(evaluationSteps: string[], testCaseContent: Record<string, string>, strictMode: boolean, rubric?: Rubric[]): string;
/**
 * Extract test case content based on evaluation parameters
 */
export declare function extractTestCaseContent(testCase: any, evaluationParams: EvaluationParam[]): Record<string, string>;
