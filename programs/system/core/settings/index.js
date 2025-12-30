import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import os from 'os';

const h = React.createElement;

const SETTINGS_PATH = path.join(os.homedir(), '.cypher-tui-settings.json');
const WALLPAPERS_DIR = path.join(process.cwd(), 'wallpapers');

const themes = [
    { name: 'Cyberpunk', accent: '#00ffff', desc: 'Cyan/Magenta on black' },
    { name: 'Mono', accent: '#ffffff', desc: 'White/Gray on black' },
    { name: 'Matrix', accent: '#00ff00', desc: 'Green on black' },
    { name: 'Amber', accent: '#ffaa00', desc: 'Orange on brown' },
];

const wallpaperColors = [
    { id: 'muted', name: 'Muted', color: '#888888', desc: 'Default muted grey' },
    { id: 'white', name: 'White', color: '#ffffff', desc: 'Bright white' },
    { id: 'accent', name: 'Accent', color: '#00ffff', desc: 'Theme accent color' },
    { id: 'secondary', name: 'Secondary', color: '#ff00ff', desc: 'Theme secondary color' },
    { id: 'dim', name: 'Dim', color: '#555555', desc: 'Very dim/subtle' },
    { id: 'success', name: 'Success', color: '#00ff88', desc: 'Green success color' },
    { id: 'warning', name: 'Warning', color: '#ffaa00', desc: 'Orange warning color' },
    { id: 'error', name: 'Error', color: '#ff4444', desc: 'Red error color' },
];

const loadWallpapers = () => {
    try {
        if (fs.existsSync(WALLPAPERS_DIR)) {
            return fs.readdirSync(WALLPAPERS_DIR)
                .filter(f => f.endsWith('.txt'))
                .map(f => f.replace('.txt', ''));
        }
    } catch { }
    return ['ashigaru'];
};

const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
        }
    } catch { }
    return { theme: 'Cyberpunk', animations: true, sounds: false, wallpaper: 'ashigaru', wallpaperColor: 'muted' };
};

const saveSettings = (settings) => {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch {
        return false;
    }
};

