import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import pRetry from 'p-retry';
import { BaseLLM, GenerateOptions, RawLLMResponse } from './base-llm';

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
  private retryOptions = {
    retries: 3,
    minTimeout: 1000,
    factor: 2,
    onFailedAttempt: (error: any) => {
      console.error(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
    },
  };

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
    return pRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? null,
        max_tokens: options?.maxTokens ?? null,
        top_p: options?.topP ?? null,
      });

      return response.choices[0]?.message?.content || '';
    }, this.retryOptions);
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // Check if model supports structured outputs
    const supportsStructuredOutput = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
    ].includes(this.modelName);

    if (supportsStructuredOutput) {
      return pRetry(async () => {
        const response = await this.client.beta.chat.completions.parse({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: zodResponseFormat(schema, 'response'),
          temperature: options?.temperature ?? null,
          max_tokens: options?.maxTokens ?? null,
          top_p: options?.topP ?? null,
        });

        const parsed = response.choices[0]?.message?.parsed;
        if (!parsed) {
          throw new Error('Failed to parse structured response');
        }

        return parsed as T;
      }, this.retryOptions);
    } else {
      // Fallback: Use JSON mode and manual parsing
      const jsonPrompt = `${prompt}\n\nRespond with valid JSON that matches this structure: ${JSON.stringify(
        zodToJsonSchema(schema),
        null,
        2
      )}`;

      return pRetry(async () => {
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
        return schema.parse(parsed);
      }, this.retryOptions);
    }
  }

  async generateRaw(
    prompt: string,
    options?: GenerateOptions
  ): Promise<RawLLMResponse> {
    return pRetry(async () => {
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
    }, this.retryOptions);
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
}

/**
 * Simple helper to convert Zod schema to JSON schema representation
 */
function zodToJsonSchema(schema: z.ZodSchema<any>): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodSchema<any>);
      if (!(value as any).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  } else if (schema instanceof z.ZodString) {
    return { type: 'string' };
  } else if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  } else if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  } else if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
    };
  }

  return {};
}