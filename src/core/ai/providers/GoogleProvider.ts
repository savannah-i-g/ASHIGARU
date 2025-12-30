/**
 * Google Generative AI Provider
 * Uses Vercel AI SDK with @ai-sdk/google
 */

import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { AIProvider, AIProviderConfig, AIMessage } from '../types.js';

export class GoogleProvider implements AIProvider {
    name = 'google';
    defaultModel = 'gemini-2.5-flash';

    private provider: ReturnType<typeof createGoogleGenerativeAI> | typeof google;
    private apiKey?: string;

    constructor() {
        this.provider = google;
    }

    initialize(config?: AIProviderConfig): void {
        if (config?.apiKey) {
            this.apiKey = config.apiKey;
            this.provider = createGoogleGenerativeAI({
                apiKey: config.apiKey,
                baseURL: config.baseURL,
            });
        }
        if (config?.model) {
            this.defaultModel = config.model;
        }
    }

    async generateText(
        prompt: string,
        options?: {
            system?: string;
            history?: AIMessage[];
            model?: string;
        }
    ): Promise<string> {
        const model = this.provider(options?.model || this.defaultModel);

        // Build messages array
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        if (options?.history) {
            for (const msg of options.history) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: prompt });

        const result = await generateText({
            model,
            system: options?.system,
            messages,
        });

        return result.text;
    }

    async streamText(
        prompt: string,
        onChunk: (text: string) => void,
        options?: {
            system?: string;
            history?: AIMessage[];
            model?: string;
            onComplete?: () => void;
        }
    ): Promise<void> {
        const model = this.provider(options?.model || this.defaultModel);

        // Build messages array
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        if (options?.history) {
            for (const msg of options.history) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: prompt });

        const result = streamText({
            model,
            system: options?.system,
            messages,
        });

        for await (const chunk of result.textStream) {
            onChunk(chunk);
        }

        options?.onComplete?.();
    }
}

export const googleProvider = new GoogleProvider();
