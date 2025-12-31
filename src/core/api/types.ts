/**
 * API System Types
 * Unified interface for all API modules available to programs
 */

import type { IPCContextType } from '../../types/ipc.js';

// ===================
// System API Types
// ===================

export interface SystemStats {
    hostname: string;
    platform: string;
    arch: string;
    release: string;
    uptime: number;
    totalMemory: number;
    freeMemory: number;
    usedMemory: number;
    memoryPercent: number;
    cpuCount: number;
    cpuModel: string;
    loadAverage: number[];
}

export interface SystemAPI {
    /** Get current system statistics */
    getStats(): SystemStats;
    /** Get hostname */
    getHostname(): string;
    /** Get platform (linux, darwin, win32) */
    getPlatform(): string;
    /** Get CPU architecture */
    getArch(): string;
    /** Get system uptime in seconds */
    getUptime(): number;
    /** Subscribe to system events via IPC */
    onEvent(event: string, handler: (data: unknown) => void): () => void;
    /** Emit a system event */
    emit(event: string, data: unknown): void;
}

// ===================
// Storage API Types
// ===================

export interface StorageAPI {
    /** Get a stored value */
    get<T = unknown>(key: string): Promise<T | null>;
    /** Set a stored value */
    set<T = unknown>(key: string, value: T): Promise<void>;
    /** Delete a stored value */
    delete(key: string): Promise<void>;
    /** List all keys for this program */
    list(): Promise<string[]>;
    /** Clear all program data */
    clear(): Promise<void>;
    /** Check if a key exists */
    has(key: string): Promise<boolean>;
}

// ===================
// Notifications API Types
// ===================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationOptions {
    /** Notification type */
    type?: NotificationType;
    /** Duration in milliseconds (0 = persistent) */
    duration?: number;
    /** Optional title */
    title?: string;
}

export interface NotificationsAPI {
    /** Show a notification */
    show(message: string, options?: NotificationOptions): void;
    /** Show success notification */
    success(message: string, title?: string): void;
    /** Show error notification */
    error(message: string, title?: string): void;
    /** Show warning notification */
    warning(message: string, title?: string): void;
    /** Show info notification */
    info(message: string, title?: string): void;
}

// ===================
// Windows API Types
// ===================

export interface WindowInfo {
    id: string;
    programId: string;
    programName: string;
    isFocused: boolean;
    isMinimized: boolean;
}

export interface WindowsAPI {
    /** Get current window ID */
    getCurrentId(): string;
    /** Open a program by ID */
    openProgram(programId: string): Promise<string | null>;
    /** Close the current window */
    close(): void;
    /** Minimize the current window */
    minimize(): void;
    /** Request focus for the current window */
    focus(): void;
    /** Get list of all open windows */
    list(): WindowInfo[];
    /** Send a direct message to another window */
    sendMessage(windowId: string, type: string, payload: unknown): void;
    /** Listen for direct messages */
    onMessage(handler: (message: { type: string; payload: unknown; sender: string }) => void): () => void;
}

// ===================
// Sound API Types
// ===================

export type SoundType = 'click' | 'hover' | 'success' | 'error' | 'notify' | 'open' | 'close';

export interface SoundAPI {
    /** Play a sound by type */
    play(type: SoundType): void;
    /** Play click sound */
    click(): void;
    /** Play hover/focus sound */
    hover(): void;
    /** Play success sound */
    success(): void;
    /** Play error sound */
    error(): void;
    /** Play notification sound */
    notify(): void;
    /** Play a custom sound file from absolute path */
    playFile(absolutePath: string): void;
    /** Play a sound from the program's /sounds directory */
    playCustom(filename: string): void;
    /** Check if sounds are enabled */
    isEnabled(): boolean;
}

// ===================
// AI API Types
// ===================

export interface AIAPI {
    /** Send a prompt and get a response */
    ask(prompt: string): Promise<string>;
    /** Stream a response */
    stream(prompt: string, onChunk: (text: string) => void): Promise<void>;
    /** Set the system prompt for context */
    setSystemPrompt(prompt: string): void;
    /** Get current system prompt */
    getSystemPrompt(): string;
    /** Check if AI is available and configured */
    isAvailable(): boolean;
    /** Get current provider name */
    getProvider(): string;
    /** Clear conversation history */
    clearHistory(): void;
}

// ===================
// Combined API Interface
// ===================

export interface ProgramAPI {
    /** System information and events */
    system: SystemAPI;
    /** Persistent storage for this program */
    storage: StorageAPI;
    /** User notifications */
    notifications: NotificationsAPI;
    /** Window management */
    windows: WindowsAPI;
    /** Audio feedback */
    sound: SoundAPI;
    /** AI/LLM capabilities */
    ai: AIAPI;
    /** Raw IPC access for advanced use */
    ipc: IPCContextType;
}

// ===================
// API Context Types
// ===================

export interface APIContextType {
    /** Create a scoped API instance for a window */
    createWindowAPI(windowId: string, programId: string): ProgramAPI;
    /** Cleanup resources for a closed window */
    cleanupWindow(windowId: string): void;
}

// ===================
// API Creation Context
// ===================

export interface APICreationContext {
    /** IPC context for messaging */
    ipc: IPCContextType;
    /** Function to get current settings */
    getSettings: () => { sounds: boolean; theme?: string; animations?: boolean;[key: string]: unknown };
    /** Function to open a program */
    openProgram?: (programId: string) => Promise<string | null>;
    /** Function to close a window */
    closeWindow?: (windowId: string) => void;
    /** Function to minimize a window */
    minimizeWindow?: (windowId: string) => void;
    /** Function to focus a window */
    focusWindow?: (windowId: string) => void;
    /** Function to get window list */
    getWindows?: () => WindowInfo[];
    /** Program directory path (for custom sounds) */
    programPath?: string;
    /** AI context for LLM access */
    ai?: {
        sendMessage: (prompt: string, stream?: boolean) => Promise<string>;
        streamMessage?: (prompt: string, onChunk: (text: string) => void) => Promise<void>;
        setSystemPrompt: (prompt: string) => void;
        systemPrompt: string;
        isAvailable: boolean;
        providerName: string;
        clearHistory: () => void;
    };
}
