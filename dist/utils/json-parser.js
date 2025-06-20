"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractJson = extractJson;
exports.safeJsonParse = safeJsonParse;
/**
 * Extract JSON from a string that may contain additional text
 */
function extractJson(text) {
    // Try to parse as-is first
    try {
        return JSON.parse(text);
    }
    catch (_a) {
        // Continue to extraction
    }
    // Try to find JSON object {...}
    const objectMatch = text.match(/\{[^{}]*\}/);
    if (objectMatch) {
        try {
            return JSON.parse(objectMatch[0]);
        }
        catch (_b) {
            // Continue to next attempt
        }
    }
    // Try to find JSON object with nested objects
    const nestedObjectMatch = text.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
    if (nestedObjectMatch) {
        try {
            return JSON.parse(nestedObjectMatch[0]);
        }
        catch (_c) {
            // Continue to next attempt
        }
    }
    // Try to find JSON array [...]
    const arrayMatch = text.match(/\[[^\[\]]*\]/);
    if (arrayMatch) {
        try {
            return JSON.parse(arrayMatch[0]);
        }
        catch (_d) {
            // Continue to next attempt
        }
    }
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1]);
        }
        catch (_e) {
            // Continue to next attempt
        }
    }
    // If all else fails, throw error
    throw new Error('Failed to extract valid JSON from text');
}
/**
 * Safely parse JSON with a fallback value
 */
function safeJsonParse(text, fallback) {
    try {
        return extractJson(text);
    }
    catch (_a) {
        return fallback;
    }
}
//# sourceMappingURL=json-parser.js.map