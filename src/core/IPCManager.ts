/**
 * IPC Manager
 * Core implementation for inter-process communication
 * Handles pub/sub messaging, direct window messaging, and service registry
 */

import type {
    IPCMessage,
    IPCMessageHandler,
    IPCSubscription,
    IPCService,
    IPCServiceMethod,
    IPCPendingRequest,
} from '../types/ipc.js';

// Generate unique IDs
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Check if a channel matches a pattern (supports wildcards like 'system.*')
const channelMatches = (pattern: string, channel: string): boolean => {
    if (pattern === channel) return true;
    if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -1); // Remove '*'
        return channel.startsWith(prefix);
    }
    if (pattern === '*') return true;
    return false;
};

/**
 * IPC Manager - Singleton class for managing inter-process communication
 */
export class IPCManager {
    private static instance: IPCManager;

    // Channel subscriptions: pattern -> Set of handlers
    private channelSubscriptions: Map<string, Set<IPCMessageHandler>> = new Map();

    // Direct message subscriptions: windowId -> Set of handlers
    private directSubscriptions: Map<string, Set<IPCMessageHandler>> = new Map();

    // Registered services: serviceName -> IPCService
    private services: Map<string, IPCService> = new Map();

    // Pending requests for request/response pattern
    private pendingRequests: Map<string, IPCPendingRequest> = new Map();

    // Message history for debugging (limited to last N messages)
    private messageHistory: IPCMessage[] = [];
    private maxHistorySize: number = 100;

