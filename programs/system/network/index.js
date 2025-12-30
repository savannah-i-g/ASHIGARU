import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import os from 'os';
import fs from 'fs';
import path from 'path';

const h = React.createElement;

const loadTheme = () => {
    try {
        const p = path.join(os.homedir(), '.cypher-tui-settings.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
    } catch { }
    return 'Cyberpunk';
};

const getAccent = (t) => ({ Cyberpunk: '#00ffff', Mono: '#ffffff', Matrix: '#00ff00', Amber: '#ffaa00' }[t] || '#00ffff');

const Program = ({ isFocused }) => {
    const accent = getAccent(loadTheme());
    const [interfaces, setInterfaces] = useState([]);
    const [selected, setSelected] = useState(0);

    const loadInterfaces = () => {
        const nets = os.networkInterfaces();
        const result = [];
        for (const [name, addrs] of Object.entries(nets)) {
            if (addrs) {
                for (const addr of addrs) {
                    if (!addr.internal) {
                        result.push({ name, address: addr.address, family: addr.family, mac: addr.mac });
                    }
                }
            }
        }
        return result;
    };

    useEffect(() => {
        setInterfaces(loadInterfaces());
        const interval = setInterval(() => setInterfaces(loadInterfaces()), 5000);
        return () => clearInterval(interval);
    }, []);

    useInput((input, key) => {
        if (!isFocused) return;
        if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
        if (key.downArrow) setSelected((i) => Math.min(interfaces.length - 1, i + 1));
    }, { isActive: isFocused });

    const borderColor = isFocused ? accent : '#333333';

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: accent, bold: true }, 'NETWORK'),
            h(Text, { color: '#555555' }, '--[x]')
        ),

        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },
            interfaces.length === 0
                ? h(Text, { color: '#555555' }, 'No external interfaces')
                : interfaces.map((iface, i) => {
                    const isSel = i === selected;
                    return h(Box, { key: `${iface.name}-${iface.address}`, flexDirection: 'column', marginBottom: 1 },
                        h(Box, null,
                            h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                            h(Text, { color: '#00ff88', bold: true }, iface.name),
                            h(Text, { color: '#555555' }, ` (${iface.family})`)
                        ),
                        h(Box, { marginLeft: 4 },
                            h(Text, { color: '#555555' }, 'addr: '),
                            h(Text, { color: '#ffffff' }, iface.address)
                        ),
                        h(Box, { marginLeft: 4 },
                            h(Text, { color: '#555555' }, 'mac:  '),
                            h(Text, { color: '#888888' }, iface.mac)
                        )
                    );
                })
        ),

        h(Box, {
            paddingX: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: '#555555' }, `${interfaces.length} interface(s) | auto-refresh: 5s`)
        )
    );
};

export default Program;
