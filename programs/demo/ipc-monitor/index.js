/**
 * IPC Monitor
 * A demo program that displays real-time IPC activity
 * Shows channels, services, and message history
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';

const h = React.createElement;

const Program = ({ isFocused, ipc, windowId }) => {
    const [view, setView] = useState('overview'); // 'overview', 'channels', 'services', 'messages'
    const [channels, setChannels] = useState([]);
    const [services, setServices] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    const views = ['OVERVIEW', 'CHANNELS', 'SERVICES', 'MESSAGES'];

    // Refresh IPC data periodically
    useEffect(() => {
        const refresh = () => {
            if (ipc) {
                setChannels(ipc.getChannels());
                setServices(ipc.getServices());
                setMessages(ipc.getMessageHistory().slice(-20).reverse());
                setLastUpdate(Date.now());
            }
        };

        refresh();
        const interval = setInterval(refresh, 1000);
        return () => clearInterval(interval);
    }, [ipc]);

    // Subscribe to all IPC activity for real-time updates
    useEffect(() => {
        if (!ipc) return;

        const subscription = ipc.subscribe('*', (message) => {
            setMessages(prev => [message, ...prev.slice(0, 19)]);
        });

        return () => subscription.unsubscribe();
    }, [ipc]);

    useInput((input, key) => {
        if (!isFocused) return;

        if (key.leftArrow) {
            const idx = views.indexOf(view.toUpperCase());
            setView(views[(idx - 1 + views.length) % views.length].toLowerCase());
            setSelectedIndex(0);
        }
        if (key.rightArrow) {
            const idx = views.indexOf(view.toUpperCase());
            setView(views[(idx + 1) % views.length].toLowerCase());
            setSelectedIndex(0);
        }
        if (key.upArrow) {
            setSelectedIndex(i => Math.max(0, i - 1));
        }
        if (key.downArrow) {
            const maxIdx = view === 'channels' ? channels.length - 1 :
                view === 'services' ? services.length - 1 :
                    view === 'messages' ? messages.length - 1 : 0;
            setSelectedIndex(i => Math.min(maxIdx, i + 1));
        }
        if (input >= '1' && input <= '4') {
            setView(views[parseInt(input) - 1].toLowerCase());
            setSelectedIndex(0);
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? '#00ffff' : '#333333';
    const accent = '#00ffff';
    const secondary = '#ff00ff';

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false });
    };

    const truncate = (str, len) => {
        if (!str) return '';
        str = String(str);
        return str.length > len ? str.substring(0, len - 3) + '...' : str;
    };

    const renderOverview = () => {
        return h(Box, { flexDirection: 'column', gap: 1 },
            h(Box, { gap: 2 },
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: secondary, bold: true }, '📡 CHANNELS'),
                    h(Text, { color: '#ffffff', bold: true }, channels.length.toString()),
                    h(Text, { color: '#555555' }, 'active')
                ),
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: secondary, bold: true }, '🔧 SERVICES'),
                    h(Text, { color: '#ffffff', bold: true }, services.length.toString()),
                    h(Text, { color: '#555555' }, 'registered')
                ),
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: secondary, bold: true }, '📨 MESSAGES'),
                    h(Text, { color: '#ffffff', bold: true }, messages.length.toString()),
                    h(Text, { color: '#555555' }, 'in history')
                )
            ),
            h(Text, { color: '#333333' }, '─'.repeat(50)),
            h(Text, { color: '#555555' }, 'WINDOW ID'),
            h(Text, { color: accent }, windowId || 'N/A'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'IPC STATUS'),
            h(Text, { color: ipc ? '#00ff88' : '#ff4444' }, ipc ? '● Connected' : '○ Not available'),
            h(Text, null, ''),
            h(Text, { color: '#555555' }, 'This monitor demonstrates the IPC system capabilities:'),
            h(Text, { color: '#888888' }, '• Pub/Sub messaging between programs'),
            h(Text, { color: '#888888' }, '• Service registration and RPC calls'),
            h(Text, { color: '#888888' }, '• Direct window-to-window messaging'),
            h(Text, { color: '#888888' }, '• Request/response patterns')
        );
    };

    const renderChannels = () => {
        if (channels.length === 0) {
            return h(Text, { color: '#555555' }, 'No active channels. Open another IPC-enabled program to see activity.');
        }

        return h(Box, { flexDirection: 'column' },
            h(Box, { marginBottom: 1 },
                h(Box, { width: 30 }, h(Text, { color: secondary, bold: true }, 'CHANNEL')),
                h(Text, { color: secondary, bold: true }, 'SUBSCRIBERS')
            ),
            ...channels.map((ch, i) => {
                const isSelected = i === selectedIndex;
                return h(Box, { key: ch.channel },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Box, { width: 28 },
                        h(Text, { color: isSelected ? '#ffffff' : '#888888' }, truncate(ch.channel, 26))
                    ),
                    h(Badge, { color: ch.subscribers > 0 ? 'green' : 'gray' }, ch.subscribers.toString())
                );
            })
        );
    };

    const renderServices = () => {
        if (services.length === 0) {
            return h(Box, { flexDirection: 'column' },
                h(Text, { color: '#555555' }, 'No services registered.'),
                h(Text, null, ''),
                h(Text, { color: '#888888' }, 'Programs can register services using:'),
                h(Text, { color: accent }, '  ipc.registerService("name", { methods })'),
                h(Text, null, ''),
                h(Text, { color: '#888888' }, 'And call them using:'),
                h(Text, { color: accent }, '  await ipc.callService("name", "method", ...args)')
            );
        }

        return h(Box, { flexDirection: 'column' },
            h(Box, { marginBottom: 1 },
                h(Box, { width: 25 }, h(Text, { color: secondary, bold: true }, 'SERVICE')),
                h(Text, { color: secondary, bold: true }, 'METHODS')
            ),
            ...services.map((name, i) => {
                const isSelected = i === selectedIndex;
                const methods = ipc ? ipc.getServiceMethods(name) : [];
                return h(Box, { key: name, flexDirection: 'column' },
                    h(Box, null,
                        h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                        h(Box, { width: 23 },
                            h(Text, { color: isSelected ? '#ffffff' : '#888888', bold: isSelected }, name)
                        ),
                        h(Badge, { color: 'cyan' }, methods.length.toString())
                    ),
                    isSelected && methods.length > 0 && h(Box, { flexDirection: 'column', paddingLeft: 4 },
                        ...methods.map(m => h(Text, { key: m, color: '#555555' }, `• ${m}()`))
                    )
                );
            })
        );
    };

    const renderMessages = () => {
        if (messages.length === 0) {
            return h(Box, { flexDirection: 'column' },
                h(Text, { color: '#555555' }, 'No messages yet.'),
                h(Text, null, ''),
                h(Text, { color: '#888888' }, 'Messages will appear here when programs publish to channels.'),
                h(Text, null, ''),
                h(Text, { color: '#888888' }, 'Example:'),
                h(Text, { color: accent }, '  ipc.publish("my.channel", "event-type", { data: 123 })')
            );
        }

        return h(Box, { flexDirection: 'column' },
            h(Box, { marginBottom: 1, gap: 1 },
                h(Box, { width: 10 }, h(Text, { color: secondary, bold: true }, 'TIME')),
                h(Box, { width: 18 }, h(Text, { color: secondary, bold: true }, 'CHANNEL')),
                h(Box, { width: 12 }, h(Text, { color: secondary, bold: true }, 'TYPE')),
                h(Text, { color: secondary, bold: true }, 'PAYLOAD')
            ),
            ...messages.slice(0, 10).map((msg, i) => {
                const isSelected = i === selectedIndex;
                return h(Box, { key: msg.id, gap: 1 },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸' : ' '),
                    h(Box, { width: 9 },
                        h(Text, { color: '#555555' }, formatTime(msg.timestamp))
                    ),
                    h(Box, { width: 18 },
                        h(Text, { color: isSelected ? '#ffffff' : '#888888' }, truncate(msg.channel, 16))
                    ),
                    h(Box, { width: 12 },
                        h(Text, { color: accent }, truncate(msg.type, 10))
                    ),
                    h(Text, { color: '#555555' }, truncate(JSON.stringify(msg.payload), 20))
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
                h(Text, { color: accent, bold: true }, '📡 IPC MONITOR'),
                h(Badge, { color: 'magenta' }, 'DEMO')
            ),
            h(Box, { gap: 1 },
                h(Badge, { color: 'green' }, 'LIVE'),
                h(Text, { color: '#555555' }, `${new Date(lastUpdate).toLocaleTimeString()}`)
            )
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
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1, minHeight: 12 },
            view === 'overview' && renderOverview(),
            view === 'channels' && renderChannels(),
            view === 'services' && renderServices(),
            view === 'messages' && renderMessages()
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
            h(Badge, { color: 'cyan' }, '1-4'),
            h(Text, { color: '#555555' }, 'direct'),
            h(Text, { color: '#333333' }, '│'),
            h(Text, { color: '#555555', dimColor: true }, 'refresh: 1s')
        )
    );
};

export default Program;
