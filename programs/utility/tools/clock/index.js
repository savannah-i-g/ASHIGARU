import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
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
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', dim: '#004444' },
    Mono: { accent: '#ffffff', secondary: '#888888', dim: '#333333' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', dim: '#003300' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', dim: '#442200' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', dim: '#004444' });

// Block character digits (7 tall, 6 wide) - more angular/cyberpunk
const digits = {
    '0': [
        '██████',
        '██  ██',
        '██  ██',
        '██  ██',
        '██  ██',
        '██  ██',
        '██████',
    ],
    '1': [
        '    ██',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
    ],
    '2': [
        '██████',
        '    ██',
        '    ██',
        '██████',
        '██    ',
        '██    ',
        '██████',
    ],
    '3': [
        '██████',
        '    ██',
        '    ██',
        '██████',
        '    ██',
        '    ██',
        '██████',
    ],
    '4': [
        '██  ██',
        '██  ██',
        '██  ██',
        '██████',
        '    ██',
        '    ██',
        '    ██',
    ],
    '5': [
        '██████',
        '██    ',
        '██    ',
        '██████',
        '    ██',
        '    ██',
        '██████',
    ],
    '6': [
        '██████',
        '██    ',
        '██    ',
        '██████',
        '██  ██',
        '██  ██',
        '██████',
    ],
    '7': [
        '██████',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
        '    ██',
    ],
    '8': [
        '██████',
        '██  ██',
        '██  ██',
        '██████',
        '██  ██',
        '██  ██',
        '██████',
    ],
    '9': [
        '██████',
        '██  ██',
        '██  ██',
        '██████',
        '    ██',
        '    ██',
        '██████',
    ],
    ':': [
        '      ',
        '  ██  ',
        '  ██  ',
        '      ',
        '  ██  ',
        '  ██  ',
        '      ',
    ],
};

const Program = ({ isFocused }) => {
    const colors = getThemeColors(loadTheme());
    const [time, setTime] = useState(new Date());
    const [mode, setMode] = useState('clock');
    const [timerSecs, setTimerSecs] = useState(300);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerInitial, setTimerInitial] = useState(300);
    const [stopwatch, setStopwatch] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const [inputMode, setInputMode] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [blink, setBlink] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
            setBlink(b => !b);
            if (timerRunning && timerSecs > 0) {
                setTimerSecs((s) => s - 1);
            }
            if (swRunning) {
                setStopwatch((s) => s + 1);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning, swRunning]);

    useInput((input, key) => {
        if (!isFocused) return;

        if (inputMode) {
            if (key.escape) { setInputMode(false); setInputValue(''); return; }
            if (key.return) {
                const mins = parseInt(inputValue, 10);
                if (!isNaN(mins) && mins > 0) {
                    setTimerSecs(mins * 60);
                    setTimerInitial(mins * 60);
                }
                setInputMode(false);
                setInputValue('');
                return;
            }
            if (key.backspace) { setInputValue((v) => v.slice(0, -1)); return; }
            if (/[0-9]/.test(input)) { setInputValue((v) => v + input); }
            return;
        }

        if (input === '1') setMode('clock');
        if (input === '2') setMode('timer');
        if (input === '3') setMode('stopwatch');

        if (mode === 'timer') {
            if (input === ' ' || key.return) setTimerRunning((r) => !r);
            if (input === 'r') { setTimerSecs(timerInitial); setTimerRunning(false); }
            if (input === 's') setInputMode(true);
        }

        if (mode === 'stopwatch') {
            if (input === ' ' || key.return) setSwRunning((r) => !r);
            if (input === 'r') { setStopwatch(0); setSwRunning(false); }
        }
    }, { isActive: isFocused });

    const formatTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const formatTimer = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const displayStr = mode === 'clock' ? formatTime(time) : mode === 'timer' ? formatTimer(timerSecs) : formatTimer(stopwatch);
    const borderColor = isFocused ? colors.accent : '#333333';

    const BigDigit = ({ char, isColon }) => {
        const digitRows = digits[char] || digits['0'];
        const colonOpacity = isColon && blink ? colors.dim : colors.accent;
        return h(Box, { flexDirection: 'column' },
            ...digitRows.map((row, i) =>
                h(Text, { key: i, color: isColon ? colonOpacity : colors.accent }, row)
            )
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
                h(Text, { color: colors.accent, bold: true }, '◢ '),
                h(Text, { color: colors.accent, bold: true }, mode.toUpperCase()),
                mode === 'timer' && timerRunning && h(Badge, { color: 'green' }, 'ACTIVE'),
                mode === 'stopwatch' && swRunning && h(Badge, { color: 'green' }, 'RUNNING'),
            ),
            h(Text, { color: colors.dim }, '◤◢◤◢')
        ),

        // Mode tabs with badges
        h(Box, { paddingX: 1, gap: 1 },
            h(Badge, { color: mode === 'clock' ? 'cyan' : 'gray' }, '1'),
            h(Text, { color: mode === 'clock' ? colors.accent : '#555555' }, 'CLOCK'),
            h(Badge, { color: mode === 'timer' ? 'magenta' : 'gray' }, '2'),
            h(Text, { color: mode === 'timer' ? colors.secondary : '#555555' }, 'TIMER'),
            h(Badge, { color: mode === 'stopwatch' ? 'yellow' : 'gray' }, '3'),
            h(Text, { color: mode === 'stopwatch' ? '#ffaa00' : '#555555' }, 'STOPWATCH'),
        ),

        h(Box, { paddingX: 1 }, h(Text, { color: '#222222' }, '─'.repeat(50))),

        // Big time display
        h(Box, { justifyContent: 'center', alignItems: 'center', marginY: 1, flexGrow: 1 },
            ...displayStr.split('').map((c, i) =>
                h(Box, { key: i, marginRight: c === ':' ? 0 : 1 },
                    h(BigDigit, { char: c, isColon: c === ':' })
                )
            )
        ),

        // Decorative scanline
        h(Box, { justifyContent: 'center' },
            h(Text, { color: colors.dim }, '▔'.repeat(40))
        ),

        // Status / Input
        mode === 'timer' && inputMode && h(Box, { paddingX: 1, justifyContent: 'center', gap: 1 },
            h(Badge, { color: 'cyan' }, 'SET'),
            h(Text, { color: colors.accent }, 'Minutes: '),
            h(Text, { color: '#ffffff', bold: true }, inputValue || '0'),
            h(Text, { color: colors.secondary }, '█')
        ),

        mode === 'clock' && h(Box, { justifyContent: 'center', marginTop: 1 },
            h(Text, { color: '#555555' }, '◢ '),
            h(Text, { color: '#888888' },
                time.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
            ),
            h(Text, { color: '#555555' }, ' ◤')
        ),

        mode === 'timer' && !inputMode && h(Box, { justifyContent: 'center', marginTop: 1, gap: 1 },
            timerSecs === 0 ?
                h(Badge, { color: 'red' }, '◢ TIME UP ◤') :
                timerRunning ?
                    h(Badge, { color: 'green' }, '▶ RUNNING') :
                    h(Badge, { color: 'yellow' }, '⏸ PAUSED')
        ),

        mode === 'stopwatch' && h(Box, { justifyContent: 'center', marginTop: 1, gap: 1 },
            swRunning ?
                h(Badge, { color: 'green' }, '▶ RUNNING') :
                h(Badge, { color: 'gray' }, '⏹ STOPPED')
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'cyan' }, '1'),
            h(Badge, { color: 'magenta' }, '2'),
            h(Badge, { color: 'yellow' }, '3'),
            h(Text, { color: '#555555' }, 'mode'),
            h(Text, { color: '#333333' }, '│'),
            mode !== 'clock' && [
                h(Badge, { key: 'sp', color: 'green' }, 'SPACE'),
                h(Text, { key: 'ss', color: '#555555' }, 'start/stop'),
                h(Badge, { key: 'r', color: 'red' }, 'R'),
                h(Text, { key: 'rs', color: '#555555' }, 'reset'),
            ],
            mode === 'timer' && !inputMode && [
                h(Badge, { key: 's', color: 'cyan' }, 'S'),
                h(Text, { key: 'st', color: '#555555' }, 'set'),
            ]
        )
    );
};

export default Program;
