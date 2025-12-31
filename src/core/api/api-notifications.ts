/**
 * Notifications API
 * Provides user notifications via IPC broadcast
 * Any program can listen on 'system.notification' to display notifications
 */

import type { NotificationsAPI, NotificationOptions, NotificationType } from './types.js';
import type { IPCContextType } from '../../types/ipc.js';

export interface NotificationPayload {
    id: string;
    message: string;
    type: NotificationType;
    title?: string;
    duration: number;
    timestamp: number;
    source: string;
}

let notificationId = 0;

/**
 * Create a Notifications API instance
 */
export const createNotificationsAPI = (
    windowId: string,
    programId: string,
    ipc: IPCContextType
): NotificationsAPI => {
    const createNotification = (
        message: string,
        type: NotificationType,
        title?: string,
        duration: number = 3000
    ): void => {
        const notification: NotificationPayload = {
            id: `notif-${++notificationId}-${Date.now()}`,
            message,
            type,
            title,
            duration,
            timestamp: Date.now(),
            source: programId,
        };

        // Broadcast notification to all programs
        ipc.publish('system.notification', type, notification);
    };

    return {
        show(message: string, options?: NotificationOptions): void {
            createNotification(
                message,
                options?.type || 'info',
                options?.title,
                options?.duration ?? 3000
            );
        },

        success(message: string, title?: string): void {
            createNotification(message, 'success', title);
        },

        error(message: string, title?: string): void {
            createNotification(message, 'error', title);
        },

        warning(message: string, title?: string): void {
            createNotification(message, 'warning', title);
        },

        info(message: string, title?: string): void {
            createNotification(message, 'info', title);
        },
    };
};