    // Default timeout for requests
    private defaultRequestTimeout: number = 5000;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): IPCManager {
        if (!IPCManager.instance) {
            IPCManager.instance = new IPCManager();
        }
        return IPCManager.instance;
    }

    /**
     * Reset the manager (useful for testing)
     */
    public reset(): void {
        this.channelSubscriptions.clear();
        this.directSubscriptions.clear();
        this.services.clear();
        this.pendingRequests.forEach((req) => clearTimeout(req.timeout));
        this.pendingRequests.clear();
        this.messageHistory = [];
    }

    // ===================
    // Pub/Sub Messaging
    // ===================

    /**
     * Publish a message to a channel
     */
    public publish(
        channel: string,
        type: string,
        payload: unknown,
        sender: string
    ): IPCMessage {
        const message: IPCMessage = {
            id: generateId(),
            channel,
            type,
            payload,
            timestamp: Date.now(),
            sender,
        };

        // Add to history
        this.addToHistory(message);

        // Notify all matching subscribers
        this.channelSubscriptions.forEach((handlers, pattern) => {
            if (channelMatches(pattern, channel)) {
                handlers.forEach((handler) => {
                    try {
                        handler(message);
                    } catch (error) {
                        console.error(`IPC: Error in channel handler for ${pattern}:`, error);
                    }
                });
            }
        });

        return message;
    }

    /**
     * Subscribe to messages on a channel (supports wildcards)
     */
    public subscribe(channel: string, handler: IPCMessageHandler): IPCSubscription {
        if (!this.channelSubscriptions.has(channel)) {
            this.channelSubscriptions.set(channel, new Set());
        }
        this.channelSubscriptions.get(channel)!.add(handler);

        return {
            channel,
            unsubscribe: () => {
                const handlers = this.channelSubscriptions.get(channel);
                if (handlers) {
                    handlers.delete(handler);
                    if (handlers.size === 0) {
                        this.channelSubscriptions.delete(channel);
                    }
                }
            },
        };
    }

    // =======================
    // Direct Window Messaging
    // =======================

    /**
     * Send a direct message to a specific window
     */
    public sendToWindow(
        targetWindowId: string,
        type: string,
        payload: unknown,
        sender: string
    ): IPCMessage {
        const message: IPCMessage = {
            id: generateId(),
            channel: 'direct',
            type,
            payload,
            timestamp: Date.now(),
            sender,
            targetWindowId,
        };

        // Add to history
        this.addToHistory(message);

        // Notify handlers registered for this window
        const handlers = this.directSubscriptions.get(targetWindowId);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(message);
                } catch (error) {
                    console.error(`IPC: Error in direct message handler for ${targetWindowId}:`, error);
                }
            });
        }

        return message;
    }

    /**
     * Subscribe to direct messages for a specific window
     */
    public onDirectMessage(windowId: string, handler: IPCMessageHandler): IPCSubscription {
        if (!this.directSubscriptions.has(windowId)) {
            this.directSubscriptions.set(windowId, new Set());
        }
        this.directSubscriptions.get(windowId)!.add(handler);

        return {
            channel: `direct:${windowId}`,
            unsubscribe: () => {
                const handlers = this.directSubscriptions.get(windowId);
                if (handlers) {
                    handlers.delete(handler);
                    if (handlers.size === 0) {
                        this.directSubscriptions.delete(windowId);
                    }
                }
            },
        };
    }

    /**
     * Cleanup all subscriptions for a window (called when window closes)
     */
    public cleanupWindow(windowId: string): void {
        // Remove direct message subscriptions
        this.directSubscriptions.delete(windowId);

        // Remove services registered by this window
        const servicesToRemove: string[] = [];
        this.services.forEach((service, name) => {
            if (service.windowId === windowId) {
                servicesToRemove.push(name);
            }
        });
        servicesToRemove.forEach((name) => this.services.delete(name));
    }

    // ================
    // Service Registry
    // ================

    /**
     * Register a service with callable methods
     */
    public registerService(
        name: string,
        methods: Record<string, IPCServiceMethod>,
        windowId: string
    ): void {
        if (this.services.has(name)) {
            console.warn(`IPC: Service '${name}' is already registered, overwriting`);
        }

        this.services.set(name, {
            name,
            windowId,
            methods,
        });

        // Publish service registration event
        this.publish('ipc.service', 'registered', { name, methods: Object.keys(methods) }, 'system');
    }

    /**
     * Unregister a service
     */
    public unregisterService(name: string): void {
        if (this.services.has(name)) {
            this.services.delete(name);
            // Publish service unregistration event
            this.publish('ipc.service', 'unregistered', { name }, 'system');
        }
    }

    /**
     * Call a method on a registered service
     */
    public async callService<T = unknown>(
        serviceName: string,
        methodName: string,
        ...args: unknown[]
    ): Promise<T> {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`IPC: Service '${serviceName}' not found`);
        }

        const method = service.methods[methodName];
        if (!method) {
            throw new Error(`IPC: Method '${methodName}' not found on service '${serviceName}'`);
        }

        try {
            const result = await method(...args);
            return result as T;
        } catch (error) {
            throw new Error(`IPC: Error calling ${serviceName}.${methodName}: ${error}`);
        }
    }

    /**
     * Get list of registered service names
     */
    public getServices(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Get methods available on a service
     */
    public getServiceMethods(serviceName: string): string[] {
        const service = this.services.get(serviceName);
        if (!service) {
            return [];
        }
        return Object.keys(service.methods);
    }

    // ====================
    // Request/Response
    // ====================

    /**
     * Send a request and wait for a response
     */
    public request<T = unknown>(
        channel: string,
        type: string,
        payload: unknown,
        sender: string,
        timeout: number = this.defaultRequestTimeout
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const correlationId = generateId();

            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`IPC: Request timeout on channel '${channel}' type '${type}'`));
            }, timeout);

            // Store pending request
            this.pendingRequests.set(correlationId, {
                id: correlationId,
                resolve: resolve as (value: unknown) => void,
                reject,
                timeout: timeoutHandle,
            });

            // Publish the request
            const message: IPCMessage = {
                id: generateId(),
                channel,
                type,
                payload,
                timestamp: Date.now(),
                sender,
                expectsResponse: true,
                correlationId,
            };

            this.addToHistory(message);

            // Notify subscribers
            this.channelSubscriptions.forEach((handlers, pattern) => {
                if (channelMatches(pattern, channel)) {
                    handlers.forEach((handler) => {
                        try {
                            handler(message);
                        } catch (error) {
                            console.error(`IPC: Error in request handler for ${pattern}:`, error);
                        }
                    });
                }
            });
        });
    }

    /**
     * Send a response to a request
     */
    public respond(originalMessage: IPCMessage, payload: unknown, sender: string): void {
        if (!originalMessage.correlationId) {
            console.warn('IPC: Cannot respond to message without correlationId');
            return;
        }

        const pendingRequest = this.pendingRequests.get(originalMessage.correlationId);
        if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(originalMessage.correlationId);
            pendingRequest.resolve(payload);
        }

        // Also publish the response as a message for monitoring
        const responseMessage: IPCMessage = {
            id: generateId(),
            channel: `${originalMessage.channel}._response`,
            type: `${originalMessage.type}._response`,
            payload,
            timestamp: Date.now(),
            sender,
            correlationId: originalMessage.correlationId,
        };
        this.addToHistory(responseMessage);
    }

    // ===========
    // Diagnostics
    // ===========

    /**
     * Get list of active channels with subscriber counts
     */
    public getChannels(): Array<{ channel: string; subscribers: number }> {
        const channels: Array<{ channel: string; subscribers: number }> = [];
        this.channelSubscriptions.forEach((handlers, channel) => {
            channels.push({ channel, subscribers: handlers.size });
        });
        return channels.sort((a, b) => a.channel.localeCompare(b.channel));
    }

    /**
     * Get recent message history
     */
    public getMessageHistory(): IPCMessage[] {
        return [...this.messageHistory];
    }

    /**
     * Get statistics about the IPC manager
     */
    public getStats(): {
        channelCount: number;
        serviceCount: number;
        pendingRequests: number;
        historySize: number;
        directSubscriptions: number;
    } {
        return {
            channelCount: this.channelSubscriptions.size,
            serviceCount: this.services.size,
            pendingRequests: this.pendingRequests.size,
            historySize: this.messageHistory.length,
            directSubscriptions: this.directSubscriptions.size,
        };
    }

    // ===========
    // Private
    // ===========

    private addToHistory(message: IPCMessage): void {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }
}

// Export singleton instance
export const ipcManager = IPCManager.getInstance();
