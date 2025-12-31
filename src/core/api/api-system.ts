/**
 * System API
 * Provides system information, events, and lifecycle management
 */

import os from 'os';
import type { SystemAPI, SystemStats } from './types.js';
import type { IPCContextType } from '../../types/ipc.js';

/**
 * Create a System API instance
 */
export const createSystemAPI = (
    windowId: string,
    ipc: IPCContextType
): SystemAPI => {
    return {
        getStats(): SystemStats {
            const cpus = os.cpus();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;

            return {
                hostname: os.hostname(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                uptime: os.uptime(),
                totalMemory: totalMem,
                freeMemory: freeMem,
                usedMemory: usedMem,
                memoryPercent: Math.round((usedMem / totalMem) * 100),
                cpuCount: cpus.length,
                cpuModel: cpus[0]?.model || 'Unknown',
                loadAverage: os.loadavg(),
            };
        },

        getHostname(): string {
            return os.hostname();
        },

        getPlatform(): string {
            return os.platform();
        },

        getArch(): string {
            return os.arch();
        },

        getUptime(): number {
            return os.uptime();
        },

        onEvent(event: string, handler: (data: unknown) => void): () => void {
            const subscription = ipc.subscribe(`system.${event}`, (message) => {
                handler(message.payload);
            });
            return () => subscription.unsubscribe();
        },

        emit(event: string, data: unknown): void {
            ipc.publish(`system.${event}`, 'emit', data);
        },
    };
};
