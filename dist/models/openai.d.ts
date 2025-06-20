import { z } from 'zod';
import { BaseLLM, GenerateOptions, RawLLMResponse } from './base-llm';
/**
 * OpenAI LLM implementation
 */
export declare class OpenAIModel extends BaseLLM {
    private client;
    private retryOptions;
    constructor(modelName?: string, apiKey?: string, options?: {
        baseURL?: string;
    });
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, options?: GenerateOptions): Promise<T>;
    generateRaw(prompt: string, options?: GenerateOptions): Promise<RawLLMResponse>;
    calculateCost(usage: {
        promptTokens: number;
        completionTokens: number;
    }): number;
}
