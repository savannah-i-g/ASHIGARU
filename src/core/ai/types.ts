/**
 * AI Integration Types
 */

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface AIProviderConfig {
    apiKey?: string;
    model?: string;
    baseURL?: string;
}

export interface AIProvider {
    /** Provider name (e.g., 'google', 'openai') */
    name: string;

    /** Default model ID */
    defaultModel: string;

    /** Initialize the provider */
    initialize(config?: AIProviderConfig): void;

    /** Generate text response (non-streaming) */
    generateText(
        prompt: string,
        options?: {
            system?: string;
            history?: AIMessage[];
            model?: string;
        }
    ): Promise<string>;

    /** Stream text response */
    streamText(
        prompt: string,
        onChunk: (text: string) => void,
        options?: {
            system?: string;
            history?: AIMessage[];
            model?: string;
            onComplete?: () => void;
        }
    ): Promise<void>;
}

export interface AIContextType {
    /** Current provider instance */
    provider: AIProvider | null;

    /** Current provider name */
    providerName: string;

    /** Whether AI is currently generating */
    isLoading: boolean;

    /** Current error message */
    error: string | null;

    /** Conversation history */
    messages: AIMessage[];

    /** Send a message and get response */
    sendMessage: (prompt: string, stream?: boolean) => Promise<string>;

    /** Clear conversation history */
    clearHistory: () => void;

    /** Set system prompt */
    setSystemPrompt: (prompt: string) => void;

    /** Current system prompt */
    systemPrompt: string;

    /** Switch provider */
    switchProvider: (name: string) => void;

    /** Available provider names */
    availableProviders: string[];
}