const Program = ({ isFocused, settings: contextSettings, setTheme: contextSetTheme, setWallpaper: contextSetWallpaper, updateSettings: contextUpdateSettings, availableWallpapers: contextWallpapers }) => {
    const [localSettings, setLocalSettings] = useState(loadSettings);
    const settings = contextSettings || localSettings;
    const [selected, setSelected] = useState(0);
    const [saved, setSaved] = useState(false);
    const [section, setSection] = useState('theme'); // theme, wallpaper, wpcolor, options
    const [wallpapers, setWallpapers] = useState(() => contextWallpapers || loadWallpapers());

    const themeIndex = themes.findIndex((t) => t.name === settings.theme);
    const currentTheme = themes[themeIndex >= 0 ? themeIndex : 0];

    const options = [
        { id: 'animations', label: 'Animations', value: settings.animations },
        { id: 'sounds', label: 'Sound Effects', value: settings.sounds },
    ];

    useEffect(() => {
        if (contextWallpapers) setWallpapers(contextWallpapers);
    }, [contextWallpapers]);

    useEffect(() => {
        if (!contextWallpapers) {
            const interval = setInterval(() => setWallpapers(loadWallpapers()), 3000);
            return () => clearInterval(interval);
        }
    }, [contextWallpapers]);

    const handleSave = (newSettings) => {
        if (contextUpdateSettings) {
            contextUpdateSettings(newSettings);
        } else {
            saveSettings(newSettings);
            setLocalSettings(newSettings);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleThemeChange = (themeName) => {
        if (contextSetTheme) contextSetTheme(themeName);
        else handleSave({ ...settings, theme: themeName });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleWallpaperChange = (wallpaperName) => {
        if (contextSetWallpaper) contextSetWallpaper(wallpaperName);
        else handleSave({ ...settings, wallpaper: wallpaperName });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleWallpaperColorChange = (colorId) => {
        handleSave({ ...settings, wallpaperColor: colorId });
    };

    useInput((input, key) => {
        if (!isFocused) return;

        if (key.tab) {
            const sections = ['theme', 'wallpaper', 'wpcolor', 'options'];
            const idx = sections.indexOf(section);
            setSection(sections[(idx + 1) % sections.length]);
            setSelected(0);
            return;
        }

        if (section === 'theme') {
            if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
            if (key.downArrow) setSelected((i) => Math.min(themes.length - 1, i + 1));
            if (key.return || input === ' ') handleThemeChange(themes[selected].name);
        } else if (section === 'wallpaper') {
            if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
            if (key.downArrow) setSelected((i) => Math.min(wallpapers.length - 1, i + 1));
            if (key.return || input === ' ') handleWallpaperChange(wallpapers[selected]);
        } else if (section === 'wpcolor') {
            if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
            if (key.downArrow) setSelected((i) => Math.min(wallpaperColors.length - 1, i + 1));
            if (key.return || input === ' ') handleWallpaperColorChange(wallpaperColors[selected].id);
        } else {
            if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
            if (key.downArrow) setSelected((i) => Math.min(options.length - 1, i + 1));
            if (key.return || input === ' ') {
                const opt = options[selected];
                handleSave({ ...settings, [opt.id]: !opt.value });
            }
        }
    }, { isActive: isFocused });

    const accent = currentTheme.accent;
    const borderColor = isFocused ? accent : '#333333';

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: accent, bold: true }, 'SETTINGS'),
            saved ? h(Text, { color: '#00ff88' }, 'Saved!') : h(Text, { color: '#555555' }, '--[x]')
        ),

        // Section tabs
        h(Box, { paddingX: 1, flexWrap: 'wrap' },
            h(Text, { color: section === 'theme' ? accent : '#555555', bold: section === 'theme' },
                section === 'theme' ? '[THEME]' : ' THEME '
            ),
            h(Text, null, ' '),
            h(Text, { color: section === 'wallpaper' ? accent : '#555555', bold: section === 'wallpaper' },
                section === 'wallpaper' ? '[PAPER]' : ' PAPER '
            ),
            h(Text, null, ' '),
            h(Text, { color: section === 'wpcolor' ? accent : '#555555', bold: section === 'wpcolor' },
                section === 'wpcolor' ? '[COLOR]' : ' COLOR '
            ),
            h(Text, null, ' '),
            h(Text, { color: section === 'options' ? accent : '#555555', bold: section === 'options' },
                section === 'options' ? '[OPTIONS]' : ' OPTIONS '
            )
        ),

        h(Box, { paddingX: 1 },
            h(Text, { color: '#333333' }, '─'.repeat(50))
        ),

        // Content
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },
            section === 'theme' ? (
                themes.map((theme, i) => {
                    const isSel = i === selected;
                    const isActive = theme.name === settings.theme;
                    return h(Box, { key: theme.name },
                        h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                        h(Text, { color: isActive ? '#00ff88' : (isSel ? '#ffffff' : '#888888') },
                            isActive ? '[*] ' : '[ ] '
                        ),
                        h(Box, { width: 12 },
                            h(Text, { color: theme.accent, bold: isSel }, theme.name)
                        ),
                        h(Text, { color: '#555555' }, theme.desc)
                    );
                })
            ) : section === 'wallpaper' ? (
                wallpapers.length === 0 ?
                    h(Text, { color: '#555555' }, 'No wallpapers found') :
                    wallpapers.map((wp, i) => {
                        const isSel = i === selected;
                        const isActive = wp === settings.wallpaper;
                        return h(Box, { key: wp },
                            h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                            h(Text, { color: isActive ? '#00ff88' : (isSel ? '#ffffff' : '#888888') },
                                isActive ? '[*] ' : '[ ] '
                            ),
                            h(Text, { color: isSel ? '#ffffff' : '#888888' }, wp + '.txt')
                        );
                    })
            ) : section === 'wpcolor' ? (
                wallpaperColors.map((wc, i) => {
                    const isSel = i === selected;
                    const isActive = wc.id === (settings.wallpaperColor || 'muted');
                    return h(Box, { key: wc.id },
                        h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                        h(Text, { color: isActive ? '#00ff88' : (isSel ? '#ffffff' : '#888888') },
                            isActive ? '[*] ' : '[ ] '
                        ),
                        h(Box, { width: 12 },
                            h(Text, { color: wc.color, bold: isSel }, wc.name)
                        ),
                        h(Text, { color: '#555555' }, wc.desc)
                    );
                })
            ) : (
                options.map((opt, i) => {
                    const isSel = i === selected;
                    return h(Box, { key: opt.id },
                        h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                        h(Box, { width: 16 },
                            h(Text, { color: isSel ? '#ffffff' : '#888888' }, opt.label)
                        ),
                        h(Text, { color: opt.value ? '#00ff88' : '#ff4444' },
                            opt.value ? '[ON]' : '[OFF]'
                        )
                    );
                })
            )
        ),

        // Theme preview
        section === 'theme' && h(Box, { paddingX: 1, marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: themes[selected].accent, paddingX: 1 },
                h(Text, { color: themes[selected].accent }, 'Preview: '),
                h(Text, { color: '#ffffff' }, 'primary '),
                h(Text, { color: '#888888' }, 'secondary')
            )
        ),

        // Color preview
        section === 'wpcolor' && h(Box, { paddingX: 1, marginBottom: 1 },
            h(Text, { color: wallpaperColors[selected].color }, '██████ Sample Text ██████')
        ),

        // Footer
        h(Box, {
            paddingX: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: '#555555' }, '[tab] section  [arrows] navigate  [space] select')
        )
    );
};

export default Program;
