import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * StateManager handles persistent storage of program states
 * States are saved to ~/.ashigaru-state/{program-id}.json
 */
export class StateManager {
    private stateDir: string;

    constructor() {
        this.stateDir = path.join(os.homedir(), '.ashigaru-state');
        this.ensureStateDirectory();
    }

    /**
     * Ensure the state directory exists
     */
    private ensureStateDirectory(): void {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }

    /**
     * Get the file path for a program's state
     */
    private getStatePath(programId: string): string {
        return path.join(this.stateDir, `${programId}.json`);
    }

    /**
     * Save state for a program
     * @param programId Unique program identifier
     * @param state State object to save
     */
    saveState(programId: string, state: unknown): void {
        try {
            const statePath = this.getStatePath(programId);
            const stateData = {
                programId,
                timestamp: new Date().toISOString(),
                state,
            };
            fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2), 'utf-8');
        } catch (error) {
            console.error(`Failed to save state for ${programId}:`, error);
        }
    }

    /**
     * Load state for a program
     * @param programId Unique program identifier
     * @returns Saved state or null if not found
     */
    loadState(programId: string): unknown | null {
        try {
            const statePath = this.getStatePath(programId);
            if (!fs.existsSync(statePath)) {
                return null;
            }

            const content = fs.readFileSync(statePath, 'utf-8');
            const stateData = JSON.parse(content);
            return stateData.state;
        } catch (error) {
            console.error(`Failed to load state for ${programId}:`, error);
            return null;
        }
    }

    /**
     * Clear state for a program
     * @param programId Unique program identifier
     */
    clearState(programId: string): void {
        try {
            const statePath = this.getStatePath(programId);
            if (fs.existsSync(statePath)) {
                fs.unlinkSync(statePath);
            }
        } catch (error) {
            console.error(`Failed to clear state for ${programId}:`, error);
        }
    }

    /**
     * Check if state exists for a program
     * @param programId Unique program identifier
     */
    hasState(programId: string): boolean {
        const statePath = this.getStatePath(programId);
        return fs.existsSync(statePath);
    }

    /**
     * Clear all saved states (useful for cleanup)
     */
    clearAllStates(): void {
        try {
            if (fs.existsSync(this.stateDir)) {
                const files = fs.readdirSync(this.stateDir);
                files.forEach(file => {
                    fs.unlinkSync(path.join(this.stateDir, file));
                });
            }
        } catch (error) {
            console.error('Failed to clear all states:', error);
        }
    }

    /**
     * Get list of programs with saved states
     */
    getSavedPrograms(): string[] {
        try {
            if (!fs.existsSync(this.stateDir)) {
                return [];
            }

            const files = fs.readdirSync(this.stateDir);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            console.error('Failed to get saved programs:', error);
            return [];
        }
    }
}

export const stateManager = new StateManager();
