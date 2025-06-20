/**
 * Extract JSON from a string that may contain additional text
 */
export declare function extractJson(text: string): any;
/**
 * Safely parse JSON with a fallback value
 */
export declare function safeJsonParse<T>(text: string, fallback: T): T;
