/**
 * Windows API
 * Provides window management operations
 */

import type { WindowsAPI, WindowInfo, APICreationContext } from './types.js';
import type { IPCContextType } from '../../types/ipc.js';

/**
 * Create a Windows API instance
 */
export const createWindowsAPI = (
    windowId: string,
    ipc: IPCContextType,
    context: APICreationContext
): WindowsAPI => {
    return {
        getCurrentId(): string {
            return windowId;
        },

        async openProgram(programId: string): Promise<string | null> {
            if (context.openProgram) {
                return context.openProgram(programId);
            }
            // Fallback: request via IPC (requires a handler)
            try {
                const result = await ipc.request<{ windowId: string | null }>(
                    'system.windows',
                    'open',
                    { programId },
                    5000
                );
                return result?.windowId ?? null;
            } catch {
                return null;
            }
        },

        close(): void {
            if (context.closeWindow) {
                context.closeWindow(windowId);
            } else {
                ipc.publish('system.windows', 'close', { windowId });
            }
        },

        minimize(): void {
            if (context.minimizeWindow) {
                context.minimizeWindow(windowId);
            } else {
                ipc.publish('system.windows', 'minimize', { windowId });
            }
        },

        focus(): void {
            if (context.focusWindow) {
                context.focusWindow(windowId);
            } else {
                ipc.publish('system.windows', 'focus', { windowId });
            }
        },

        list(): WindowInfo[] {
            if (context.getWindows) {
                return context.getWindows();
            }
            return [];
        },

        sendMessage(targetWindowId: string, type: string, payload: unknown): void {
            ipc.sendToWindow(targetWindowId, type, payload);
        },

        onMessage(handler: (message: { type: string; payload: unknown; sender: string }) => void): () => void {
            const subscription = ipc.onDirectMessage((message) => {
                handler({
                    type: message.type,
                    payload: message.payload,
                    sender: message.sender,
                });
            });
            return () => subscription.unsubscribe();
        },

        isFullScreen(): boolean {
            if (context.getWindows) {
                const windows = context.getWindows();
                const visibleWindows = windows.filter(w => !w.isMinimized);
                return visibleWindows.length === 1 && visibleWindows[0].id === windowId;
            }
            return false;
        },
    };
};
