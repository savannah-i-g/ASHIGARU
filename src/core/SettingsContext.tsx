import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Theme, themes, cyberpunkTheme, getThemeByName } from '../theme/themes.js';

interface Settings {
    theme: string;
    animations: boolean;
    sounds: boolean;
    wallpaper: string;
    wallpaperColor: string;
    clockFormat: '12h' | '24h';
    performanceMode: boolean;
    refreshRate: number;
}

interface SettingsContextType {
    settings: Settings;
    theme: Theme;
    updateSettings: (updates: Partial<Settings>) => void;
    setTheme: (themeName: string) => void;
    setWallpaper: (wallpaperName: string) => void;
    availableThemes: Theme[];
    availableWallpapers: string[];
    getWallpaperContent: (name: string) => string[];
}

const defaultSettings: Settings = {
    theme: 'Cyberpunk',
    animations: true,
    sounds: false,
    wallpaper: 'ashigaru',
    wallpaperColor: 'muted',
    clockFormat: '24h',
    performanceMode: false,
    refreshRate: 3000,
};

const SETTINGS_PATH = path.join(os.homedir(), '.cypher-tui-settings.json');
const WALLPAPERS_DIR = path.join(process.cwd(), 'wallpapers');

const loadSettings = (): Settings => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
            return { ...defaultSettings, ...JSON.parse(data) };
        }
    } catch {
        // Ignore errors, use defaults
    }
    return defaultSettings;
};

const saveSettings = (settings: Settings): void => {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch {
        // Ignore save errors
    }
};

const loadAvailableWallpapers = (): string[] => {
    try {
        if (fs.existsSync(WALLPAPERS_DIR)) {
            return fs.readdirSync(WALLPAPERS_DIR)
                .filter(f => f.endsWith('.txt'))
                .map(f => f.replace('.txt', ''));
        }
    } catch { }
    return ['ashigaru'];
};

const loadWallpaperContent = (name: string): string[] => {
    try {
        const filePath = path.join(WALLPAPERS_DIR, `${name}.txt`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8').split('\n');
        }
    } catch { }
    // Default ASHIGARU logo
    return [
        '█▀█ █▀▀ █ █ █ █▀▀ █▀█ █▀█ █ █',
        '█▀█ ▀▀█ █▀█ █ █ █ █▀█ █▀▄ █ █',
        '▀ ▀ ▀▀▀ ▀ ▀ ▀ ▀▀▀ ▀ ▀ ▀ ▀ ▀▀▀',
    ];
};

const SettingsContext = createContext<SettingsContextType | null>(null);

interface SettingsProviderProps {
    children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(loadSettings);
    const [theme, setThemeState] = useState<Theme>(getThemeByName(settings.theme));
    const [availableWallpapers, setAvailableWallpapers] = useState<string[]>(loadAvailableWallpapers);

    const updateSettings = useCallback((updates: Partial<Settings>) => {
        setSettings((prev) => {
            const newSettings = { ...prev, ...updates };
            saveSettings(newSettings);
            return newSettings;
        });
    }, []);

    const setTheme = useCallback((themeName: string) => {
        const newTheme = getThemeByName(themeName);
        setThemeState(newTheme);
        updateSettings({ theme: themeName });
    }, [updateSettings]);

    const setWallpaper = useCallback((wallpaperName: string) => {
        updateSettings({ wallpaper: wallpaperName });
    }, [updateSettings]);

    const getWallpaperContent = useCallback((name: string): string[] => {
        return loadWallpaperContent(name);
    }, []);

    // Sync theme when settings change
    useEffect(() => {
        setThemeState(getThemeByName(settings.theme));
    }, [settings.theme]);

    // Refresh wallpapers list periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setAvailableWallpapers(loadAvailableWallpapers());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const value: SettingsContextType = {
        settings,
        theme,
        updateSettings,
        setTheme,
        setWallpaper,
        availableThemes: themes,
        availableWallpapers,
        getWallpaperContent,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};
