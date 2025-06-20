"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEval = void 0;
const base_metric_1 = require("../../core/base-metric");
const templates_1 = require("./templates");
const schemas_1 = require("./schemas");
/**
 * G-Eval metric implementation
 *
 * G-Eval is a flexible LLM-based evaluation metric that can evaluate
 * any combination of test case parameters based on custom criteria.
 */
class GEval extends base_metric_1.BaseMetric {
    constructor(model, config) {
        super(model, config);
        this.evaluationSteps = null;
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
    evaluate(testCase) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate test case has required parameters
                this.validateTestCase(testCase);
                // Generate evaluation steps if not provided
                if (!this.evaluationSteps) {
                    this.evaluationSteps = yield this.generateEvaluationSteps();
                }
                // Extract relevant content from test case
                const testCaseContent = (0, templates_1.extractTestCaseContent)(testCase, this.config.evaluationParams);
                // Evaluate the test case
                const result = yield this.evaluateTestCase(this.evaluationSteps, testCaseContent);
                // Calculate score based on log probabilities if available
                const finalScore = yield this.calculateFinalScore(result);
                // Check if evaluation was successful
                const success = this.isSuccessful(finalScore);
                return {
                    score: finalScore,
                    success,
                    reason: result.reason,
                    evaluationCost: this.evaluationCost,
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    score: 0,
                    success: false,
                    reason: `Evaluation failed: ${errorMessage}`,
                    error: errorMessage,
                    evaluationCost: this.evaluationCost,
                };
            }
        });
    }
    /**
     * Validate that test case has all required parameters
     */
    validateTestCase(testCase) {
        const missingParams = [];
        for (const param of this.config.evaluationParams) {
            if (!(param in testCase) || testCase[param] === undefined) {
                missingParams.push(param);
            }
        }
        if (missingParams.length > 0) {
            throw new Error(`Test case is missing required parameters: ${missingParams.join(', ')}`);
        }
    }
    /**
     * Generate evaluation steps using LLM
     */
    generateEvaluationSteps() {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = (0, templates_1.generateEvaluationStepsPrompt)(this.config.evaluationParams, this.config.criteria);
            const response = yield this.model.generateStructured(prompt, schemas_1.EvaluationStepsSchema);
            // Update cost if model provides usage
            const rawResponse = yield this.model.generateRaw(prompt);
            if (rawResponse.usage) {
                this.evaluationCost += this.model.calculateCost(rawResponse.usage);
            }
            return response.steps;
        });
    }
    /**
     * Evaluate test case using generated steps
     */
    evaluateTestCase(evaluationSteps, testCaseContent) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = (0, templates_1.generateEvaluationPrompt)(evaluationSteps, testCaseContent, this.config.strictMode || false, this.config.rubric);
            const response = yield this.model.generateStructured(prompt, schemas_1.EvaluationResultSchema);
            // Update cost if model provides usage
            const rawResponse = yield this.model.generateRaw(prompt);
            if (rawResponse.usage) {
                this.evaluationCost += this.model.calculateCost(rawResponse.usage);
            }
            return response;
        });
    }
    /**
     * Calculate final score, potentially using log probabilities
     */
    calculateFinalScore(result) {
        return __awaiter(this, void 0, void 0, function* () {
            // If no log probabilities requested or in strict mode, return score as-is
            if (!this.config.topLogprobs || this.config.strictMode) {
                return result.score;
            }
            // Generate evaluation again to get log probabilities
            const testCaseContent = (0, templates_1.extractTestCaseContent)({}, // We don't need the actual test case here
            this.config.evaluationParams);
            const prompt = (0, templates_1.generateEvaluationPrompt)(this.evaluationSteps, testCaseContent, false, this.config.rubric);
            const rawResponse = yield this.model.generateRaw(prompt, {
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
        });
    }
    /**
     * Calculate weighted score from log probabilities
     */
    calculateWeightedScore(logprobs) {
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
    getName() {
        return this.config.name;
    }
    /**
     * Get the evaluation steps (for inspection/debugging)
     */
    getEvaluationSteps() {
        return this.evaluationSteps;
    }
}
exports.GEval = GEval;
//# sourceMappingURL=g-eval.js.map