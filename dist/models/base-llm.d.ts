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
 * Schema descriptor for structured generation
 */
export interface SchemaDescriptor {
    type: string;
    properties?: Record<string, SchemaDescriptor>;
    items?: SchemaDescriptor;
    required?: string[];
}
/**
 * Abstract base class for LLM models
 */
export declare abstract class BaseLLM {
    protected modelName: string;
    constructor(modelName: string);
    /**
     * Generate text from a prompt
     */
    abstract generate(prompt: string, options?: GenerateOptions): Promise<string>;
    /**
     * Generate structured output using a schema descriptor
     */
    abstract generateStructured<T>(prompt: string, schema: SchemaDescriptor, options?: GenerateOptions): Promise<T>;
    /**
     * Get raw response with log probabilities if supported
     */
    abstract generateRaw(prompt: string, options?: GenerateOptions): Promise<RawLLMResponse>;
    /**
     * Get the model name
     */
    getModelName(): string;
}
