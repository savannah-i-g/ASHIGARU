import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import os from 'os';

const h = React.createElement;

const loadTheme = () => {
    try {
        const p = path.join(os.homedir(), '.cypher-tui-settings.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
    } catch { }
    return 'Cyberpunk';
};

const getColors = (theme) => {
    const palettes = {
        Cyberpunk: { accent: '#00ffff', highlight: '#ff00ff', success: '#00ff88', error: '#ff4444', warning: '#ffaa00' },
        Mono: { accent: '#ffffff', highlight: '#aaaaaa', success: '#ffffff', error: '#888888', warning: '#aaaaaa' },
        Matrix: { accent: '#00ff00', highlight: '#88ff88', success: '#00ff00', error: '#ff0000', warning: '#88ff00' },
        Amber: { accent: '#ffaa00', highlight: '#ff6600', success: '#88ff00', error: '#ff4400', warning: '#ffaa00' },
    };
    return palettes[theme] || palettes.Cyberpunk;
};

const Program = ({ isFocused }) => {
    const [themeName] = useState(loadTheme());
    const colors = getColors(themeName);

    const [cwd, setCwd] = useState(os.homedir());
    const [entries, setEntries] = useState([]);
    const [selected, setSelected] = useState(0);
    const [scroll, setScroll] = useState(0);
    const [mode, setMode] = useState('browse'); // browse, input, confirm
    const [inputValue, setInputValue] = useState('');
    const [action, setAction] = useState(''); // mkdir, touch, rename, delete
    const [message, setMessage] = useState({ text: '', type: '' });
    const maxVisible = 10;

    const showMessage = (text, type = 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    };

    const loadEntries = () => {
        try {
            const items = fs.readdirSync(cwd, { withFileTypes: true });
            const sorted = items
                .filter(item => !item.name.startsWith('.'))
                .map((item) => {
                    let size = '';
                    try {
                        if (!item.isDirectory()) {
                            const stats = fs.statSync(path.join(cwd, item.name));
                            size = formatSize(stats.size);
                        }
                    } catch { }
                    return { name: item.name, isDir: item.isDirectory(), size };
                })
                .sort((a, b) => {
                    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
            setEntries([{ name: '..', isDir: true, size: '' }, ...sorted]);
            setSelected(0);
            setScroll(0);
        } catch (err) {
            showMessage('Cannot read directory', 'error');
            setEntries([{ name: '..', isDir: true, size: '' }]);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
    };

    useEffect(() => { loadEntries(); }, [cwd]);

    useInput((input, key) => {
        if (!isFocused) return;

        // Input mode handling
        if (mode === 'input') {
            if (key.escape) {
                setMode('browse');
                setInputValue('');
                return;
            }
            if (key.return) {
                executeAction();
                return;
            }
            if (key.backspace || key.delete) {
                setInputValue((v) => v.slice(0, -1));
                return;
            }
            if (input && !key.ctrl && !key.meta) {
                setInputValue((v) => v + input);
            }
            return;
        }

        // Confirm mode
        if (mode === 'confirm') {
            if (input === 'y' || input === 'Y') {
                executeAction();
                return;
            }
            if (input === 'n' || input === 'N' || key.escape) {
                setMode('browse');
                setAction('');
                return;
            }
            return;
        }

        // Browse mode
        if (key.upArrow) {
            setSelected((i) => {
                const next = i > 0 ? i - 1 : entries.length - 1;
                if (next < scroll) setScroll(next);
                if (next >= scroll + maxVisible) setScroll(Math.max(0, next - maxVisible + 1));
                return next;
            });
        }
        if (key.downArrow) {
            setSelected((i) => {
                const next = i < entries.length - 1 ? i + 1 : 0;
                if (next >= scroll + maxVisible) setScroll(next - maxVisible + 1);
                if (next < scroll) setScroll(next);
                return next;
            });
        }
        if (key.return) {
            const entry = entries[selected];
            if (entry?.isDir) {
                setCwd(entry.name === '..' ? path.dirname(cwd) : path.join(cwd, entry.name));
            }
        }
        if (input === 'h') setCwd(os.homedir());
        if (input === '/') setCwd('/');

        // File operations
        if (input === 'n') {
            setAction('mkdir');
            setInputValue('');
            setMode('input');
        }
        if (input === 't') {
            setAction('touch');
            setInputValue('');
            setMode('input');
        }
        if (input === 'r' && entries[selected]?.name !== '..') {
            setAction('rename');
            setInputValue(entries[selected]?.name || '');
            setMode('input');
        }
        if (input === 'd' && entries[selected]?.name !== '..') {
            setAction('delete');
            setMode('confirm');
        }
    }, { isActive: isFocused });

    const executeAction = () => {
        const entry = entries[selected];
        try {
            if (action === 'mkdir' && inputValue.trim()) {
                fs.mkdirSync(path.join(cwd, inputValue.trim()));
                showMessage(`Created folder: ${inputValue}`, 'success');
            }
            if (action === 'touch' && inputValue.trim()) {
                fs.writeFileSync(path.join(cwd, inputValue.trim()), '');
                showMessage(`Created file: ${inputValue}`, 'success');
            }
            if (action === 'rename' && inputValue.trim() && entry) {
                fs.renameSync(path.join(cwd, entry.name), path.join(cwd, inputValue.trim()));
                showMessage(`Renamed to: ${inputValue}`, 'success');
            }
            if (action === 'delete' && entry) {
                const fullPath = path.join(cwd, entry.name);
                if (entry.isDir) {
                    fs.rmdirSync(fullPath, { recursive: true });
                } else {
                    fs.unlinkSync(fullPath);
                }
                showMessage(`Deleted: ${entry.name}`, 'success');
            }
            loadEntries();
        } catch (err) {
            showMessage(`Error: ${err.message}`, 'error');
        }
        setMode('browse');
        setAction('');
        setInputValue('');
    };

    const visible = entries.slice(scroll, scroll + maxVisible);
    const borderColor = isFocused ? colors.accent : '#333333';

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: colors.accent, bold: true }, 'FILE MANAGER'),
            h(Text, { color: '#555555' }, '--[x]')
        ),

        // Path bar
        h(Box, { paddingX: 1 },
            h(Text, { color: '#555555' }, cwd)
        ),

        // Message bar
        message.text && h(Box, { paddingX: 1 },
            h(Text, { color: message.type === 'error' ? colors.error : message.type === 'success' ? colors.success : colors.warning },
                message.text
            )
        ),

        // Input mode
        mode === 'input' && h(Box, { paddingX: 1 },
            h(Text, { color: colors.accent },
                action === 'mkdir' ? 'New folder: ' :
                    action === 'touch' ? 'New file: ' :
                        action === 'rename' ? 'Rename to: ' : ''
            ),
            h(Text, { color: '#ffffff' }, inputValue),
            h(Text, { color: colors.accent }, '_')
        ),

        // Confirm mode
        mode === 'confirm' && h(Box, { paddingX: 1 },
            h(Text, { color: colors.warning }, `Delete "${entries[selected]?.name}"? [y/n]`)
        ),

        // File list
        h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
            ...visible.map((entry, i) => {
                const idx = i + scroll;
                const isSel = idx === selected;
                return h(Box, { key: entry.name, justifyContent: 'space-between' },
                    h(Box, null,
                        h(Text, { color: isSel ? colors.accent : '#555555' }, isSel ? '> ' : '  '),
                        h(Text, { color: entry.isDir ? colors.highlight : '#ffffff' },
                            entry.isDir ? `${entry.name}/` : entry.name
                        )
                    ),
                    h(Text, { color: '#555555' }, entry.size)
                );
            })
        ),

        // Footer
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: '#555555' }, mode === 'browse' ? '[n]ew dir [t]ouch [r]ename [d]el [h]ome' : '[enter] confirm [esc] cancel'),
            entries.length > maxVisible && h(Text, { color: '#555555' },
                `${scroll + 1}-${Math.min(scroll + maxVisible, entries.length)}/${entries.length}`
            )
        )
    );
};

export default Program;
