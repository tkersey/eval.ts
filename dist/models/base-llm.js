"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLM = void 0;
/**
 * Abstract base class for LLM models
 */
class BaseLLM {
    constructor(modelName) {
        this.modelName = modelName;
    }
    /**
     * Get the model name
     */
    getModelName() {
        return this.modelName;
    }
}
exports.BaseLLM = BaseLLM;
//# sourceMappingURL=base-llm.js.map