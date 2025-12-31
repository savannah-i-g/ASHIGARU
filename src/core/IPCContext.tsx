/**
 * IPC Context
 * React context provider for inter-process communication
 * Provides useIPC, useChannel, and useService hooks
 */

import React, { createContext, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
    IPCContextType,
    IPCMessage,
    IPCMessageHandler,
    IPCSubscription,
    IPCServiceMethod,
} from '../types/ipc.js';
import { ipcManager } from './IPCManager.js';

// Create the context
const IPCContext = createContext<IPCContextType | null>(null);

interface IPCProviderProps {
    children: React.ReactNode;
}

/**
 * IPC Context Provider
 * Wrap your app with this to enable IPC functionality
 */
export const IPCContextProvider: React.FC<IPCProviderProps> = ({ children }) => {
    // Current window ID will be set by components using the scoped context
    const currentWindowIdRef = useRef<string | null>(null);

    // Pub/Sub: Publish a message to a channel
    const publish = useCallback((channel: string, type: string, payload: unknown) => {
        const sender = currentWindowIdRef.current || 'system';
        ipcManager.publish(channel, type, payload, sender);
    }, []);

    // Pub/Sub: Subscribe to a channel
    const subscribe = useCallback((channel: string, handler: IPCMessageHandler): IPCSubscription => {
        return ipcManager.subscribe(channel, handler);
    }, []);

    // Direct: Send message to a specific window
    const sendToWindow = useCallback((targetWindowId: string, type: string, payload: unknown) => {
        const sender = currentWindowIdRef.current || 'system';
        ipcManager.sendToWindow(targetWindowId, type, payload, sender);
    }, []);

    // Direct: Subscribe to direct messages for current window
    const onDirectMessage = useCallback((handler: IPCMessageHandler): IPCSubscription => {
        const windowId = currentWindowIdRef.current;
        if (!windowId) {
            console.warn('IPC: Cannot subscribe to direct messages without window ID');
            return { channel: 'direct', unsubscribe: () => { } };
        }
        return ipcManager.onDirectMessage(windowId, handler);
    }, []);

    // Services: Register a service
    const registerService = useCallback((name: string, methods: Record<string, IPCServiceMethod>) => {
        const windowId = currentWindowIdRef.current || 'system';
        ipcManager.registerService(name, methods, windowId);
    }, []);

    // Services: Unregister a service
    const unregisterService = useCallback((name: string) => {
        ipcManager.unregisterService(name);
    }, []);

    // Services: Call a service method
    const callService = useCallback(<T = unknown>(
        serviceName: string,
        methodName: string,
        ...args: unknown[]
    ): Promise<T> => {
        return ipcManager.callService<T>(serviceName, methodName, ...args);
    }, []);

    // Services: Get list of services
    const getServices = useCallback((): string[] => {
        return ipcManager.getServices();
    }, []);

    // Services: Get methods on a service
    const getServiceMethods = useCallback((serviceName: string): string[] => {
        return ipcManager.getServiceMethods(serviceName);
    }, []);

    // Request/Response: Send request
    const request = useCallback(<T = unknown>(
        channel: string,
        type: string,
        payload: unknown,
        timeout?: number
    ): Promise<T> => {
        const sender = currentWindowIdRef.current || 'system';
        return ipcManager.request<T>(channel, type, payload, sender, timeout);
    }, []);

    // Request/Response: Send response
    const respond = useCallback((originalMessage: IPCMessage, payload: unknown) => {
        const sender = currentWindowIdRef.current || 'system';
        ipcManager.respond(originalMessage, payload, sender);
    }, []);

    // Diagnostics: Get channels
    const getChannels = useCallback(() => {
        return ipcManager.getChannels();
    }, []);

    // Diagnostics: Get message history
    const getMessageHistory = useCallback(() => {
        return ipcManager.getMessageHistory();
    }, []);

    const value = useMemo<IPCContextType>(() => ({
        publish,
        subscribe,
        sendToWindow,
        onDirectMessage,
        registerService,
        unregisterService,
        callService,
        getServices,
        getServiceMethods,
        request,
        respond,
        getChannels,
        getMessageHistory,
        currentWindowId: currentWindowIdRef.current,
    }), [
        publish,
        subscribe,
        sendToWindow,
        onDirectMessage,
        registerService,
        unregisterService,
        callService,
        getServices,
        getServiceMethods,
        request,
        respond,
        getChannels,
        getMessageHistory,
    ]);

    return React.createElement(IPCContext.Provider, { value }, children);
};

