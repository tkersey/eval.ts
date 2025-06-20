"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvaluationStepsPrompt = generateEvaluationStepsPrompt;
exports.generateEvaluationPrompt = generateEvaluationPrompt;
exports.extractTestCaseContent = extractTestCaseContent;
/**
 * Template for generating evaluation steps
 */
function generateEvaluationStepsPrompt(evaluationParams, criteria) {
    const paramsText = evaluationParams.join(', ');
    const criteriaText = criteria
        ? `\n\n**Criteria:**\n${criteria}`
        : '';
    return `Given the following evaluation parameters: ${paramsText}${criteriaText}

Generate 3-4 concise evaluation steps to evaluate these parameters.
The steps should clearly explain how to assess the quality and relationships between these parameters.

Output your response in the following JSON format:
{
  "steps": [
    "Step 1 description",
    "Step 2 description",
    "Step 3 description"
  ]
}`;
}
/**
 * Template for evaluating a test case
 */
function generateEvaluationPrompt(evaluationSteps, testCaseContent, strictMode, rubric) {
    // Format evaluation steps
    const stepsText = evaluationSteps
        .map((step, i) => `${i + 1}. ${step}`)
        .join('\n');
    // Format test case content
    const contentText = Object.entries(testCaseContent)
        .map(([key, value]) => `**${formatParamName(key)}:**\n${value}`)
        .join('\n\n');
    // Format rubric if provided
    let rubricText = '';
    if (rubric && rubric.length > 0) {
        rubricText = '\n\n**Scoring Rubric:**\n';
        rubricText += rubric
            .map((r) => `- Score ${r.score}: ${r.description}`)
            .join('\n');
    }
    // Format scoring instructions
    const scoringInstructions = strictMode
        ? 'Give a binary score of either 0 (fail) or 1 (pass).'
        : 'Provide a score from 0 to 10, where 0 is the worst and 10 is the best.';
    return `You will be given evaluation steps, inputs, and outputs to evaluate.

**Evaluation Steps:**
${stepsText}

**Test Case:**
${contentText}${rubricText}

Based on the evaluation steps and test case, evaluate the quality.
${scoringInstructions}

Provide your evaluation in the following JSON format:
{
  "score": <number>,
  "reason": "<detailed explanation of your evaluation>"
}`;
}
/**
 * Format parameter names for display
 */
function formatParamName(param) {
    // Convert camelCase to Title Case
    return param
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
/**
 * Extract test case content based on evaluation parameters
 */
function extractTestCaseContent(testCase, evaluationParams) {
    const content = {};
    for (const param of evaluationParams) {
        const value = testCase[param];
        if (value !== undefined) {
            if (Array.isArray(value)) {
                content[param] = value.join('\n');
            }
            else {
                content[param] = String(value);
            }
        }
    }
    return content;
}
//# sourceMappingURL=templates.js.map