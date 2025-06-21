import OpenAI from 'openai';
import { BaseLLM, GenerateOptions, RawLLMResponse, SchemaDescriptor } from './base-llm';

/**
 * Model pricing per 1M tokens (as of implementation)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1-preview': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
};

/**
 * OpenAI LLM implementation
 */
export class OpenAIModel extends BaseLLM {
  private client: OpenAI;

  constructor(
    modelName: string = 'gpt-4o-mini',
    apiKey?: string,
    options?: { baseURL?: string }
  ) {
    super(modelName);
    this.client = new OpenAI({
      apiKey: apiKey || process.env['OPENAI_API_KEY'],
      ...options,
    });
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? null,
      max_tokens: options?.maxTokens ?? null,
      top_p: options?.topP ?? null,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateStructured<T>(
    prompt: string,
    schema: SchemaDescriptor,
    options?: GenerateOptions
  ): Promise<T> {
    // Generate JSON prompt with schema
    const jsonPrompt = `${prompt}\n\nRespond with valid JSON that matches this structure: ${JSON.stringify(
      schema,
      null,
      2
    )}`;

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: jsonPrompt }],
      response_format: { type: 'json_object' },
      temperature: options?.temperature ?? null,
      max_tokens: options?.maxTokens ?? null,
      top_p: options?.topP ?? null,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    // Basic validation
    this.validateSchema(parsed, schema);
    
    return parsed as T;
  }

  async generateRaw(
    prompt: string,
    options?: GenerateOptions
  ): Promise<RawLLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? null,
      max_tokens: options?.maxTokens ?? null,
      top_p: options?.topP ?? null,
      logprobs: options?.topLogprobs ? true : null,
      top_logprobs: options?.topLogprobs ?? null,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No content in response');
    }

    const result: RawLLMResponse = {
      content: choice.message.content,
    };

    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      };
    }

    if (choice.logprobs?.content) {
      result.logprobs = choice.logprobs.content.map((lp) => ({
        token: lp.token,
        logprob: lp.logprob,
        topLogprobs: lp.top_logprobs?.map((tlp) => ({
          token: tlp.token,
          logprob: tlp.logprob,
        })),
      }));
    }

    return result;
  }

  calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    const pricing = MODEL_PRICING[this.modelName];
    if (!pricing) {
      return 0;
    }

    const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Basic schema validation
   */
  private validateSchema(data: any, schema: SchemaDescriptor, path: string = ''): void {
    if (schema.type === 'object' && schema.properties) {
      if (typeof data !== 'object' || data === null) {
        throw new Error(`Expected object at ${path || 'root'}, got ${typeof data}`);
      }
      
      // Check required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in data)) {
            throw new Error(`Missing required field: ${path ? path + '.' : ''}${field}`);
          }
        }
      }
      
      // Validate properties
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          this.validateSchema(data[key], propSchema, path ? `${path}.${key}` : key);
        }
      }
    } else if (schema.type === 'array' && schema.items) {
      if (!Array.isArray(data)) {
        throw new Error(`Expected array at ${path || 'root'}, got ${typeof data}`);
      }
      
      data.forEach((item, index) => {
        this.validateSchema(item, schema.items!, `${path}[${index}]`);
      });
    } else if (schema.type === 'string') {
      if (typeof data !== 'string') {
        throw new Error(`Expected string at ${path || 'root'}, got ${typeof data}`);
      }
    } else if (schema.type === 'number') {
      if (typeof data !== 'number') {
        throw new Error(`Expected number at ${path || 'root'}, got ${typeof data}`);
      }
    } else if (schema.type === 'boolean') {
      if (typeof data !== 'boolean') {
        throw new Error(`Expected boolean at ${path || 'root'}, got ${typeof data}`);
      }
    }
  }
}