# DeepEval TypeScript - G-Eval Implementation

A TypeScript implementation of the G-Eval metric from DeepEval, designed for evaluating LLM outputs in Node.js applications.

## Features

- 🎯 **Flexible Evaluation**: Evaluate any combination of test case parameters
- 🤖 **Multiple LLM Support**: Currently supports OpenAI models with easy extensibility
- 📊 **Custom Rubrics**: Define scoring rubrics for consistent evaluation
- 🔄 **Auto-generated Steps**: Automatically generate evaluation steps based on criteria
- 💪 **Type-Safe**: Full TypeScript support with strict typing
- 🧪 **Testing Ready**: Designed to work with Jest and other test frameworks
- 💰 **Cost Tracking**: Track evaluation costs across multiple evaluations

## Installation

```bash
npm install deepeval-ts
```

## Quick Start

```typescript
import { GEval, OpenAIModel, LLMTestCase } from 'deepeval-ts';

// Initialize model
const model = new OpenAIModel('gpt-4o-mini');

// Create G-Eval metric
const geval = new GEval(model, {
  name: 'Answer Quality',
  evaluationParams: ['input', 'actualOutput'],
  criteria: 'Evaluate if the output properly answers the input question.',
  threshold: 0.7,
});

// Evaluate a test case
const testCase: LLMTestCase = {
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
};

const result = await geval.evaluate(testCase);
console.log(`Score: ${result.score}`);
console.log(`Success: ${result.success}`);
console.log(`Reason: ${result.reason}`);
```

## Configuration Options

### GEvalConfig

```typescript
interface GEvalConfig {
  name: string;                    // Name of the metric
  evaluationParams: EvaluationParam[]; // Parameters to evaluate
  criteria?: string;               // Evaluation criteria description
  evaluationSteps?: string[];      // Custom evaluation steps
  rubric?: Rubric[];              // Scoring rubric
  threshold: number;               // Success threshold (0-1)
  strictMode?: boolean;            // Binary scoring (0 or 1)
  topLogprobs?: number;           // Use log probabilities for scoring
}
```

### Evaluation Parameters

- `input`: The input/question to the LLM
- `actualOutput`: The LLM's response
- `expectedOutput`: The expected/reference output
- `context`: Context provided to the LLM
- `retrievalContext`: Retrieved documents (for RAG)
- `toolsCalled`: Tools/functions called by the LLM

## Advanced Usage

### Custom Evaluation Steps

```typescript
const geval = new GEval(model, {
  name: 'Technical Accuracy',
  evaluationParams: ['input', 'actualOutput', 'expectedOutput'],
  evaluationSteps: [
    'Check if technical terms are used correctly',
    'Verify factual accuracy of the response',
    'Compare with expected output for completeness',
    'Evaluate clarity and structure of explanation',
  ],
  threshold: 0.8,
});
```

### Using Rubrics

```typescript
const geval = new GEval(model, {
  name: 'Response Quality',
  evaluationParams: ['input', 'actualOutput'],
  rubric: [
    { score: 0, description: 'Completely off-topic or incorrect' },
    { score: 3, description: 'Partially addresses the question' },
    { score: 7, description: 'Good answer with minor issues' },
    { score: 10, description: 'Perfect, comprehensive answer' },
  ],
  threshold: 0.7,
});
```

### Strict Mode (Binary Evaluation)

```typescript
const geval = new GEval(model, {
  name: 'Factual Correctness',
  evaluationParams: ['actualOutput', 'expectedOutput'],
  criteria: 'Output must be factually identical to expected',
  threshold: 1,
  strictMode: true, // Returns 0 or 1
});
```

### Integration with Jest

```typescript
import { GEval, OpenAIModel } from 'deepeval-ts';

describe('LLM Output Tests', () => {
  const model = new OpenAIModel('gpt-4o-mini');
  const geval = new GEval(model, {
    name: 'Answer Quality',
    evaluationParams: ['input', 'actualOutput'],
    threshold: 0.7,
  });

  test('should provide accurate answer', async () => {
    const result = await geval.evaluate({
      input: 'What is 2+2?',
      actualOutput: 'The answer is 4.',
    });

    expect(result.success).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });
});
```

### Production Usage (Non-Testing)

```typescript
// Evaluate user interactions in production
async function evaluateUserResponse(
  userQuestion: string,
  llmResponse: string
): Promise<{ quality: number; feedback: string }> {
  const geval = new GEval(model, {
    name: 'Response Quality',
    evaluationParams: ['input', 'actualOutput'],
    criteria: 'Evaluate helpfulness, accuracy, and completeness',
    threshold: 0.6,
  });

  const result = await geval.evaluate({
    input: userQuestion,
    actualOutput: llmResponse,
  });

  return {
    quality: result.score,
    feedback: result.reason,
  };
}
```

## API Reference

### GEval Class

#### Constructor
```typescript
constructor(model: BaseLLM, config: GEvalConfig)
```

#### Methods
- `evaluate(testCase: LLMTestCase): Promise<MetricResult>` - Evaluate a test case
- `getEvaluationSteps(): string[] | null` - Get the evaluation steps used
- `getEvaluationCost(): number` - Get total cost of evaluations
- `resetCost(): void` - Reset the cost counter
- `getName(): string` - Get the metric name

### Types

```typescript
interface LLMTestCase {
  input: string;
  actualOutput: string;
  expectedOutput?: string;
  context?: string[];
  retrievalContext?: string[];
  toolsCalled?: string[];
  metadata?: Record<string, unknown>;
}

interface MetricResult {
  score: number;      // 0-10 (or 0-1 in strict mode)
  success: boolean;   // score >= threshold
  reason: string;     // Evaluation reasoning
  evaluationCost?: number;
  error?: string;
}
```

## Extending the Library

### Adding New LLM Providers

```typescript
import { BaseLLM } from 'deepeval-ts';

export class AnthropicModel extends BaseLLM {
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    // Implementation
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // Implementation
  }

  // ... other required methods
}
```

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key (if not provided in constructor)

## License

Apache-2.0