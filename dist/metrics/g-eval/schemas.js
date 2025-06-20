"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationResultSchema = exports.EvaluationStepsSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for evaluation steps generation response
 */
exports.EvaluationStepsSchema = zod_1.z.object({
    steps: zod_1.z.array(zod_1.z.string()).min(3).max(4),
});
/**
 * Schema for evaluation result
 */
exports.EvaluationResultSchema = zod_1.z.object({
    score: zod_1.z.number(),
    reason: zod_1.z.string(),
});
//# sourceMappingURL=schemas.js.map