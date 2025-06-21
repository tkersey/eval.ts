import { BaseLLM, GenerateOptions, RawLLMResponse, SchemaDescriptor } from './base-llm';
/**
 * OpenAI LLM implementation
 */
export declare class OpenAIModel extends BaseLLM {
    private client;
    constructor(modelName?: string, apiKey?: string, options?: {
        baseURL?: string;
    });
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateStructured<T>(prompt: string, schema: SchemaDescriptor, options?: GenerateOptions): Promise<T>;
    generateRaw(prompt: string, options?: GenerateOptions): Promise<RawLLMResponse>;
    calculateCost(usage: {
        promptTokens: number;
        completionTokens: number;
    }): number;
    /**
     * Basic schema validation
     */
    private validateSchema;
}
