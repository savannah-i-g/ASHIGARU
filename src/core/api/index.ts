/**
 * API Module Exports
 * Central export point for the API system
 */

// Types
export type {
    SystemStats,
    SystemAPI,
    StorageAPI,
    NotificationType,
    NotificationOptions,
    NotificationsAPI,
    WindowInfo,
    WindowsAPI,
    SoundType,
    SoundAPI,
    AIAPI,
    ProgramAPI,
    APIContextType,
    APICreationContext,
} from './types.js';

// API Creators
export { createSystemAPI } from './api-system.js';
export { createStorageAPI } from './api-storage.js';
export { createNotificationsAPI, type NotificationPayload } from './api-notifications.js';
export { createWindowsAPI } from './api-windows.js';
export { createSoundAPI } from './api-sound.js';
export { createAIAPI } from './api-ai.js';

// Manager
export { APIManager, apiManager, createAPIContext } from './APIManager.js';
