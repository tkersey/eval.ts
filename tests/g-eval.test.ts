import { GEval, OpenAIModel, LLMTestCase } from '../src';

// Integration tests that use real OpenAI API
// Set OPENAI_API_KEY environment variable to run these tests
const SKIP_INTEGRATION = !process.env.OPENAI_API_KEY;

describe('GEval Metric', () => {
  let model: OpenAIModel;

  beforeAll(() => {
    if (!SKIP_INTEGRATION) {
      model = new OpenAIModel('gpt-4o-mini');
    }
  });

  describe('Constructor', () => {
    it('should create GEval with valid config', () => {
      const geval = new GEval(new OpenAIModel('gpt-4o-mini'), {
        name: 'Test Metric',
        evaluationParams: ['input', 'actualOutput'],
        threshold: 0.7,
      });

      expect(geval.getName()).toBe('Test Metric');
    });

    it('should throw error if no evaluation params provided', () => {
      expect(() => {
        new GEval(new OpenAIModel('gpt-4o-mini'), {
          name: 'Test Metric',
          evaluationParams: [],
          threshold: 0.7,
        });
      }).toThrow('At least one evaluation parameter must be specified');
    });

    it('should throw error if rubric used with strict mode', () => {
      expect(() => {
        new GEval(new OpenAIModel('gpt-4o-mini'), {
          name: 'Test Metric',
          evaluationParams: ['input'],
          threshold: 1,
          strictMode: true,
          rubric: [{ score: 0, description: 'Bad' }],
        });
      }).toThrow('Rubric is not supported in strict mode');
    });
  });

  describe('Evaluation (Integration)', () => {
    const conditionalTest = SKIP_INTEGRATION ? it.skip : it;

    conditionalTest('should evaluate test case successfully', async () => {
      const geval = new GEval(model, {
        name: 'Answer Quality',
        evaluationParams: ['input', 'actualOutput'],
        criteria: 'Evaluate if the output correctly answers the input question.',
        threshold: 0.7,
      });

      const testCase: LLMTestCase = {
        input: 'What is the capital of France?',
        actualOutput: 'The capital of France is Paris.',
      };

      const result = await geval.evaluate(testCase);

      expect(result.score).toBeGreaterThanOrEqual(7);
      expect(result.success).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(geval.getEvaluationSteps()).toHaveLength(3); // Auto-generated steps
    }, 30000); // 30s timeout for API calls

    conditionalTest('should handle missing required parameters', async () => {
      const geval = new GEval(model, {
        name: 'Test Metric',
        evaluationParams: ['input', 'actualOutput', 'expectedOutput'],
        threshold: 0.7,
      });

      const testCase: LLMTestCase = {
        input: 'Test input',
        actualOutput: 'Test output',
        // Missing expectedOutput
      };

      const result = await geval.evaluate(testCase);

      expect(result.success).toBe(false);
      expect(result.score).toBe(0);
      expect(result.error).toContain('missing required parameters');
    });

    conditionalTest('should use custom evaluation steps', async () => {
      const customSteps = [
        'Check if the output directly addresses the input question',
        'Evaluate the factual accuracy of the response',
        'Assess the completeness of the answer',
      ];

      const geval = new GEval(model, {
        name: 'Custom Metric',
        evaluationParams: ['input', 'actualOutput'],
        evaluationSteps: customSteps,
        threshold: 0.8,
      });

      const testCase: LLMTestCase = {
        input: 'What is 2 + 2?',
        actualOutput: 'The sum of 2 + 2 equals 4.',
      };

      const result = await geval.evaluate(testCase);

      expect(result.score).toBeGreaterThanOrEqual(8);
      expect(result.success).toBe(true);
      expect(geval.getEvaluationSteps()).toEqual(customSteps);
    }, 30000);

    conditionalTest('should handle strict mode', async () => {
      const geval = new GEval(model, {
        name: 'Strict Metric',
        evaluationParams: ['actualOutput', 'expectedOutput'],
        criteria: 'Check if outputs are exactly the same',
        threshold: 1,
        strictMode: true,
      });

      const testCase: LLMTestCase = {
        input: 'Test',
        actualOutput: 'Paris',
        expectedOutput: 'Paris',
      };

      const result = await geval.evaluate(testCase);

      expect(result.score).toBe(1);
      expect(result.success).toBe(true);
    }, 30000);

    conditionalTest('should evaluate with rubric', async () => {
      const geval = new GEval(model, {
        name: 'Rubric Test',
        evaluationParams: ['input', 'actualOutput'],
        criteria: 'Evaluate the quality of the mathematical explanation',
        rubric: [
          { score: 0, description: 'No mathematical content or completely wrong' },
          { score: 3, description: 'Shows basic understanding but with errors' },
          { score: 7, description: 'Correct answer with adequate explanation' },
          { score: 10, description: 'Perfect answer with detailed step-by-step explanation' },
        ],
        threshold: 0.6,
      });

      const testCase: LLMTestCase = {
        input: 'Explain how to calculate the area of a circle',
        actualOutput: 'To calculate the area of a circle, use the formula A = πr², where r is the radius.',
      };

      const result = await geval.evaluate(testCase);

      expect(result.score).toBeGreaterThanOrEqual(6);
      expect(result.success).toBe(true);
      expect(result.reason).toContain('formula');
    }, 30000);

    conditionalTest('should evaluate RAG use case with context', async () => {
      const geval = new GEval(model, {
        name: 'RAG Evaluation',
        evaluationParams: ['input', 'actualOutput', 'context'],
        criteria: 'Evaluate if the answer is accurate based on the provided context',
        threshold: 0.75,
      });

      const testCase: LLMTestCase = {
        input: 'What is the population of Tokyo?',
        actualOutput: 'Based on the provided information, Tokyo has a population of 14 million people.',
        context: [
          'Tokyo is the capital of Japan.',
          'As of 2023, the Tokyo Metropolis has a population of 14.0 million.',
        ],
      };

      const result = await geval.evaluate(testCase);

      expect(result.score).toBeGreaterThanOrEqual(7.5);
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('Cost Tracking', () => {
    const conditionalTest = SKIP_INTEGRATION ? it.skip : it;

    conditionalTest('should track evaluation costs', async () => {
      const geval = new GEval(model, {
        name: 'Cost Test',
        evaluationParams: ['input', 'actualOutput'],
        threshold: 0.5,
      });

      geval.resetCost(); // Ensure we start fresh

      await geval.evaluate({ 
        input: 'What is 1+1?', 
        actualOutput: 'The answer is 2.' 
      });

      const cost = geval.getEvaluationCost();
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be less than 1 cent

      geval.resetCost();
      expect(geval.getEvaluationCost()).toBe(0);
    }, 30000);
  });
});