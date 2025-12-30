import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box } from 'ink';
import type { ProgramModule, WindowInstance } from '../types/program.js';
import { useSettings } from './SettingsContext.js';
import { stateManager } from './StateManager.js';

interface WindowManagerContextType {
    /** Currently open windows */
    windows: WindowInstance[];

    /** Currently focused window ID */
    focusedWindowId: string | null;

    /** Whether input is locked (program has exclusive input) */
    inputLocked: boolean;

    /** Window states map */
    windowStates: Map<string, unknown>;

    /** Set window state */
    setWindowState: (windowId: string, state: unknown) => void;

    /** Open a new window with the given program */
    openWindow: (program: ProgramModule) => string;

    /** Close a window by ID */
    closeWindow: (windowId: string) => void;

    /** Focus a window by ID */
    focusWindow: (windowId: string) => void;

    /** Cycle focus to next window */
    focusNext: () => void;

    /** Cycle focus to previous window */
    focusPrev: () => void;

    /** Minimize a window */
    minimizeWindow: (windowId: string) => void;

    /** Restore (unminimize) a window */
    restoreWindow: (windowId: string) => void;

    /** Minimize the focused window */
    minimizeFocused: () => void;

    /** Lock input for exclusive program use */
    lockInput: () => void;

    /** Unlock input to allow system shortcuts */
    unlockInput: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

let windowIdCounter = 0;

interface WindowManagerProviderProps {
    children: React.ReactNode;
}

export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({
    children,
}) => {
    const [windows, setWindows] = useState<WindowInstance[]>([]);
    const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);
    const [inputLocked, setInputLocked] = useState(false);
    const [windowStates, setWindowStates] = useState<Map<string, unknown>>(new Map());

    const openWindow = useCallback((program: ProgramModule): string => {
        const windowId = `window-${++windowIdCounter}`;

        // Load saved state if it exists
        const savedState = stateManager.loadState(program.manifest.id);

        const newWindow: WindowInstance = {
            id: windowId,
            program,
            isFocused: true,
            zIndex: windowIdCounter,
            isMinimized: false,
        };

        setWindows((prev) => {
            const updated = prev.map((w) => ({ ...w, isFocused: false }));
            return [...updated, newWindow];
        });

        // Store the saved state for this window
        if (savedState) {
            setWindowStates((prev) => new Map(prev).set(windowId, savedState));
        }

        setFocusedWindowId(windowId);
        return windowId;
    }, []);

    const closeWindow = useCallback((windowId: string) => {
        setWindows((prev) => {
            // Find the window being closed
            const closingWindow = prev.find((w) => w.id === windowId);

            // Clear saved state for this program when explicitly closing
            if (closingWindow) {
                stateManager.clearState(closingWindow.program.manifest.id);
            }

            // Remove window state from map
            setWindowStates((states) => {
                const newStates = new Map(states);
                newStates.delete(windowId);
                return newStates;
            });

            const filtered = prev.filter((w) => w.id !== windowId);

            if (focusedWindowId === windowId && filtered.length > 0) {
                // Focus the next visible window
                const visibleWindows = filtered.filter((w) => !w.isMinimized);
                if (visibleWindows.length > 0) {
                    const nextWindow = visibleWindows[visibleWindows.length - 1];
                    setFocusedWindowId(nextWindow.id);
                    return filtered.map((w) => ({
                        ...w,
                        isFocused: w.id === nextWindow.id,
                    }));
                }
                setFocusedWindowId(null);
            }

            if (filtered.length === 0) {
                setFocusedWindowId(null);
            }

            return filtered;
        });
    }, [focusedWindowId]);

    const focusWindow = useCallback((windowId: string) => {
        setWindows((prev) =>
            prev.map((w) => ({
                ...w,
                isFocused: w.id === windowId,
                isMinimized: w.id === windowId ? false : w.isMinimized, // Restore if focusing
            }))
        );
        setFocusedWindowId(windowId);
    }, []);

    const focusNext = useCallback(() => {
        setWindows((prev) => {
            const visibleWindows = prev.filter((w) => !w.isMinimized);
            if (visibleWindows.length <= 1) return prev;

            const currentIndex = visibleWindows.findIndex((w) => w.id === focusedWindowId);
            const nextIndex = (currentIndex + 1) % visibleWindows.length;
            const nextWindowId = visibleWindows[nextIndex].id;

            setFocusedWindowId(nextWindowId);

            return prev.map((w) => ({
                ...w,
                isFocused: w.id === nextWindowId,
            }));
        });
    }, [focusedWindowId]);

