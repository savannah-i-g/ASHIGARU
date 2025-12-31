/**
 * Storage API
 * Provides persistent key-value storage per program
 * Uses file-based storage in ~/.ashigaru-data/{programId}/
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { StorageAPI } from './types.js';

const DATA_DIR = path.join(os.homedir(), '.ashigaru-data');

/**
 * Ensure the data directory exists for a program
 */
const ensureDataDir = (programId: string): string => {
    const programDir = path.join(DATA_DIR, programId);
    if (!fs.existsSync(programDir)) {
        fs.mkdirSync(programDir, { recursive: true });
    }
    return programDir;
};

/**
 * Get the file path for a key
 */
const getKeyPath = (programId: string, key: string): string => {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(ensureDataDir(programId), `${safeKey}.json`);
};

/**
 * Create a Storage API instance for a specific program
 */
export const createStorageAPI = (programId: string): StorageAPI => {
    return {
        async get<T = unknown>(key: string): Promise<T | null> {
            try {
                const filePath = getKeyPath(programId, key);
                if (!fs.existsSync(filePath)) {
                    return null;
                }
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                return data.value as T;
            } catch {
                return null;
            }
        },

        async set<T = unknown>(key: string, value: T): Promise<void> {
            try {
                const filePath = getKeyPath(programId, key);
                const data = {
                    key,
                    value,
                    updatedAt: new Date().toISOString(),
                };
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            } catch (error) {
                console.error(`Storage API: Failed to set ${key}:`, error);
            }
        },

        async delete(key: string): Promise<void> {
            try {
                const filePath = getKeyPath(programId, key);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                console.error(`Storage API: Failed to delete ${key}:`, error);
            }
        },

        async list(): Promise<string[]> {
            try {
                const programDir = ensureDataDir(programId);
                const files = fs.readdirSync(programDir);
                return files
                    .filter((f) => f.endsWith('.json'))
                    .map((f) => f.replace('.json', ''));
            } catch {
                return [];
            }
        },

        async clear(): Promise<void> {
            try {
                const programDir = ensureDataDir(programId);
                const files = fs.readdirSync(programDir);
                files.forEach((file) => {
                    fs.unlinkSync(path.join(programDir, file));
                });
            } catch (error) {
                console.error(`Storage API: Failed to clear:`, error);
            }
        },

        async has(key: string): Promise<boolean> {
            const filePath = getKeyPath(programId, key);
            return fs.existsSync(filePath);
        },
    };
};
