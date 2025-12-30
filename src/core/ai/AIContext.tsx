/**
 * AI Context
 * Provides AI capabilities to the application via React context
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AIContextType, AIProvider, AIMessage } from './types.js';
import { GoogleProvider } from './providers/GoogleProvider.js';

// Available providers registry
const providers: Record<string, AIProvider> = {
    google: new GoogleProvider(),
};

const AIContext = createContext<AIContextType | null>(null);

interface AIProviderProps {
    children: React.ReactNode;
    defaultProvider?: string;
    apiKey?: string;
}

export const AIContextProvider: React.FC<AIProviderProps> = ({
    children,
    defaultProvider = 'google',
    apiKey,
}) => {
    const [providerName, setProviderName] = useState(defaultProvider);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [systemPrompt, setSystemPrompt] = useState(
        'You are ASHIGARU, a helpful AI assistant running in a terminal environment. Be concise and helpful.'
    );
    const [streamingContent, setStreamingContent] = useState('');

    // Get current provider
    const provider = useMemo(() => {
        const p = providers[providerName];
        if (p && apiKey) {
            p.initialize({ apiKey });
        }
        return p || null;
    }, [providerName, apiKey]);

    const sendMessage = useCallback(async (prompt: string, stream = true): Promise<string> => {
        if (!provider) {
            setError('No AI provider available');
            return '';
        }

        setIsLoading(true);
        setError(null);

        // Add user message
        const userMessage: AIMessage = {
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            let responseText = '';

            if (stream) {
                // Create placeholder for assistant message
                const assistantMessage: AIMessage = {
                    role: 'assistant',
                    content: '',
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                await provider.streamText(
                    prompt,
                    (chunk) => {
                        responseText += chunk;
                        setStreamingContent(responseText);
                        // Update the last message with new content
                        setMessages(prev => {
                            const updated = [...prev];
                            if (updated.length > 0) {
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    content: responseText,
                                };
                            }
                            return updated;
                        });
                    },
                    {
                        system: systemPrompt,
                        history: messages,
                        onComplete: () => {
                            setStreamingContent('');
                        },
                    }
                );
            } else {
                responseText = await provider.generateText(prompt, {
                    system: systemPrompt,
                    history: messages,
                });

                const assistantMessage: AIMessage = {
                    role: 'assistant',
                    content: responseText,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMessage]);
            }

            setIsLoading(false);
            return responseText;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setIsLoading(false);
            return '';
        }
    }, [provider, messages, systemPrompt]);

    const clearHistory = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    const switchProvider = useCallback((name: string) => {
        if (providers[name]) {
            setProviderName(name);
            setError(null);
        } else {
            setError(`Provider '${name}' not available`);
        }
    }, []);

    const value: AIContextType = {
        provider,
        providerName,
        isLoading,
        error,
        messages,
        sendMessage,
        clearHistory,
        setSystemPrompt,
        systemPrompt,
        switchProvider,
        availableProviders: Object.keys(providers),
    };

    return React.createElement(AIContext.Provider, { value }, children);
};

export const useAI = (): AIContextType => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within AIContextProvider');
    }
    return context;
};