    const focusPrev = useCallback(() => {
        setWindows((prev) => {
            const visibleWindows = prev.filter((w) => !w.isMinimized);
            if (visibleWindows.length <= 1) return prev;

            const currentIndex = visibleWindows.findIndex((w) => w.id === focusedWindowId);
            const prevIndex = currentIndex === 0 ? visibleWindows.length - 1 : currentIndex - 1;
            const prevWindowId = visibleWindows[prevIndex].id;

            setFocusedWindowId(prevWindowId);

            return prev.map((w) => ({
                ...w,
                isFocused: w.id === prevWindowId,
            }));
        });
    }, [focusedWindowId]);

    const minimizeWindow = useCallback((windowId: string) => {
        setWindows((prev) => {
            // Save current state when minimizing
            const windowToMinimize = prev.find((w) => w.id === windowId);
            if (windowToMinimize) {
                const currentState = windowStates.get(windowId);
                if (currentState !== undefined) {
                    stateManager.saveState(windowToMinimize.program.manifest.id, currentState);
                }
            }

            const updated = prev.map((w) => ({
                ...w,
                isMinimized: w.id === windowId ? true : w.isMinimized,
                isFocused: w.id === windowId ? false : w.isFocused,
            }));

            // Focus next visible window if we minimized the focused one
            if (focusedWindowId === windowId) {
                const visibleWindows = updated.filter((w) => !w.isMinimized);
                if (visibleWindows.length > 0) {
                    const nextWindow = visibleWindows[visibleWindows.length - 1];
                    setFocusedWindowId(nextWindow.id);
                    return updated.map((w) => ({
                        ...w,
                        isFocused: w.id === nextWindow.id,
                    }));
                }
                setFocusedWindowId(null);
            }

            return updated;
        });
    }, [focusedWindowId, windowStates]);

    const restoreWindow = useCallback((windowId: string) => {
        setWindows((prev) =>
            prev.map((w) => ({
                ...w,
                isMinimized: w.id === windowId ? false : w.isMinimized,
                isFocused: w.id === windowId,
            }))
        );
        setFocusedWindowId(windowId);
    }, []);

    const minimizeFocused = useCallback(() => {
        if (focusedWindowId) {
            minimizeWindow(focusedWindowId);
        }
    }, [focusedWindowId, minimizeWindow]);

    const lockInput = useCallback(() => {
        setInputLocked(true);
    }, []);

    const unlockInput = useCallback(() => {
        setInputLocked(false);
    }, []);

    const setWindowState = useCallback((windowId: string, state: unknown) => {
        setWindowStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(windowId, state);
            return newStates;
        });
    }, []);

    const value: WindowManagerContextType = {
        windows,
        focusedWindowId,
        inputLocked,
        windowStates,
        setWindowState,
        openWindow,
        closeWindow,
        focusWindow,
        focusNext,
        focusPrev,
        minimizeWindow,
        restoreWindow,
        minimizeFocused,
        lockInput,
        unlockInput,
    };

    return (
        <WindowManagerContext.Provider value={value}>
            {children}
        </WindowManagerContext.Provider>
    );
};

export const useWindowManager = (): WindowManagerContextType => {
    const context = useContext(WindowManagerContext);
    if (!context) {
        throw new Error('useWindowManager must be used within WindowManagerProvider');
    }
    return context;
};

/**
 * Renders all open, non-minimized windows in a tiled layout
 */
export const WindowContainer: React.FC = () => {
    const { windows, windowStates, setWindowState, closeWindow, focusWindow, lockInput, unlockInput } = useWindowManager();
    const { settings, setTheme, setWallpaper, updateSettings, availableWallpapers, getWallpaperContent } = useSettings();

    const visibleWindows = windows.filter((w) => !w.isMinimized);

    if (visibleWindows.length === 0) {
        return null;
    }

    return (
        <Box flexDirection="row" flexGrow={1} width="100%">
            {visibleWindows.map((window) => {
                const { program, id, isFocused } = window;
                const Component = program.component;

                // Get saved state for this window
                const savedState = windowStates.get(id);

                // Create state management callbacks
                const saveState = (state: unknown) => {
                    setWindowState(id, state);
                };

                const clearState = () => {
                    stateManager.clearState(program.manifest.id);
                };

                return (
                    <Box key={id} flexGrow={1} flexBasis={0}>
                        <Component
                            manifest={program.manifest}
                            isFocused={isFocused}
                            onClose={() => closeWindow(id)}
                            onFocus={() => focusWindow(id)}
                            lockInput={lockInput}
                            unlockInput={unlockInput}
                            settings={settings}
                            setTheme={setTheme}
                            setWallpaper={setWallpaper}
                            updateSettings={updateSettings}
                            availableWallpapers={availableWallpapers}
                            getWallpaperContent={getWallpaperContent}
                            savedState={savedState}
                            saveState={saveState}
                            clearState={clearState}
                        />
                    </Box>
                );
            })}
        </Box>
    );
};
