"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIModel = void 0;
const openai_1 = __importDefault(require("openai"));
const base_llm_1 = require("./base-llm");
/**
 * Model pricing per 1M tokens (as of implementation)
 */
const MODEL_PRICING = {
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
class OpenAIModel extends base_llm_1.BaseLLM {
    constructor(modelName = 'gpt-4o-mini', apiKey, options) {
        super(modelName);
        this.client = new openai_1.default(Object.assign({ apiKey: apiKey || process.env['OPENAI_API_KEY'] }, options));
    }
    generate(prompt, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const response = yield this.client.chat.completions.create({
                model: this.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: (_a = options === null || options === void 0 ? void 0 : options.temperature) !== null && _a !== void 0 ? _a : null,
                max_tokens: (_b = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _b !== void 0 ? _b : null,
                top_p: (_c = options === null || options === void 0 ? void 0 : options.topP) !== null && _c !== void 0 ? _c : null,
            });
            return ((_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '';
        });
    }
    generateStructured(prompt, schema, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Generate JSON prompt with schema
            const jsonPrompt = `${prompt}\n\nRespond with valid JSON that matches this structure: ${JSON.stringify(schema, null, 2)}`;
            const response = yield this.client.chat.completions.create({
                model: this.modelName,
                messages: [{ role: 'user', content: jsonPrompt }],
                response_format: { type: 'json_object' },
                temperature: (_a = options === null || options === void 0 ? void 0 : options.temperature) !== null && _a !== void 0 ? _a : null,
                max_tokens: (_b = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _b !== void 0 ? _b : null,
                top_p: (_c = options === null || options === void 0 ? void 0 : options.topP) !== null && _c !== void 0 ? _c : null,
            });
            const content = ((_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '{}';
            const parsed = JSON.parse(content);
            // Basic validation
            this.validateSchema(parsed, schema);
            return parsed;
        });
    }
    generateRaw(prompt, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const response = yield this.client.chat.completions.create({
                model: this.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: (_a = options === null || options === void 0 ? void 0 : options.temperature) !== null && _a !== void 0 ? _a : null,
                max_tokens: (_b = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _b !== void 0 ? _b : null,
                top_p: (_c = options === null || options === void 0 ? void 0 : options.topP) !== null && _c !== void 0 ? _c : null,
                logprobs: (options === null || options === void 0 ? void 0 : options.topLogprobs) ? true : null,
                top_logprobs: (_d = options === null || options === void 0 ? void 0 : options.topLogprobs) !== null && _d !== void 0 ? _d : null,
            });
            const choice = response.choices[0];
            if (!((_e = choice === null || choice === void 0 ? void 0 : choice.message) === null || _e === void 0 ? void 0 : _e.content)) {
                throw new Error('No content in response');
            }
            const result = {
                content: choice.message.content,
            };
            if (response.usage) {
                result.usage = {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                };
            }
            if ((_f = choice.logprobs) === null || _f === void 0 ? void 0 : _f.content) {
                result.logprobs = choice.logprobs.content.map((lp) => {
                    var _a;
                    return ({
                        token: lp.token,
                        logprob: lp.logprob,
                        topLogprobs: (_a = lp.top_logprobs) === null || _a === void 0 ? void 0 : _a.map((tlp) => ({
                            token: tlp.token,
                            logprob: tlp.logprob,
                        })),
                    });
                });
            }
            return result;
        });
    }
    calculateCost(usage) {
        const pricing = MODEL_PRICING[this.modelName];
        if (!pricing) {
            return 0;
        }
        const inputCost = (usage.promptTokens / 1000000) * pricing.input;
        const outputCost = (usage.completionTokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Basic schema validation
     */
    validateSchema(data, schema, path = '') {
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
        }
        else if (schema.type === 'array' && schema.items) {
            if (!Array.isArray(data)) {
                throw new Error(`Expected array at ${path || 'root'}, got ${typeof data}`);
            }
            data.forEach((item, index) => {
                this.validateSchema(item, schema.items, `${path}[${index}]`);
            });
        }
        else if (schema.type === 'string') {
            if (typeof data !== 'string') {
                throw new Error(`Expected string at ${path || 'root'}, got ${typeof data}`);
            }
        }
        else if (schema.type === 'number') {
            if (typeof data !== 'number') {
                throw new Error(`Expected number at ${path || 'root'}, got ${typeof data}`);
            }
        }
        else if (schema.type === 'boolean') {
            if (typeof data !== 'boolean') {
                throw new Error(`Expected boolean at ${path || 'root'}, got ${typeof data}`);
            }
        }
    }
}
exports.OpenAIModel = OpenAIModel;
//# sourceMappingURL=openai.js.map