"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMetric = void 0;
/**
 * Abstract base class for all evaluation metrics
 */
class BaseMetric {
    constructor(model, config) {
        this.evaluationCost = 0;
        this.model = model;
        this.config = config;
    }
    /**
     * Check if the evaluation was successful based on the score and threshold
     */
    isSuccessful(score) {
        return score >= this.config.threshold;
    }
    /**
     * Get the total cost of evaluation
     */
    getEvaluationCost() {
        return this.evaluationCost;
    }
    /**
     * Reset the evaluation cost
     */
    resetCost() {
        this.evaluationCost = 0;
    }
}
exports.BaseMetric = BaseMetric;
//# sourceMappingURL=base-metric.js.map