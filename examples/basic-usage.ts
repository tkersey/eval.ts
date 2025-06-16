import { GEval, OpenAIModel, LLMTestCase } from '../src';

async function main() {
  // Initialize the OpenAI model
  const model = new OpenAIModel('gpt-4o-mini');

  // Example 1: Basic G-Eval with auto-generated evaluation steps
  const basicGEval = new GEval(model, {
    name: 'Answer Quality',
    evaluationParams: ['input', 'actualOutput'],
    criteria: 'Evaluate if the actual output properly answers the input question with accuracy and completeness.',
    threshold: 0.7,
  });

  const testCase1: LLMTestCase = {
    input: 'What is the capital of France?',
    actualOutput: 'The capital of France is Paris.',
  };

  console.log('Example 1: Basic evaluation');
  const result1 = await basicGEval.evaluate(testCase1);
  console.log('Score:', result1.score);
  console.log('Success:', result1.success);
  console.log('Reason:', result1.reason);
  console.log('Evaluation Steps:', basicGEval.getEvaluationSteps());
  console.log('---\n');

  // Example 2: G-Eval with custom evaluation steps
  const customGEval = new GEval(model, {
    name: 'Response Relevancy',
    evaluationParams: ['input', 'actualOutput', 'expectedOutput'],
    evaluationSteps: [
      'Check if the actual output addresses the main topic of the input',
      'Compare the actual output with the expected output for accuracy',
      'Evaluate the completeness and clarity of the actual output',
      'Assess whether any important information is missing',
    ],
    threshold: 0.8,
  });

  const testCase2: LLMTestCase = {
    input: 'Explain the process of photosynthesis',
    actualOutput: 'Photosynthesis is the process by which plants convert sunlight into energy using chlorophyll.',
    expectedOutput: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.',
  };

  console.log('Example 2: Custom evaluation steps');
  const result2 = await customGEval.evaluate(testCase2);
  console.log('Score:', result2.score);
  console.log('Success:', result2.success);
  console.log('Reason:', result2.reason);
  console.log('---\n');

  // Example 3: G-Eval with rubric
  const rubricGEval = new GEval(model, {
    name: 'Answer Completeness',
    evaluationParams: ['input', 'actualOutput'],
    criteria: 'Evaluate the completeness and quality of the answer',
    rubric: [
      { score: 0, description: 'No relevant information provided' },
      { score: 3, description: 'Partially addresses the question with major gaps' },
      { score: 5, description: 'Addresses the main points but lacks depth' },
      { score: 7, description: 'Good answer with most important points covered' },
      { score: 10, description: 'Comprehensive, accurate, and well-explained answer' },
    ],
    threshold: 0.6,
  });

  const testCase3: LLMTestCase = {
    input: 'What are the main causes of climate change?',
    actualOutput: 'The main causes of climate change include greenhouse gas emissions from burning fossil fuels, deforestation, industrial processes, and agriculture. These activities increase CO2 and other greenhouse gases in the atmosphere, trapping heat and warming the planet.',
  };

  console.log('Example 3: Evaluation with rubric');
  const result3 = await rubricGEval.evaluate(testCase3);
  console.log('Score:', result3.score);
  console.log('Success:', result3.success);
  console.log('Reason:', result3.reason);
  console.log('---\n');

  // Example 4: Strict mode (binary scoring)
  const strictGEval = new GEval(model, {
    name: 'Factual Accuracy',
    evaluationParams: ['actualOutput', 'expectedOutput'],
    criteria: 'Check if the actual output is factually correct compared to the expected output',
    threshold: 1, // In strict mode, score is 0 or 1
    strictMode: true,
  });

  const testCase4: LLMTestCase = {
    input: 'What year did World War II end?',
    actualOutput: 'World War II ended in 1945.',
    expectedOutput: 'World War II ended in 1945.',
  };

  console.log('Example 4: Strict mode evaluation');
  const result4 = await strictGEval.evaluate(testCase4);
  console.log('Score:', result4.score);
  console.log('Success:', result4.success);
  console.log('Reason:', result4.reason);
  console.log('---\n');

  // Example 5: Evaluating with context (RAG use case)
  const ragGEval = new GEval(model, {
    name: 'RAG Answer Quality',
    evaluationParams: ['input', 'actualOutput', 'context'],
    criteria: 'Evaluate if the answer is accurate based on the provided context and properly addresses the question',
    threshold: 0.75,
  });

  const testCase5: LLMTestCase = {
    input: 'What is the population of Tokyo?',
    actualOutput: 'According to the latest data, Tokyo has a population of approximately 14 million people in the city proper.',
    context: [
      'Tokyo is the capital of Japan.',
      'As of 2023, the Tokyo Metropolis has a population of 14.0 million.',
      'The Greater Tokyo Area has over 37 million inhabitants, making it the most populous metropolitan area in the world.',
    ],
  };

  console.log('Example 5: RAG evaluation with context');
  const result5 = await ragGEval.evaluate(testCase5);
  console.log('Score:', result5.score);
  console.log('Success:', result5.success);
  console.log('Reason:', result5.reason);
  console.log('Total evaluation cost: $', basicGEval.getEvaluationCost());
}

// Run the examples
main().catch(console.error);