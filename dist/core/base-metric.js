"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMetric = void 0;
/**
 * Abstract base class for all evaluation metrics
 */
class BaseMetric {
    constructor(model, config) {
        this.model = model;
        this.config = config;
    }
    /**
     * Check if the evaluation was successful based on the score and threshold
     */
    isSuccessful(score) {
        return score >= this.config.threshold;
    }
}
exports.BaseMetric = BaseMetric;
//# sourceMappingURL=base-metric.js.map