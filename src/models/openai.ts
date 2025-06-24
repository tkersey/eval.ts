import OpenAI from 'openai';
import { APIError, RateLimitError, APIConnectionError } from 'openai/error';
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
 * OpenAI LLM implementation using the new Responses API
 */
export class OpenAIModel extends BaseLLM {
  private client: OpenAI;
  private sessionId?: string;

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

  /**
   * Reset the session ID to start a new conversation
   */
  resetSession(): void {
    this.sessionId = undefined;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    try {
      const response = await this.client.responses.create({
        model: this.modelName,
        input: prompt,
        temperature: options?.temperature ?? undefined,
        max_output_tokens: options?.maxTokens ?? undefined,
        top_p: options?.topP ?? undefined,
        previous_response_id: this.sessionId,
      });

      // Store session ID for potential follow-up calls
      this.sessionId = response.id;

      return response.output_text || '';
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new Error(`Rate limit exceeded: ${error.message}`);
      } else if (error instanceof APIConnectionError) {
        throw new Error(`Connection error: ${error.message}`);
      } else if (error instanceof APIError) {
        throw new Error(`API error: ${error.message}`);
      }
      throw error;
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: SchemaDescriptor,
    options?: GenerateOptions
  ): Promise<T> {
    try {
      // Convert SchemaDescriptor to JSON Schema format
      const jsonSchema = this.convertToJsonSchema(schema);

      // For structured output, we need to use the chat completions API
      // as the Responses API doesn't support response_format yet
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_output',
            strict: true,
            schema: jsonSchema
          }
        },
        temperature: options?.temperature ?? undefined,
        max_tokens: options?.maxTokens ?? undefined,
        top_p: options?.topP ?? undefined,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      
      return parsed as T;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new Error(`Rate limit exceeded: ${error.message}`);
      } else if (error instanceof APIConnectionError) {
        throw new Error(`Connection error: ${error.message}`);
      } else if (error instanceof APIError) {
        throw new Error(`API error: ${error.message}`);
      }
      throw error;
    }
  }

  async generateRaw(
    prompt: string,
    options?: GenerateOptions
  ): Promise<RawLLMResponse> {
    try {
      const response = await this.client.responses.create({
        model: this.modelName,
        input: prompt,
        temperature: options?.temperature ?? undefined,
        max_output_tokens: options?.maxTokens ?? undefined,
        top_p: options?.topP ?? undefined,
        previous_response_id: this.sessionId,
      });

      // Store session ID for potential follow-up calls
      this.sessionId = response.id;

      if (!response.output_text) {
        throw new Error('No content in response');
      }

      const result: RawLLMResponse = {
        content: response.output_text,
      };

      if (response.usage) {
        result.usage = {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens,
        };
      }

      // Note: The Responses API doesn't support logprobs yet
      // We'd need to use the chat completions API for that

      return result;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new Error(`Rate limit exceeded: ${error.message}`);
      } else if (error instanceof APIConnectionError) {
        throw new Error(`Connection error: ${error.message}`);
      } else if (error instanceof APIError) {
        throw new Error(`API error: ${error.message}`);
      }
      throw error;
    }
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
   * Convert SchemaDescriptor to JSON Schema format
   */
  private convertToJsonSchema(schema: SchemaDescriptor): any {
    const jsonSchema: any = {
      type: schema.type
    };

    if (schema.properties) {
      jsonSchema.properties = {};
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        jsonSchema.properties[key] = this.convertToJsonSchema(propSchema);
      }
      // For strict mode, objects must have additionalProperties: false
      jsonSchema.additionalProperties = false;
    }

    if (schema.items) {
      jsonSchema.items = this.convertToJsonSchema(schema.items);
    }

    if (schema.required) {
      jsonSchema.required = schema.required;
    }

    // For strict mode, all fields must be required
    if (schema.type === 'object' && schema.properties && !schema.required) {
      jsonSchema.required = Object.keys(schema.properties);
    }

    return jsonSchema;
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