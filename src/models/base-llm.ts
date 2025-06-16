import { z } from 'zod';

/**
 * Options for generating text
 */
export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topLogprobs?: number;
}

/**
 * Raw response from LLM with log probabilities
 */
export interface RawLLMResponse {
  content: string;
  logprobs?: Array<{
    token: string;
    logprob: number;
    topLogprobs?: Array<{
      token: string;
      logprob: number;
    }>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Abstract base class for LLM models
 */
export abstract class BaseLLM {
  protected modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  /**
   * Generate text from a prompt
   */
  abstract generate(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Generate structured output using a Zod schema
   */
  abstract generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>;

  /**
   * Get raw response with log probabilities if supported
   */
  abstract generateRaw(
    prompt: string,
    options?: GenerateOptions
  ): Promise<RawLLMResponse>;

  /**
   * Get the model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Calculate cost for the completion
   */
  abstract calculateCost(usage: { promptTokens: number; completionTokens: number }): number;
}