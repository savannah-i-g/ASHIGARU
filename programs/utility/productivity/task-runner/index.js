import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Badge, TextInput } from '@inkjs/ui';
import { ScrollView } from 'ink-scroll-view';
import { spawn } from 'child_process';
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

const getThemeColors = (t) => ({
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', prompt: '#00ff88', error: '#ff4444', output: '#cccccc', dim: '#555555' },
    Mono: { accent: '#ffffff', secondary: '#888888', prompt: '#ffffff', error: '#888888', output: '#cccccc', dim: '#555555' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', prompt: '#00ff00', error: '#ff0000', output: '#00bb00', dim: '#005500' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', prompt: '#ffcc00', error: '#ff4400', output: '#ddaa00', dim: '#553300' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', prompt: '#00ff88', error: '#ff4444', output: '#cccccc', dim: '#555555' });

const MAX_LINES = 200;

// We use a global hook to access window manager lock functions
// Programs receive lockInput/unlockInput as props from WindowContainer
const Program = ({ isFocused, onClose, lockInput, unlockInput }) => {
    const colors = getThemeColors(loadTheme());
    const { stdout } = useStdout();
    const [lines, setLines] = useState([{ type: 'info', text: `ASHIGARU Terminal v1.0 | ${os.hostname()} | Press [I] to enter input mode` }]);
    const [input, setInput] = useState('');
    const [cwd, setCwd] = useState(os.homedir());
    const [running, setRunning] = useState(false);
    const [inputMode, setInputMode] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const processRef = useRef(null);
    const scrollRef = useRef(null);

    // Handle terminal resize
    useEffect(() => {
        const handleResize = () => scrollRef.current?.remeasure();
        stdout?.on('resize', handleResize);
        return () => { stdout?.off('resize', handleResize); };
    }, [stdout]);

    // Auto-scroll to bottom on new output
    useEffect(() => {
        scrollRef.current?.scrollToBottom();
    }, [lines]);

    // Lock/unlock input when entering/exiting input mode
    useEffect(() => {
        if (inputMode && lockInput) {
            lockInput();
        } else if (!inputMode && unlockInput) {
            unlockInput();
        }
    }, [inputMode, lockInput, unlockInput]);

    // Cleanup on unmount - unlock input
    useEffect(() => {
        return () => {
            if (unlockInput) unlockInput();
        };
    }, [unlockInput]);

    const addLine = (type, text) => {
        setLines(prev => {
            const newLines = [...prev, { type, text }];
            return newLines.slice(-MAX_LINES);
        });
    };

    const addLines = (type, text) => {
        const splitLines = text.split('\n').filter(l => l.length > 0);
        setLines(prev => {
            const newLines = [...prev, ...splitLines.map(l => ({ type, text: l }))];
            return newLines.slice(-MAX_LINES);
        });
    };

    const runCommand = (cmd) => {
        if (!cmd.trim()) return;

        setHistory(prev => [...prev.slice(-50), cmd]);
        setHistoryIndex(-1);
        addLine('prompt', `${path.basename(cwd)} ▶ ${cmd}`);

        // Built-in commands
        if (cmd === 'clear' || cmd === 'cls') {
            setLines([]);
            return;
        }
        if (cmd === 'help') {
            addLine('info', '┌─ Built-in Commands ─────────────────────');
            addLine('info', '│ clear/cls    - Clear terminal');
            addLine('info', '│ cd <path>    - Change directory');
            addLine('info', '│ pwd          - Print working directory');
            addLine('info', '│ exit         - Close terminal');
            addLine('info', '│ help         - Show this help');
            addLine('info', '└──────────────────────────────────────────');
            addLine('info', '');
            addLine('info', '┌─ Mode Controls ──────────────────────────');
            addLine('info', '│ [I]          - Enter input mode');
            addLine('info', '│ [ESC]        - Exit input mode');
            addLine('info', '└──────────────────────────────────────────');
            return;
        }
        if (cmd === 'exit') {
            if (onClose) onClose();
            return;
        }
        if (cmd === 'pwd') {
            addLine('output', cwd);
            return;
        }
        if (cmd.startsWith('cd ')) {
            const target = cmd.slice(3).trim().replace('~', os.homedir());
            const newPath = path.isAbsolute(target) ? target : path.join(cwd, target);
            try {
                if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
                    setCwd(newPath);
                    addLine('info', `→ ${newPath}`);
                } else {
                    addLine('error', `cd: no such directory: ${target}`);
                }
            } catch (e) {
                addLine('error', `cd: ${e.message}`);
            }
            return;
        }

        // External commands
        setRunning(true);
        try {
            const proc = spawn('bash', ['-c', cmd], {
                cwd,
                env: { ...process.env, TERM: 'dumb', COLUMNS: '80' },
            });
            processRef.current = proc;

            proc.stdout.on('data', (data) => {
                addLines('output', data.toString());
            });

            proc.stderr.on('data', (data) => {
                addLines('error', data.toString());
            });

            proc.on('close', (code) => {
                setRunning(false);
                processRef.current = null;
                if (code !== 0 && code !== null) {
                    addLine('error', `Process exited with code ${code}`);
                }
            });

            proc.on('error', (err) => {
                setRunning(false);
                processRef.current = null;
                addLine('error', `Error: ${err.message}`);
            });

        } catch (e) {
            setRunning(false);
            addLine('error', `Failed to run: ${e.message}`);
        }
    };

    const killProcess = () => {
        if (processRef.current) {
            processRef.current.kill('SIGTERM');
            addLine('info', '◢ Process terminated');
            setRunning(false);
        }
    };

    useInput((inputChar, key) => {
        if (!isFocused) return;

        // ESC exits input mode
        if (key.escape && inputMode) {
            setInputMode(false);
            return;
        }

        // Ctrl+C kills process (works in both modes)
        if (key.ctrl && inputChar === 'c') {
            killProcess();
            return;
        }

        // When NOT in input mode, handle navigation and mode entry
        if (!inputMode) {
            // 'i' or 'enter' enters input mode
            if (inputChar === 'i' || key.return) {
                setInputMode(true);
                return;
            }

            // History navigation when not in input mode
            if (key.upArrow && history.length > 0) {
                const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex] || '');
                return;
            }

            if (key.downArrow && historyIndex >= 0) {
                const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
                setHistoryIndex(newIndex);
                setInput(newIndex >= 0 ? history[history.length - 1 - newIndex] : '');
                return;
            }

            // Scroll controls
            if (key.pageUp) {
                const height = scrollRef.current?.getViewportHeight() || 5;
                scrollRef.current?.scrollBy(-height);
                return;
            }

            if (key.pageDown) {
                const height = scrollRef.current?.getViewportHeight() || 5;
                scrollRef.current?.scrollBy(height);
                return;
            }
        }
    }, { isActive: isFocused });

    const handleSubmit = (value) => {
        runCommand(value);
        setInput('');
        // Stay in input mode after running command
    };

    const borderColor = isFocused ? colors.accent : '#333333';

    const getLineColor = (type) => ({
        prompt: colors.prompt,
        output: colors.output,
        error: colors.error,
        info: colors.accent,
    }[type] || colors.output);

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: colors.accent, bold: true }, '◢ TERMINAL'),
                running && h(Badge, { color: 'yellow' }, 'RUNNING'),
                inputMode && h(Badge, { color: 'green' }, 'INPUT'),
            ),
            h(Box, { gap: 1 },
                h(Text, { color: colors.dim }, path.basename(cwd)),
                h(Text, { color: '#333333' }, '│'),
                h(Badge, { color: 'gray' }, `${lines.length}`)
            )
        ),

        // Output area with ScrollView
        h(Box, { flexDirection: 'column', flexGrow: 1, overflow: 'hidden' },
            h(ScrollView, { ref: scrollRef },
                ...lines.map((line, i) =>
                    h(Text, { key: i, color: getLineColor(line.type) }, line.text)
                )
            )
        ),

        // Input line
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: inputMode ? colors.accent : '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: colors.prompt }, `${path.basename(cwd)} ▶`),
            running ?
                h(Text, { color: colors.dim }, '(running... Ctrl+C to stop)') :
                inputMode ?
                    h(TextInput, {
                        value: input,
                        onChange: setInput,
                        onSubmit: handleSubmit,
                        placeholder: 'Enter command...',
                        isDisabled: !isFocused,
                    }) :
                    h(Text, { color: colors.dim }, input || 'Press [I] to type...')
        ),

        // Footer
        h(Box, { paddingX: 1, gap: 1 },
            inputMode ?
                [
                    h(Badge, { key: 'esc', color: 'red' }, 'ESC'),
                    h(Text, { key: 'escl', color: colors.dim }, 'exit input'),
                    h(Badge, { key: 'ctrl', color: 'yellow' }, 'Ctrl+C'),
                    h(Text, { key: 'ctrll', color: colors.dim }, 'kill'),
                ] :
                [
                    h(Badge, { key: 'i', color: 'green' }, 'I'),
                    h(Text, { key: 'il', color: colors.dim }, 'input'),
                    h(Badge, { key: 'up', color: 'cyan' }, '↑↓'),
                    h(Text, { key: 'upl', color: colors.dim }, 'history'),
                    h(Badge, { key: 'pg', color: 'gray' }, 'PgUp/Dn'),
                    h(Text, { key: 'pgl', color: colors.dim }, 'scroll'),
                    h(Badge, { key: 'ctrl2', color: 'yellow' }, 'Ctrl+C'),
                    h(Text, { key: 'ctrl2l', color: colors.dim }, 'kill'),
                ]
        )
    );
};

export default Program;
