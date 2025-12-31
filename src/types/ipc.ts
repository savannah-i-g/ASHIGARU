/**
 * IPC (Inter-Process Communication) Types
 * Defines interfaces for program-to-program communication
 */

/**
 * IPC Message structure for pub/sub and direct messaging
 */
export interface IPCMessage {
    /** Unique message ID */
    id: string;
    /** Channel the message was published to (or 'direct' for window-to-window) */
    channel: string;
    /** Message type/action identifier */
    type: string;
    /** Message payload data */
    payload: unknown;
    /** Timestamp when message was created */
    timestamp: number;
    /** Sender identifier (program ID or window ID) */
    sender: string;
    /** Target window ID for direct messages (undefined for channel broadcasts) */
    targetWindowId?: string;
    /** Whether this message expects a response */
    expectsResponse?: boolean;
    /** Correlation ID for request/response matching */
    correlationId?: string;
}

/**
 * Handler function for IPC messages
 */
export type IPCMessageHandler = (message: IPCMessage) => void | Promise<void>;

/**
 * Subscription handle returned when subscribing to a channel
 */
export interface IPCSubscription {
    /** Channel subscribed to */
    channel: string;
    /** Function to unsubscribe */
    unsubscribe: () => void;
}

/**
 * Service method definition
 */
export type IPCServiceMethod = (...args: unknown[]) => Promise<unknown> | unknown;

/**
 * Service definition for RPC-style calls
 */
export interface IPCService {
    /** Service name */
    name: string;
    /** Provider window ID */
    windowId: string;
    /** Available methods */
    methods: Record<string, IPCServiceMethod>;
}

/**
 * Pending request tracking for request/response pattern
 */
export interface IPCPendingRequest {
    /** Request ID (correlation ID) */
    id: string;
    /** Resolve function for the promise */
    resolve: (value: unknown) => void;
    /** Reject function for the promise */
    reject: (error: Error) => void;
    /** Timeout handle */
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * IPC Context interface exposed via useIPC hook
 */
export interface IPCContextType {
    // ==================
    // Pub/Sub Messaging
    // ==================

    /**
     * Publish a message to a channel
     * @param channel - Channel name (e.g., 'system.stats', 'myapp.events')
     * @param type - Message type/action
     * @param payload - Message data
     */
    publish: (channel: string, type: string, payload: unknown) => void;

    /**
     * Subscribe to messages on a channel
     * @param channel - Channel name (supports wildcards like 'system.*')
     * @param handler - Function to handle received messages
     * @returns Subscription handle with unsubscribe method
     */
    subscribe: (channel: string, handler: IPCMessageHandler) => IPCSubscription;

    // =======================
    // Direct Window Messaging
    // =======================

    /**
     * Send a direct message to a specific window
     * @param targetWindowId - Target window ID
     * @param type - Message type/action
     * @param payload - Message data
     */
    sendToWindow: (targetWindowId: string, type: string, payload: unknown) => void;

    /**
     * Subscribe to direct messages sent to this window
     * @param handler - Function to handle direct messages
     * @returns Subscription handle with unsubscribe method
     */
    onDirectMessage: (handler: IPCMessageHandler) => IPCSubscription;

    // ================
    // Service Registry
    // ================

    /**
     * Register a service with callable methods
     * @param name - Service name (must be unique)
     * @param methods - Object mapping method names to functions
     */
    registerService: (name: string, methods: Record<string, IPCServiceMethod>) => void;

    /**
     * Unregister a previously registered service
     * @param name - Service name
     */
    unregisterService: (name: string) => void;

    /**
     * Call a method on a registered service
     * @param serviceName - Name of the service
     * @param methodName - Name of the method to call
     * @param args - Arguments to pass to the method
     * @returns Promise resolving to the method's return value
     */
    callService: <T = unknown>(serviceName: string, methodName: string, ...args: unknown[]) => Promise<T>;

    /**
     * Get list of all registered service names
     */
    getServices: () => string[];

    /**
     * Get methods available on a service
     * @param serviceName - Name of the service
     */
    getServiceMethods: (serviceName: string) => string[];

    // ====================
    // Request/Response
    // ====================

    /**
     * Send a request to a channel and wait for a response
     * @param channel - Channel to send request to
     * @param type - Request type
     * @param payload - Request data
     * @param timeout - Timeout in milliseconds (default: 5000)
     * @returns Promise resolving to the response payload
     */
    request: <T = unknown>(channel: string, type: string, payload: unknown, timeout?: number) => Promise<T>;

    /**
     * Send a response to a request message
     * @param originalMessage - The request message being responded to
     * @param payload - Response data
     */
    respond: (originalMessage: IPCMessage, payload: unknown) => void;

    // ===========
    // Diagnostics
    // ===========

    /**
     * Get list of active channels with subscriber counts
     */
    getChannels: () => Array<{ channel: string; subscribers: number }>;

    /**
     * Get recent message history (for debugging)
     */
    getMessageHistory: () => IPCMessage[];

    /**
     * Current window ID (set by WindowManager)
     */
    currentWindowId: string | null;
}

/**
 * Props that programs receive for IPC access
 */
export interface IPCProgramProps {
    /** IPC context for inter-program communication */
    ipc?: IPCContextType;
    /** Current window ID */
    windowId?: string;
}
