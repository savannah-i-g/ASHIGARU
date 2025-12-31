/**
 * IPC Broadcaster
 * A demo program that broadcasts messages and exposes callable services
 * Use alongside IPC Monitor to see the IPC system in action
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import os from 'os';

const h = React.createElement;

const Program = ({ isFocused, ipc, windowId }) => {
    const [broadcasting, setBroadcasting] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [lastMessage, setLastMessage] = useState(null);
    const [selectedAction, setSelectedAction] = useState(0);
    const [serviceRegistered, setServiceRegistered] = useState(false);
    const [directMessages, setDirectMessages] = useState([]);
    const intervalRef = useRef(null);

    const actions = [
        { id: 'toggle', label: broadcasting ? 'Stop Broadcasting' : 'Start Broadcasting', icon: broadcasting ? '⏹' : '▶' },
        { id: 'single', label: 'Send Single Message', icon: '📨' },
        { id: 'service', label: serviceRegistered ? 'Unregister Service' : 'Register Service', icon: '🔧' },
        { id: 'direct', label: 'Send Direct Message', icon: '📍' },
    ];

    // Register/unregister demo service
    useEffect(() => {
        if (!ipc || !serviceRegistered) return;

        // Register a demo calculator service
        ipc.registerService('demo.calculator', {
            add: async (a, b) => ({ result: a + b, operation: 'add' }),
            multiply: async (a, b) => ({ result: a * b, operation: 'multiply' }),
            getSystemStats: async () => ({
                hostname: os.hostname(),
                platform: os.platform(),
                uptime: os.uptime(),
                memUsage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
            }),
            echo: async (message) => ({ echo: message, timestamp: Date.now() }),
        });

        // Publish service available event
        ipc.publish('demo.events', 'service-available', { service: 'demo.calculator', windowId });

        return () => {
            ipc.unregisterService('demo.calculator');
        };
    }, [ipc, serviceRegistered, windowId]);

    // Handle broadcasting
    useEffect(() => {
        if (!ipc) return;

        if (broadcasting) {
            intervalRef.current = setInterval(() => {
                const message = {
                    count: messageCount + 1,
                    timestamp: Date.now(),
                    source: windowId,
                    data: {
                        cpu: Math.round(os.loadavg()[0] * 100) / 100,
                        mem: Math.round((1 - os.freemem() / os.totalmem()) * 100),
                        uptime: os.uptime(),
                    },
                };
                ipc.publish('demo.broadcast', 'system-stats', message);
                setMessageCount(c => c + 1);
                setLastMessage(message);
            }, 2000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [ipc, broadcasting, messageCount, windowId]);

    // Listen for direct messages
    useEffect(() => {
        if (!ipc) return;

        const subscription = ipc.onDirectMessage((message) => {
            setDirectMessages(prev => [message, ...prev.slice(0, 4)]);
        });

        return () => subscription.unsubscribe();
    }, [ipc]);

    const sendSingleMessage = () => {
        if (!ipc) return;
        const message = {
            type: 'manual',
            timestamp: Date.now(),
            source: windowId,
            random: Math.random().toString(36).substring(7),
        };
        ipc.publish('demo.events', 'manual-message', message);
        setMessageCount(c => c + 1);
        setLastMessage(message);
    };

    const sendDirectMessage = () => {
        if (!ipc) return;
        // Send to self as demo (in real usage, you'd target another window)
        ipc.sendToWindow(windowId, 'demo-direct', {
            text: 'Hello from IPC Broadcaster!',
            timestamp: Date.now(),
        });
    };

    useInput((input, key) => {
        if (!isFocused) return;

        if (key.upArrow) {
            setSelectedAction(i => Math.max(0, i - 1));
        }
        if (key.downArrow) {
            setSelectedAction(i => Math.min(actions.length - 1, i + 1));
        }
        if (key.return || input === ' ') {
            const action = actions[selectedAction];
            if (action.id === 'toggle') {
                setBroadcasting(b => !b);
            } else if (action.id === 'single') {
                sendSingleMessage();
            } else if (action.id === 'service') {
                setServiceRegistered(r => !r);
            } else if (action.id === 'direct') {
                sendDirectMessage();
            }
        }
        if (input >= '1' && input <= '4') {
            const idx = parseInt(input) - 1;
            setSelectedAction(idx);
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? '#00ffff' : '#333333';
    const accent = '#00ffff';
    const secondary = '#ff00ff';

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: accent, bold: true }, '📢 IPC BROADCASTER'),
                h(Badge, { color: 'magenta' }, 'DEMO')
            ),
            h(Box, { gap: 1 },
                broadcasting && h(Badge, { color: 'green' }, 'BROADCASTING'),
                serviceRegistered && h(Badge, { color: 'cyan' }, 'SERVICE'),
            )
        ),

        // Status
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
            h(Box, { gap: 2, marginBottom: 1 },
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: '#555555' }, 'Messages Sent'),
                    h(Text, { color: '#ffffff', bold: true }, messageCount.toString())
                ),
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: '#555555' }, 'Window ID'),
                    h(Text, { color: accent }, windowId || 'N/A')
                ),
                h(Box, { flexDirection: 'column' },
                    h(Text, { color: '#555555' }, 'Status'),
                    h(Text, { color: broadcasting ? '#00ff88' : '#888888' }, broadcasting ? '● Active' : '○ Idle')
                )
            ),

            h(Box, { paddingX: 0 }, h(Text, { color: '#333333' }, '─'.repeat(50))),

            // Actions
            h(Text, { color: secondary, bold: true, marginBottom: 1 }, 'ACTIONS'),
            ...actions.map((action, i) => {
                const isSelected = i === selectedAction;
                return h(Box, { key: action.id },
                    h(Text, { color: isSelected ? accent : '#555555' }, isSelected ? '▸ ' : '  '),
                    h(Badge, { color: isSelected ? 'cyan' : 'gray' }, `${i + 1}`),
                    h(Text, { color: isSelected ? '#ffffff' : '#888888' }, ` ${action.icon} ${action.label}`)
                );
            }),

            h(Text, null, ''),
            h(Box, { paddingX: 0 }, h(Text, { color: '#333333' }, '─'.repeat(50))),

            // Last message
            h(Text, { color: secondary, bold: true }, 'LAST MESSAGE'),
            lastMessage ? h(Box, { flexDirection: 'column' },
                h(Text, { color: '#888888' }, `Time: ${new Date(lastMessage.timestamp).toLocaleTimeString()}`),
                h(Text, { color: '#555555' }, `Data: ${JSON.stringify(lastMessage.data || lastMessage.random || '').substring(0, 40)}...`)
            ) : h(Text, { color: '#555555' }, 'No messages sent yet'),

            // Direct messages received
            directMessages.length > 0 && [
                h(Text, { key: 'dm-title', color: secondary, bold: true, marginTop: 1 }, 'DIRECT MESSAGES RECEIVED'),
                ...directMessages.slice(0, 3).map((dm, i) =>
                    h(Text, { key: i, color: '#888888' }, `• ${dm.type}: ${JSON.stringify(dm.payload).substring(0, 35)}...`)
                )
            ]
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'cyan' }, '↑↓'),
            h(Text, { color: '#555555' }, 'select'),
            h(Badge, { color: 'green' }, 'ENTER'),
            h(Text, { color: '#555555' }, 'execute'),
            h(Badge, { color: 'cyan' }, '1-4'),
            h(Text, { color: '#555555' }, 'direct')
        )
    );
};

export default Program;