/**
 * Hook to access the IPC context
 */
export const useIPC = (): IPCContextType => {
    const context = useContext(IPCContext);
    if (!context) {
        throw new Error('useIPC must be used within IPCContextProvider');
    }
    return context;
};

/**
 * Hook to subscribe to a channel with automatic cleanup
 * @param channel - Channel to subscribe to
 * @param handler - Message handler
 * @param deps - Dependencies array (handler will be recreated if deps change)
 */
export const useChannel = (
    channel: string,
    handler: IPCMessageHandler,
    deps: React.DependencyList = []
): void => {
    const handlerRef = useRef(handler);

    // Update handler ref when handler changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler, ...deps]);

    useEffect(() => {
        const subscription = ipcManager.subscribe(channel, (message) => {
            handlerRef.current(message);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [channel]);
};

/**
 * Hook to register a service with automatic cleanup
 * @param name - Service name
 * @param methods - Service methods
 * @param windowId - Window ID registering the service
 * @param deps - Dependencies array
 */
export const useService = (
    name: string,
    methods: Record<string, IPCServiceMethod>,
    windowId: string,
    deps: React.DependencyList = []
): void => {
    useEffect(() => {
        ipcManager.registerService(name, methods, windowId);

        return () => {
            ipcManager.unregisterService(name);
        };
    }, [name, windowId, ...deps]);
};

/**
 * Hook to subscribe to direct messages with automatic cleanup
 * @param windowId - Window ID to listen for
 * @param handler - Message handler
 */
export const useDirectMessages = (
    windowId: string,
    handler: IPCMessageHandler
): void => {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const subscription = ipcManager.onDirectMessage(windowId, (message) => {
            handlerRef.current(message);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [windowId]);
};

/**
 * Create a scoped IPC context for a specific window
 * This is used by WindowManager to pass window-specific IPC to programs
 */
export const createWindowIPC = (windowId: string): IPCContextType => {
    return {
        publish: (channel, type, payload) => {
            ipcManager.publish(channel, type, payload, windowId);
        },
        subscribe: (channel, handler) => {
            return ipcManager.subscribe(channel, handler);
        },
        sendToWindow: (targetWindowId, type, payload) => {
            ipcManager.sendToWindow(targetWindowId, type, payload, windowId);
        },
        onDirectMessage: (handler) => {
            return ipcManager.onDirectMessage(windowId, handler);
        },
        registerService: (name, methods) => {
            ipcManager.registerService(name, methods, windowId);
        },
        unregisterService: (name) => {
            ipcManager.unregisterService(name);
        },
        callService: <T = unknown>(serviceName: string, methodName: string, ...args: unknown[]) => {
            return ipcManager.callService<T>(serviceName, methodName, ...args);
        },
        getServices: () => ipcManager.getServices(),
        getServiceMethods: (serviceName) => ipcManager.getServiceMethods(serviceName),
        request: <T = unknown>(channel: string, type: string, payload: unknown, timeout?: number) => {
            return ipcManager.request<T>(channel, type, payload, windowId, timeout);
        },
        respond: (originalMessage, payload) => {
            ipcManager.respond(originalMessage, payload, windowId);
        },
        getChannels: () => ipcManager.getChannels(),
        getMessageHistory: () => ipcManager.getMessageHistory(),
        currentWindowId: windowId,
    };
};

/**
 * Cleanup IPC resources for a window
 * Called by WindowManager when a window is closed
 */
export const cleanupWindowIPC = (windowId: string): void => {
    ipcManager.cleanupWindow(windowId);
};
