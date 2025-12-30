import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import { BarChart } from '@pppp606/ink-chart';
import os from 'os';
import { execSync } from 'child_process';
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

const getThemeColors = (t) => ({
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' },
    Mono: { accent: '#ffffff', secondary: '#888888', good: '#ffffff', warn: '#aaaaaa', bad: '#666666' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', good: '#00ff00', warn: '#88ff00', bad: '#ff0000' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', good: '#ffcc00', warn: '#ff8800', bad: '#ff4400' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' });

const getProcesses = () => {
    try {
        const output = execSync('ps aux --sort=-%cpu | head -16', { encoding: 'utf-8' });
        const lines = output.trim().split('\n');
        return lines.slice(1).map((line) => {
            const parts = line.trim().split(/\s+/);
            return {
                user: parts[0],
                pid: parts[1],
                cpu: parseFloat(parts[2]) || 0,
                mem: parseFloat(parts[3]) || 0,
                vsz: parseInt(parts[4]) || 0,
                rss: parseInt(parts[5]) || 0,
                stat: parts[7],
                time: parts[9],
                command: parts.slice(10).join(' ').slice(0, 35)
            };
        });
    } catch { return []; }
};

const formatMem = (kb) => {
    if (kb < 1024) return `${kb}K`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(0)}M`;
    return `${(kb / 1024 / 1024).toFixed(1)}G`;
};

const Program = ({ isFocused }) => {
    const colors = getThemeColors(loadTheme());
    const [processes, setProcesses] = useState([]);
    const [selected, setSelected] = useState(0);
    const [sortBy, setSortBy] = useState('cpu'); // cpu, mem, pid
    const [showDetail, setShowDetail] = useState(false);
    const [message, setMessage] = useState('');
    const [cpuData, setCpuData] = useState([]);

    const refreshProcesses = () => {
        let procs = getProcesses();
        if (sortBy === 'mem') procs.sort((a, b) => b.mem - a.mem);
        else if (sortBy === 'pid') procs.sort((a, b) => parseInt(a.pid) - parseInt(b.pid));
        else procs.sort((a, b) => b.cpu - a.cpu);
        setProcesses(procs);

        // Build CPU chart data from top 8 processes
        const topProcs = procs.slice(0, 8).map(p => ({
            label: p.command.slice(0, 8),
            value: Math.round(p.cpu)
        }));
        setCpuData(topProcs);
    };

    useEffect(() => {
        refreshProcesses();
        const interval = setInterval(refreshProcesses, 3000);
        return () => clearInterval(interval);
    }, [sortBy]);

    const killProcess = (pid) => {
        try {
            execSync(`kill ${pid}`);
            setMessage(`Sent SIGTERM to PID ${pid}`);
            setTimeout(() => setMessage(''), 3000);
            refreshProcesses();
        } catch (e) {
            setMessage(`Failed to kill ${pid}`);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    useInput((input, key) => {
        if (!isFocused) return;

        if (key.upArrow) setSelected(i => Math.max(0, i - 1));
        if (key.downArrow) setSelected(i => Math.min(processes.length - 1, i + 1));

        if (input === 'c') setSortBy('cpu');
        if (input === 'm') setSortBy('mem');
        if (input === 'p') setSortBy('pid');
        if (input === 'd' || key.return) setShowDetail(!showDetail);
        if (input === 'r') refreshProcesses();

        if (input === 'k' && processes[selected]) {
            killProcess(processes[selected].pid);
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? colors.accent : '#333333';
    const selectedProc = processes[selected];

    const getCpuColor = (cpu) => cpu > 50 ? colors.bad : cpu > 20 ? colors.warn : colors.good;
    const getMemColor = (mem) => mem > 50 ? colors.bad : mem > 20 ? colors.warn : colors.good;

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: colors.accent, bold: true }, 'PROCESS MANAGER'),
                h(Badge, { color: 'cyan' }, `${processes.length}`)
            ),
            h(Box, { gap: 1 },
                h(Text, { color: '#555555' }, 'Sort:'),
                h(Badge, { color: sortBy === 'cpu' ? 'cyan' : 'gray' }, 'CPU'),
                h(Badge, { color: sortBy === 'mem' ? 'magenta' : 'gray' }, 'MEM'),
                h(Badge, { color: sortBy === 'pid' ? 'yellow' : 'gray' }, 'PID')
            )
        ),

        // Message bar
        message && h(Box, { paddingX: 1, backgroundColor: '#333333' },
            h(Text, { color: colors.warn }, message)
        ),

        // Main content
        h(Box, { flexDirection: 'row', flexGrow: 1 },
            // Process list
            h(Box, { flexDirection: 'column', flexGrow: 1, width: showDetail ? '60%' : '100%' },
                // Column headers
                h(Box, { paddingX: 1, backgroundColor: '#111111' },
                    h(Box, { width: 7 }, h(Text, { color: '#555555', bold: true }, 'PID')),
                    h(Box, { width: 7 }, h(Text, { color: sortBy === 'cpu' ? colors.accent : '#555555', bold: true }, 'CPU%')),
                    h(Box, { width: 7 }, h(Text, { color: sortBy === 'mem' ? colors.secondary : '#555555', bold: true }, 'MEM%')),
                    h(Box, { width: 7 }, h(Text, { color: '#555555' }, 'RSS')),
                    h(Text, { color: '#555555', bold: true }, 'COMMAND')
                ),

                // Process rows
                h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                    ...processes.slice(0, 12).map((p, i) => {
                        const isSel = i === selected;
                        return h(Box, { key: p.pid, backgroundColor: isSel ? '#222222' : undefined },
                            h(Text, { color: isSel ? colors.accent : '#444444' }, isSel ? '▶' : ' '),
                            h(Box, { width: 6 }, h(Text, { color: '#888888' }, p.pid)),
                            h(Box, { width: 7 }, h(Text, { color: getCpuColor(p.cpu) }, p.cpu.toFixed(1))),
                            h(Box, { width: 7 }, h(Text, { color: getMemColor(p.mem) }, p.mem.toFixed(1))),
                            h(Box, { width: 7 }, h(Text, { color: '#666666' }, formatMem(p.rss))),
                            h(Text, { color: isSel ? '#ffffff' : '#888888' }, p.command)
                        );
                    })
                )
            ),

            // Detail panel
            showDetail && selectedProc && h(Box, {
                flexDirection: 'column', width: '40%',
                borderStyle: 'single', borderColor: '#333333',
                borderTop: false, borderBottom: false, borderRight: false,
                paddingX: 1,
            },
                h(Text, { color: colors.accent, bold: true }, 'DETAILS'),
                h(Text, null, ''),
                h(Box, null, h(Text, { color: '#555555' }, 'PID: '), h(Text, null, selectedProc.pid)),
                h(Box, null, h(Text, { color: '#555555' }, 'User: '), h(Text, null, selectedProc.user)),
                h(Box, null, h(Text, { color: '#555555' }, 'Status: '), h(Text, null, selectedProc.stat)),
                h(Box, null, h(Text, { color: '#555555' }, 'Time: '), h(Text, null, selectedProc.time)),
                h(Box, null, h(Text, { color: '#555555' }, 'VSZ: '), h(Text, null, formatMem(selectedProc.vsz))),
                h(Box, null, h(Text, { color: '#555555' }, 'RSS: '), h(Text, null, formatMem(selectedProc.rss))),
                h(Text, null, ''),
                h(Text, { color: '#555555' }, 'CPU Usage:'),
                cpuData.length > 0 && h(BarChart, {
                    data: cpuData.slice(0, 6),
                    height: 3,
                    barColor: colors.accent,
                }),
            )
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'cyan' }, '↑↓'),
            h(Text, { color: '#555555' }, 'nav'),
            h(Badge, { color: 'cyan' }, 'C'),
            h(Badge, { color: 'magenta' }, 'M'),
            h(Badge, { color: 'yellow' }, 'P'),
            h(Text, { color: '#555555' }, 'sort'),
            h(Badge, { color: 'green' }, 'D'),
            h(Text, { color: '#555555' }, 'detail'),
            h(Badge, { color: 'red' }, 'K'),
            h(Text, { color: '#555555' }, 'kill'),
            h(Badge, { color: 'gray' }, 'R'),
            h(Text, { color: '#555555' }, 'refresh')
        )
    );
};

export default Program;
