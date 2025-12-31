/**
 * API Demo
 * Demonstrates the unified API system for programs
 * Shows how to use system, storage, notifications, windows, sound, and AI APIs
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';

const h = React.createElement;

const Program = ({ isFocused, api, windowId }) => {
    const [view, setView] = useState('overview');
    const [stats, setStats] = useState(null);
    const [storageData, setStorageData] = useState({ counter: 0, lastAccess: null });
    const [storageKeys, setStorageKeys] = useState([]);
    const [selectedAction, setSelectedAction] = useState(0);
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const views = ['OVERVIEW', 'SYSTEM', 'STORAGE', 'NOTIFICATIONS', 'WINDOWS'];

    // Load system stats
    useEffect(() => {
        if (api) {
            setStats(api.system.getStats());
            const interval = setInterval(() => {
                setStats(api.system.getStats());
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [api]);

    // Load storage data
    useEffect(() => {
        if (api) {
            const loadStorage = async () => {
                const counter = await api.storage.get('counter') || 0;
                const lastAccess = await api.storage.get('lastAccess');
                const keys = await api.storage.list();
                setStorageData({ counter, lastAccess });
                setStorageKeys(keys);
            };
            loadStorage();
        }
    }, [api]);

    const actions = {
        overview: [
            { id: 'sound-click', label: 'Play Click Sound', icon: '🔊' },
            { id: 'sound-success', label: 'Play Success Sound', icon: '✅' },
            { id: 'notify-success', label: 'Send Success Notification', icon: '📬' },
            { id: 'notify-error', label: 'Send Error Notification', icon: '❌' },
        ],
        system: [
            { id: 'refresh-stats', label: 'Refresh Stats', icon: '🔄' },
            { id: 'emit-event', label: 'Emit System Event', icon: '📡' },
        ],
        storage: [
            { id: 'increment', label: 'Increment Counter', icon: '➕' },
            { id: 'save-timestamp', label: 'Save Timestamp', icon: '⏰' },
            { id: 'clear-storage', label: 'Clear All Storage', icon: '🗑' },
        ],
        notifications: [
            { id: 'notify-info', label: 'Info Notification', icon: 'ℹ' },
            { id: 'notify-success', label: 'Success Notification', icon: '✅' },
            { id: 'notify-warning', label: 'Warning Notification', icon: '⚠' },
            { id: 'notify-error', label: 'Error Notification', icon: '❌' },
        ],
        windows: [
            { id: 'list-windows', label: 'List Open Windows', icon: '📋' },
            { id: 'minimize', label: 'Minimize This Window', icon: '➖' },
        ],
    };

    const currentActions = actions[view] || actions.overview;

    const executeAction = async (actionId) => {
        if (!api) return;

        switch (actionId) {
            case 'sound-click':
                api.sound.click();
                break;
            case 'sound-success':
                api.sound.success();
                break;
            case 'notify-success':
                api.notifications.success('Action completed successfully!', 'API Demo');
                break;
            case 'notify-error':
                api.notifications.error('Something went wrong!', 'API Demo');
                break;
            case 'notify-info':
                api.notifications.info('This is an informational message', 'API Demo');
                break;
            case 'notify-warning':
                api.notifications.warning('Please be careful!', 'API Demo');
                break;
            case 'refresh-stats':
                setStats(api.system.getStats());
                api.sound.click();
                break;
            case 'emit-event':
                api.system.emit('demo', { message: 'Hello from API Demo!', timestamp: Date.now() });
                api.notifications.info('Event emitted to system.demo channel');
                break;
            case 'increment':
                const newCounter = storageData.counter + 1;
                await api.storage.set('counter', newCounter);
                setStorageData(prev => ({ ...prev, counter: newCounter }));
                api.sound.click();
                break;
            case 'save-timestamp':
                const now = new Date().toISOString();
                await api.storage.set('lastAccess', now);
                setStorageData(prev => ({ ...prev, lastAccess: now }));
                const keys = await api.storage.list();
                setStorageKeys(keys);
                api.sound.success();
                break;
            case 'clear-storage':
                await api.storage.clear();
                setStorageData({ counter: 0, lastAccess: null });
                setStorageKeys([]);
                api.notifications.warning('Storage cleared!');
                break;
            case 'list-windows':
                const windows = api.windows.list();
                api.notifications.info(`${windows.length} windows open`);
                break;
            case 'minimize':
                api.windows.minimize();
                break;
        }
    };

    useInput((input, key) => {
        if (!isFocused) return;

        if (key.leftArrow) {
            const idx = views.indexOf(view.toUpperCase());
            setView(views[(idx - 1 + views.length) % views.length].toLowerCase());
            setSelectedAction(0);
        }
        if (key.rightArrow) {
            const idx = views.indexOf(view.toUpperCase());
            setView(views[(idx + 1) % views.length].toLowerCase());
            setSelectedAction(0);
        }
        if (key.upArrow) {
            setSelectedAction(i => Math.max(0, i - 1));
        }
        if (key.downArrow) {
            setSelectedAction(i => Math.min(currentActions.length - 1, i + 1));
        }
        if (key.return || input === ' ') {
            executeAction(currentActions[selectedAction]?.id);
        }
        if (input >= '1' && input <= '5') {
            setView(views[parseInt(input) - 1].toLowerCase());
            setSelectedAction(0);
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? '#00ffff' : '#333333';
    const accent = '#00ffff';
    const secondary = '#ff00ff';

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const renderOverview = () => {
        return h(Box, { flexDirection: 'column' },
            h(Text, { color: secondary, bold: true }, 'UNIFIED API DEMO'),
            h(Text, { color: '#888888' }, 'This demo shows how programs access system features via the api prop.'),
            h(Text, null, ''),
            h(Box, { gap: 2, marginBottom: 1 },
                h(Badge, { color: api ? 'green' : 'red' }, api ? 'API Connected' : 'No API'),
                h(Badge, { color: 'cyan' }, `Window: ${windowId || 'N/A'}`)
            ),
            h(Text, { color: '#555555' }, 'Available APIs:'),
            h(Text, { color: '#888888' }, '  • api.system   - System info & events'),
            h(Text, { color: '#888888' }, '  • api.storage  - Persistent key-value storage'),
            h(Text, { color: '#888888' }, '  • api.notifications - User notifications'),
            h(Text, { color: '#888888' }, '  • api.windows  - Window management'),
            h(Text, { color: '#888888' }, '  • api.sound    - Audio feedback'),
            h(Text, { color: '#888888' }, '  • api.ai       - AI/LLM capabilities'),
            h(Text, { color: '#888888' }, '  • api.ipc      - Raw IPC access'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Quick Actions:'),
            ...currentActions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, `${action.icon} ${action.label}`)
                );
            })
        );
    };

    const renderSystem = () => {
        if (!stats) return h(Text, { color: '#555555' }, 'Loading...');

        return h(Box, { flexDirection: 'column' },
            h(Text, { color: secondary, bold: true }, 'SYSTEM API'),
            h(Text, { color: '#888888' }, 'api.system.getStats() returns:'),
            h(Text, null, ''),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Hostname')), h(Text, { color: '#ffffff' }, stats.hostname)),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Platform')), h(Text, { color: '#ffffff' }, `${stats.platform} ${stats.arch}`)),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Uptime')), h(Text, { color: '#ffffff' }, `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`)),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Memory')), h(Text, { color: '#ffffff' }, `${formatBytes(stats.usedMemory)} / ${formatBytes(stats.totalMemory)} (${stats.memoryPercent}%)`)),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'CPU')), h(Text, { color: '#ffffff' }, `${stats.cpuCount} cores`)),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Load')), h(Text, { color: '#ffffff' }, stats.loadAverage.map(l => l.toFixed(2)).join(' '))),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Actions:'),
            ...currentActions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, `${action.icon} ${action.label}`)
                );
            })
        );
    };

    const renderStorage = () => {
        return h(Box, { flexDirection: 'column' },
            h(Text, { color: secondary, bold: true }, 'STORAGE API'),
            h(Text, { color: '#888888' }, 'Persistent key-value storage per program'),
            h(Text, null, ''),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Counter')), h(Text, { color: accent, bold: true }, storageData.counter.toString())),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Last Access')), h(Text, { color: '#ffffff' }, storageData.lastAccess || 'Never')),
            h(Box, null, h(Box, { width: 16 }, h(Text, { color: '#555555' }, 'Keys')), h(Text, { color: '#888888' }, storageKeys.join(', ') || 'None')),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Actions:'),
            ...currentActions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, `${action.icon} ${action.label}`)
                );
            })
        );
    };

    const renderNotifications = () => {
        return h(Box, { flexDirection: 'column' },
            h(Text, { color: secondary, bold: true }, 'NOTIFICATIONS API'),
            h(Text, { color: '#888888' }, 'Broadcast notifications to all programs'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Methods:'),
            h(Text, { color: '#888888' }, '  api.notifications.success(message, title?)'),
            h(Text, { color: '#888888' }, '  api.notifications.error(message, title?)'),
            h(Text, { color: '#888888' }, '  api.notifications.warning(message, title?)'),
            h(Text, { color: '#888888' }, '  api.notifications.info(message, title?)'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Try them:'),
            ...currentActions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, `${action.icon} ${action.label}`)
                );
            })
        );
    };

    const renderWindows = () => {
        const windows = api ? api.windows.list() : [];
        return h(Box, { flexDirection: 'column' },
            h(Text, { color: secondary, bold: true }, 'WINDOWS API'),
            h(Text, { color: '#888888' }, 'Window management operations'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Open Windows:'),
            ...windows.map((w, i) => h(Box, { key: w.id },
                h(Text, { color: w.id === windowId ? accent : '#888888' }, `  ${w.isFocused ? '▸' : ' '} ${w.programName}`),
                w.isMinimized && h(Badge, { color: 'gray' }, 'MIN')
            )),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'Actions:'),
            ...currentActions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, `${action.icon} ${action.label}`)
                );
            })
        );
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: accent, bold: true }, '🔌 API DEMO'),
                h(Badge, { color: 'magenta' }, 'DEMO')
            ),
            h(Badge, { color: api ? 'green' : 'red' }, api ? 'API OK' : 'NO API')
        ),

        // View tabs
        h(Box, { paddingX: 1, gap: 1 },
            ...views.map((v, i) =>
                h(Box, { key: v },
                    h(Badge, { color: view === v.toLowerCase() ? 'cyan' : 'gray' }, `${i + 1}`),
                    h(Text, { color: view === v.toLowerCase() ? accent : '#555555', bold: view === v.toLowerCase() }, ` ${v}`)
                )
            )
        ),

        h(Box, { paddingX: 1 }, h(Text, { color: '#333333' }, '─'.repeat(55))),

        // Content
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1, minHeight: 14 },
            view === 'overview' && renderOverview(),
            view === 'system' && renderSystem(),
            view === 'storage' && renderStorage(),
            view === 'notifications' && renderNotifications(),
            view === 'windows' && renderWindows()
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'cyan' }, '←→'),
            h(Text, { color: '#555555' }, 'views'),
            h(Badge, { color: 'cyan' }, '↑↓'),
            h(Text, { color: '#555555' }, 'select'),
            h(Badge, { color: 'green' }, 'ENTER'),
            h(Text, { color: '#555555' }, 'execute')
        )
    );
};

export default Program;
