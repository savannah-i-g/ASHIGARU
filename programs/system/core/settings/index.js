import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import fs from 'fs';
import path from 'path';
import os from 'os';

const h = React.createElement;

const SETTINGS_PATH = path.join(os.homedir(), '.cypher-tui-settings.json');
const WALLPAPERS_DIR = path.join(process.cwd(), 'wallpapers');
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

// Load package.json for system info
const loadPackageInfo = () => {
    try {
        if (fs.existsSync(PACKAGE_JSON_PATH)) {
            const data = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
            return {
                name: data.name || 'ASHIGARU',
                version: data.version || '0.0.0',
                description: data.description || 'Terminal UI Framework',
            };
        }
    } catch { }
    return { name: 'ASHIGARU', version: '0.0.0', description: 'Terminal UI Framework' };
};

const packageInfo = loadPackageInfo();

// Theme definitions
const themes = [
    { name: 'Cyberpunk', accent: '#00ffff', secondary: '#ff00ff', desc: 'Cyan/Magenta on black' },
    { name: 'Mono', accent: '#ffffff', secondary: '#888888', desc: 'White/Gray on black' },
    { name: 'Matrix', accent: '#00ff00', secondary: '#88ff00', desc: 'Green on black' },
    { name: 'Amber', accent: '#ffaa00', secondary: '#ff6600', desc: 'Orange on brown' },
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

// Keyboard shortcuts reference
const shortcuts = [
    {
        category: 'Window Controls', items: [
            { key: 'Ctrl+D', action: 'Minimize window' },
            { key: 'Ctrl+W/X', action: 'Close window' },
            { key: 'Tab', action: 'Cycle windows' },
            { key: '`', action: 'Window manager' },
        ]
    },
    {
        category: 'System', items: [
            { key: 'Ctrl+L', action: 'Open launcher' },
            { key: 'Ctrl+Q', action: 'Quit application' },
        ]
    },
    {
        category: 'Navigation', items: [
            { key: 'Tab', action: 'Next section' },
            { key: '↑/↓', action: 'Navigate items' },
            { key: 'Enter/Space', action: 'Select item' },
            { key: 'Esc', action: 'Back/Cancel' },
        ]
    },
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
            const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
            return {
                theme: data.theme || 'Cyberpunk',
                animations: data.animations !== false,
                sounds: data.sounds || false,
                wallpaper: data.wallpaper || 'ashigaru',
                wallpaperColor: data.wallpaperColor || 'muted',
                clockFormat: data.clockFormat || '24h',
                performanceMode: data.performanceMode || false,
                refreshRate: data.refreshRate || 3000,
            };
        }
    } catch { }
    return {
        theme: 'Cyberpunk',
        animations: true,
        sounds: false,
        wallpaper: 'ashigaru',
        wallpaperColor: 'muted',
        clockFormat: '24h',
        performanceMode: false,
        refreshRate: 3000,
    };
};

const saveSettings = (settings) => {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch {
        return false;
    }
};

// Categories for sidebar navigation
const categories = [
    { id: 'display', name: 'Display', icon: '◐' },
    { id: 'audio', name: 'Audio', icon: '♪' },
    { id: 'system', name: 'System', icon: '⚙' },
    { id: 'datetime', name: 'Date & Time', icon: '◷' },
    { id: 'shortcuts', name: 'Shortcuts', icon: '🖰' },
    { id: 'about', name: 'About', icon: 'ℹ' },
];

