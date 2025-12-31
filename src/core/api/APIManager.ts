/**
 * API Manager
 * Central manager that creates scoped API instances for each window
 */

import type { ProgramAPI, APICreationContext, APIContextType } from './types.js';
import { createSystemAPI } from './api-system.js';
import { createStorageAPI } from './api-storage.js';
import { createNotificationsAPI } from './api-notifications.js';
import { createWindowsAPI } from './api-windows.js';
import { createSoundAPI } from './api-sound.js';
import { createAIAPI } from './api-ai.js';

/**
 * API Manager - creates and manages API instances for windows
 */
export class APIManager {
    private static instance: APIManager;
    private windowAPIs: Map<string, ProgramAPI> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): APIManager {
        if (!APIManager.instance) {
            APIManager.instance = new APIManager();
        }
        return APIManager.instance;
    }

    /**
     * Create a scoped API instance for a specific window
     */
    public createWindowAPI(
        windowId: string,
        programId: string,
        context: APICreationContext
    ): ProgramAPI {
        // Check if we already have an API for this window
        if (this.windowAPIs.has(windowId)) {
            return this.windowAPIs.get(windowId)!;
        }

        // Create all API modules
        const api: ProgramAPI = {
            system: createSystemAPI(windowId, context.ipc),
            storage: createStorageAPI(programId),
            notifications: createNotificationsAPI(windowId, programId, context.ipc),
            windows: createWindowsAPI(windowId, context.ipc, context),
            sound: createSoundAPI(context, context.programPath),
            ai: createAIAPI(context),
            ipc: context.ipc,
        };

        this.windowAPIs.set(windowId, api);
        return api;
    }

    /**
     * Get an existing API instance for a window
     */
    public getWindowAPI(windowId: string): ProgramAPI | undefined {
        return this.windowAPIs.get(windowId);
    }

    /**
     * Cleanup resources for a closed window
     */
    public cleanupWindow(windowId: string): void {
        this.windowAPIs.delete(windowId);
    }

    /**
     * Get count of active window APIs
     */
    public getActiveCount(): number {
        return this.windowAPIs.size;
    }

    /**
     * Reset manager (for testing)
     */
    public reset(): void {
        this.windowAPIs.clear();
    }
}

// Export singleton instance
export const apiManager = APIManager.getInstance();

/**
 * Convenience function to create API context type
 */
export const createAPIContext = (): APIContextType => {
    return {
        createWindowAPI: (windowId: string, programId: string) => {
            throw new Error('APIContext must be initialized with a proper context');
        },
        cleanupWindow: (windowId: string) => {
            apiManager.cleanupWindow(windowId);
        },
    };
};
