/**
 * AI API
 * Provides AI/LLM capabilities by wrapping the AIContext
 */

import type { AIAPI, APICreationContext } from './types.js';

/**
 * Create an AI API instance
 */
export const createAIAPI = (context: APICreationContext): AIAPI => {
    return {
        async ask(prompt: string): Promise<string> {
            if (!context.ai || !context.ai.isAvailable) {
                throw new Error('AI is not available. Check your API key configuration.');
            }
            return context.ai.sendMessage(prompt, false);
        },

        async stream(prompt: string, onChunk: (text: string) => void): Promise<void> {
            if (!context.ai || !context.ai.isAvailable) {
                throw new Error('AI is not available. Check your API key configuration.');
            }
            if (context.ai.streamMessage) {
                await context.ai.streamMessage(prompt, onChunk);
            } else {
                // Fallback to non-streaming
                const response = await context.ai.sendMessage(prompt, false);
                onChunk(response);
            }
        },

        setSystemPrompt(prompt: string): void {
            if (context.ai) {
                context.ai.setSystemPrompt(prompt);
            }
        },

        getSystemPrompt(): string {
            return context.ai?.systemPrompt || '';
        },

        isAvailable(): boolean {
            return context.ai?.isAvailable || false;
        },

        getProvider(): string {
            return context.ai?.providerName || 'none';
        },

        clearHistory(): void {
            if (context.ai) {
                context.ai.clearHistory();
            }
        },
    };
};
