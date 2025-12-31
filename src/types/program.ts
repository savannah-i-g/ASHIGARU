import React from 'react';
import type { IPCContextType } from './ipc.js';

/**
 * Program manifest schema - defines discoverable program metadata
 */
export interface ProgramManifest {
    /** Unique program identifier (e.g., 'system-info', 'file-browser') */
    id: string;

    /** Display name shown in launcher */
    name: string;

    /** Semantic version string */
    version: string;

    /** Short description of the program */
    description: string;

    /** Program author (optional) */
    author?: string;

    /** ASCII/Unicode icon character (optional) */
    icon?: string;

    /** Category for grouping in launcher (optional) */
    category?: string;

    /** Entry file path relative to manifest */
    entry: string;

    /** Keyboard shortcut to launch (optional) */
    shortcut?: string;
}

/**
 * Props passed to every program component
 */
export interface ProgramProps {
    /** Callback to request program closure */
    onClose: () => void;

    /** Callback to request focus */
    onFocus: () => void;

    /** Whether this program window is currently focused */
    isFocused: boolean;

    /** Program's manifest data */
    manifest: ProgramManifest;

    /** Lock system input (optional - for text input programs) */
    lockInput?: () => void;

    /** Unlock system input (optional - for text input programs) */
    unlockInput?: () => void;

    /** Current settings (optional) */
    settings?: { theme: string; animations: boolean; sounds: boolean; wallpaper: string; wallpaperColor: string };

    /** Set theme callback (optional) */
    setTheme?: (themeName: string) => void;

    /** Set wallpaper callback (optional) */
    setWallpaper?: (wallpaperName: string) => void;

    /** Update settings callback (optional) */
    updateSettings?: (updates: Record<string, unknown>) => void;

    /** Available wallpapers list (optional) */
    availableWallpapers?: string[];

    /** Get wallpaper content callback (optional) */
    getWallpaperContent?: (name: string) => string[];

    /** Previously saved state (optional - for state persistence) */
    savedState?: unknown;

    /** Save current state callback (optional - for state persistence) */
    saveState?: (state: unknown) => void;

    /** Clear saved state callback (optional - for state persistence) */
    clearState?: () => void;

    /** IPC context for inter-program communication (optional) */
    ipc?: IPCContextType;

    /** Current window ID for this program instance (optional) */
    windowId?: string;

    /** Unified API for system features (optional) */
    api?: import('../core/api/types.js').ProgramAPI;
}

/**
 * Loaded program module ready for rendering
 */
export interface ProgramModule {
    /** Parsed manifest data */
    manifest: ProgramManifest;

    /** React component to render */
    component: React.ComponentType<ProgramProps>;

    /** Absolute path to program directory */
    path: string;
}

/**
 * Window instance state for window manager
 */
export interface WindowInstance {
    /** Unique window ID */
    id: string;

    /** Associated program module */
    program: ProgramModule;

    /** Whether window is focused */
    isFocused: boolean;

    /** Window z-index for layering */
    zIndex: number;

    /** Whether window is minimized */
    isMinimized: boolean;

    /** Optional window title override */
    title?: string;
}
