import { BaseLLM, GenerateOptions, RawLLMResponse, SchemaDescriptor } from './base-llm';
/**
 * OpenAI LLM implementation using the new Responses API
 */
export declare class OpenAIModel extends BaseLLM {
    private client;
    private sessionId?;
    constructor(modelName?: string, apiKey?: string, options?: {
        baseURL?: string;
    });
    /**
     * Reset the session ID to start a new conversation
     */
    resetSession(): void;
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateStructured<T>(prompt: string, schema: SchemaDescriptor, options?: GenerateOptions): Promise<T>;
    generateRaw(prompt: string, options?: GenerateOptions): Promise<RawLLMResponse>;
    calculateCost(usage: {
        promptTokens: number;
        completionTokens: number;
    }): number;
    /**
     * Convert SchemaDescriptor to JSON Schema format
     */
    private convertToJsonSchema;
    /**
     * Basic schema validation
     */
    private validateSchema;
}