const Program = ({ isFocused, settings: contextSettings, setTheme: contextSetTheme, setWallpaper: contextSetWallpaper, updateSettings: contextUpdateSettings, availableWallpapers: contextWallpapers }) => {
    const [localSettings, setLocalSettings] = useState(loadSettings);
    const settings = contextSettings || localSettings;
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [itemIndex, setItemIndex] = useState(0);
    const [saved, setSaved] = useState(false);
    const [wallpapers, setWallpapers] = useState(() => contextWallpapers || loadWallpapers());
    const [activePane, setActivePane] = useState('sidebar'); // 'sidebar' or 'content'

    const currentCategory = categories[categoryIndex].id;
    const themeData = themes.find((t) => t.name === settings.theme) || themes[0];
    const accent = themeData.accent;
    const secondary = themeData.secondary;

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
    };

    const handleWallpaperChange = (wallpaperName) => {
        if (contextSetWallpaper) contextSetWallpaper(wallpaperName);
        else handleSave({ ...settings, wallpaper: wallpaperName });
    };

    // Get items for current category
    const getContentItems = () => {
        switch (currentCategory) {
            case 'display':
                return [
                    { type: 'section', label: 'Theme' },
                    ...themes.map(t => ({ type: 'theme', ...t, selected: t.name === settings.theme })),
                    { type: 'section', label: 'Wallpaper' },
                    ...wallpapers.map(wp => ({ type: 'wallpaper', name: wp, selected: wp === settings.wallpaper })),
                    { type: 'section', label: 'Wallpaper Color' },
                    ...wallpaperColors.map(wc => ({ type: 'wpcolor', ...wc, selected: wc.id === (settings.wallpaperColor || 'muted') })),
                ];
            case 'audio':
                return [
                    { type: 'toggle', id: 'sounds', label: 'Sound Effects', desc: 'Play sounds for UI interactions', value: settings.sounds },
                ];
            case 'system':
                return [
                    { type: 'toggle', id: 'animations', label: 'Animations', desc: 'Enable smooth transitions and effects', value: settings.animations },
                    { type: 'toggle', id: 'performanceMode', label: 'Performance Mode', desc: 'Reduce visual effects for better performance', value: settings.performanceMode },
                    { type: 'section', label: 'Refresh Rate' },
                    { type: 'option', id: 'refreshRate', label: '2 seconds', value: 2000, selected: settings.refreshRate === 2000 },
                    { type: 'option', id: 'refreshRate', label: '3 seconds', value: 3000, selected: settings.refreshRate === 3000 },
                    { type: 'option', id: 'refreshRate', label: '5 seconds', value: 5000, selected: settings.refreshRate === 5000 },
                    { type: 'option', id: 'refreshRate', label: '10 seconds', value: 10000, selected: settings.refreshRate === 10000 },
                ];
            case 'datetime':
                return [
                    { type: 'info', label: 'Current Time', value: new Date().toLocaleTimeString([], { hour12: settings.clockFormat === '12h' }) },
                    { type: 'info', label: 'Current Date', value: new Date().toLocaleDateString() },
                    { type: 'info', label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
                    { type: 'section', label: 'Clock Format' },
                    { type: 'option', id: 'clockFormat', label: '24-hour (14:30)', value: '24h', selected: settings.clockFormat === '24h' },
                    { type: 'option', id: 'clockFormat', label: '12-hour (2:30 PM)', value: '12h', selected: settings.clockFormat === '12h' },
                ];
            case 'shortcuts':
                const items = [];
                shortcuts.forEach(cat => {
                    items.push({ type: 'section', label: cat.category });
                    cat.items.forEach(item => {
                        items.push({ type: 'shortcut', key: item.key, action: item.action });
                    });
                });
                return items;
            case 'about':
                return [
                    { type: 'info', label: 'System', value: packageInfo.name.toUpperCase() },
                    { type: 'info', label: 'Version', value: packageInfo.version },
                    { type: 'info', label: 'Description', value: packageInfo.description },
                    { type: 'info', label: 'Node.js', value: process.version },
                    { type: 'info', label: 'Platform', value: `${os.platform()} ${os.arch()}` },
                    { type: 'info', label: 'Hostname', value: os.hostname() },
                    { type: 'section', label: 'Credits' },
                    { type: 'credit', name: 'CYPHER', role: 'Development' },
                ];
            default:
                return [];
        }
    };

    const contentItems = getContentItems();
    const selectableItems = contentItems.filter(item =>
        item.type !== 'section' && item.type !== 'info' && item.type !== 'shortcut' && item.type !== 'credit'
    );

    useInput((input, key) => {
        if (!isFocused) return;

        // Handle pane switching
        if (key.tab) {
            setActivePane(p => p === 'sidebar' ? 'content' : 'sidebar');
            setItemIndex(0);
            return;
        }

        if (activePane === 'sidebar') {
            if (key.upArrow) {
                setCategoryIndex(i => Math.max(0, i - 1));
                setItemIndex(0);
            }
            if (key.downArrow) {
                setCategoryIndex(i => Math.min(categories.length - 1, i + 1));
                setItemIndex(0);
            }
            if (key.return || key.rightArrow) {
                setActivePane('content');
                setItemIndex(0);
            }
        } else {
            if (key.upArrow) {
                setItemIndex(i => Math.max(0, i - 1));
            }
            if (key.downArrow) {
                setItemIndex(i => Math.min(selectableItems.length - 1, i + 1));
            }
            if (key.leftArrow) {
                setActivePane('sidebar');
            }
            if (key.return || input === ' ') {
                const item = selectableItems[itemIndex];
                if (!item) return;

                if (item.type === 'theme') {
                    handleThemeChange(item.name);
                } else if (item.type === 'wallpaper') {
                    handleWallpaperChange(item.name);
                } else if (item.type === 'wpcolor') {
                    handleSave({ ...settings, wallpaperColor: item.id });
                } else if (item.type === 'toggle') {
                    handleSave({ ...settings, [item.id]: !item.value });
                } else if (item.type === 'option') {
                    handleSave({ ...settings, [item.id]: item.value });
                }
            }
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? accent : '#333333';

    // Render sidebar
    const renderSidebar = () => {
        return h(Box, {
            flexDirection: 'column',
            width: 18,
            borderStyle: 'single',
            borderColor: activePane === 'sidebar' ? accent : '#333333',
            borderRight: true,
            borderTop: false,
            borderBottom: false,
            borderLeft: false,
        },
            ...categories.map((cat, i) => {
                const isSelected = i === categoryIndex;
                const isActive = activePane === 'sidebar' && isSelected;
                return h(Box, {
                    key: cat.id,
                    paddingX: 1,
                    backgroundColor: isActive ? '#1a1a1a' : undefined,
                },
                    h(Text, {
                        color: isSelected ? accent : '#666666',
                        bold: isSelected,
                    }, `${isActive ? '▸ ' : '  '}${cat.icon} ${cat.name}`)
                );
            })
        );
    };

    // Render content area
    const renderContent = () => {
        let selectableIdx = -1;

        return h(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1 },
            ...contentItems.map((item, i) => {
                if (item.type === 'section') {
                    return h(Box, { key: `section-${i}`, marginTop: i > 0 ? 1 : 0, marginBottom: 0 },
                        h(Text, { color: secondary, bold: true }, `── ${item.label} ──`)
                    );
                }

                if (item.type === 'info') {
                    return h(Box, { key: `info-${i}` },
                        h(Box, { width: 16 }, h(Text, { color: '#666666' }, item.label)),
                        h(Text, { color: '#ffffff' }, item.value)
                    );
                }

                if (item.type === 'shortcut') {
                    return h(Box, { key: `shortcut-${i}` },
                        h(Box, { width: 16 }, h(Text, { color: accent }, item.key)),
                        h(Text, { color: '#888888' }, item.action)
                    );
                }

                if (item.type === 'credit') {
                    return h(Box, { key: `credit-${i}` },
                        h(Text, { color: accent }, item.name),
                        h(Text, { color: '#666666' }, ` - ${item.role}`)
                    );
                }

                // Selectable items
                selectableIdx++;
                const isSelected = activePane === 'content' && selectableIdx === itemIndex;

                if (item.type === 'theme') {
                    return h(Box, { key: `theme-${item.name}` },
                        h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                        h(Text, { color: item.selected ? '#00ff88' : (isSelected ? '#ffffff' : '#888888') },
                            item.selected ? '[●] ' : '[ ] '
                        ),
                        h(Box, { width: 12 },
                            h(Text, { color: item.accent, bold: isSelected }, item.name)
                        ),
                        h(Text, { color: '#555555' }, item.desc)
                    );
                }

                if (item.type === 'wallpaper') {
                    return h(Box, { key: `wp-${item.name}` },
                        h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                        h(Text, { color: item.selected ? '#00ff88' : (isSelected ? '#ffffff' : '#888888') },
                            item.selected ? '[●] ' : '[ ] '
                        ),
                        h(Text, { color: isSelected ? '#ffffff' : '#888888' }, item.name + '.txt')
                    );
                }

                if (item.type === 'wpcolor') {
                    return h(Box, { key: `wpcolor-${item.id}` },
                        h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                        h(Text, { color: item.selected ? '#00ff88' : (isSelected ? '#ffffff' : '#888888') },
                            item.selected ? '[●] ' : '[ ] '
                        ),
                        h(Box, { width: 12 },
                            h(Text, { color: item.color, bold: isSelected }, item.name)
                        ),
                        h(Text, { color: '#555555' }, item.desc)
                    );
                }

                if (item.type === 'toggle') {
                    return h(Box, { key: `toggle-${item.id}`, flexDirection: 'column' },
                        h(Box, null,
                            h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                            h(Box, { width: 24 },
                                h(Text, { color: isSelected ? '#ffffff' : '#888888' }, item.label)
                            ),
                            h(Text, { color: item.value ? '#00ff88' : '#ff4444', bold: true },
                                item.value ? '[ON]' : '[OFF]'
                            )
                        ),
                        item.desc && h(Box, { paddingLeft: 4 },
                            h(Text, { color: '#555555' }, item.desc)
                        )
                    );
                }

                if (item.type === 'option') {
                    return h(Box, { key: `option-${item.id}-${item.value}` },
                        h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                        h(Text, { color: item.selected ? '#00ff88' : (isSelected ? '#ffffff' : '#888888') },
                            item.selected ? '[●] ' : '[ ] '
                        ),
                        h(Text, { color: isSelected ? '#ffffff' : '#888888' }, item.label)
                    );
                }

                return null;
            })
        );
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1,
            justifyContent: 'space-between',
            borderStyle: 'single',
            borderColor: '#333333',
            borderTop: false,
            borderLeft: false,
            borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: accent, bold: true }, '⚙ CONTROL PANEL'),
                h(Badge, { color: 'cyan' }, `v${packageInfo.version}`)
            ),
            h(Box, { gap: 1 },
                saved && h(Badge, { color: 'green' }, '✓ Saved'),
                h(Text, { color: '#555555' }, categories[categoryIndex].name)
            )
        ),

        // Main content area
        h(Box, { flexGrow: 1 },
            renderSidebar(),
            h(Box, {
                flexDirection: 'column',
                flexGrow: 1,
                paddingY: 1,
            },
                renderContent()
            )
        ),

        // Footer
        h(Box, {
            paddingX: 1,
            gap: 1,
            borderStyle: 'single',
            borderColor: '#333333',
            borderBottom: false,
            borderLeft: false,
            borderRight: false,
        },
            h(Badge, { color: 'cyan' }, 'TAB'),
            h(Text, { color: '#555555' }, 'switch pane'),
            h(Badge, { color: 'cyan' }, '↑↓'),
            h(Text, { color: '#555555' }, 'navigate'),
            h(Badge, { color: 'green' }, 'ENTER'),
            h(Text, { color: '#555555' }, 'select'),
            h(Text, { color: '#333333' }, '│'),
            h(Text, { color: '#555555', dimColor: true }, activePane === 'sidebar' ? 'Categories' : 'Settings')
        )
    );
};

export default Program;
