import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import { BarChart } from '@pppp606/ink-chart';
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

const getThemeColors = (t) => ({
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' },
    Mono: { accent: '#ffffff', secondary: '#888888', good: '#ffffff', warn: '#aaaaaa', bad: '#666666' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', good: '#00ff00', warn: '#88ff00', bad: '#ff0000' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', good: '#ffcc00', warn: '#ff8800', bad: '#ff4400' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' });

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};

const Program = ({ isFocused }) => {
    const colors = getThemeColors(loadTheme());
    const [stats, setStats] = useState(null);
    const [section, setSection] = useState(0);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [memHistory, setMemHistory] = useState([]);

    const sections = ['OVERVIEW', 'CPU', 'MEMORY', 'DISK', 'NETWORK'];

    const loadStats = () => {
        const cpus = os.cpus();
        const nets = os.networkInterfaces();
        const extNets = [];
        for (const [name, addrs] of Object.entries(nets)) {
            if (addrs) {
                for (const addr of addrs) {
                    extNets.push({ name, address: addr.address, family: addr.family, mac: addr.mac, internal: addr.internal });
                }
            }
        }

        // Get disk info (Linux)
        let diskInfo = [];
        try {
            const df = require('child_process').execSync('df -h 2>/dev/null | grep -E "^/dev"', { encoding: 'utf-8' });
            diskInfo = df.trim().split('\n').map(line => {
                const parts = line.trim().split(/\s+/);
                return { device: parts[0], size: parts[1], used: parts[2], avail: parts[3], percent: parseInt(parts[4]) || 0, mount: parts[5] };
            }).slice(0, 5);
        } catch { }

        const usedMem = os.totalmem() - os.freemem();
        const memPercent = Math.round((usedMem / os.totalmem()) * 100);
        const loadPercent = Math.round((os.loadavg()[0] / cpus.length) * 100);

        setStats({
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            uptime: os.uptime(),
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            usedMem,
            memPercent,
            cpuModel: cpus[0]?.model || 'Unknown',
            cpuCount: cpus.length,
            cpuSpeed: cpus[0]?.speed || 0,
            loadAvg: os.loadavg(),
            loadPercent,
            networks: extNets,
            disks: diskInfo,
            userInfo: os.userInfo(),
            homedir: os.homedir(),
            cpuTimes: cpus.map(c => c.times),
        });

        setCpuHistory(prev => [...prev.slice(-19), loadPercent]);
        setMemHistory(prev => [...prev.slice(-19), memPercent]);
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 2000);
        return () => clearInterval(interval);
    }, []);

    useInput((input, key) => {
        if (!isFocused) return;
        if (key.leftArrow) setSection(i => (i > 0 ? i - 1 : sections.length - 1));
        if (key.rightArrow) setSection(i => (i < sections.length - 1 ? i + 1 : 0));
        if (input >= '1' && input <= '5') setSection(parseInt(input) - 1);
    }, { isActive: isFocused });

    if (!stats) return h(Text, { color: '#555555' }, 'Loading...');

    const borderColor = isFocused ? colors.accent : '#333333';
    const Row = ({ label, value, valueColor }) =>
        h(Box, null,
            h(Box, { width: 16 }, h(Text, { color: '#555555' }, label)),
            h(Text, { color: valueColor || '#ffffff' }, value)
        );

    const StatusBadge = ({ value, thresholds }) => {
        const color = value > thresholds[1] ? 'red' : value > thresholds[0] ? 'yellow' : 'green';
        return h(Badge, { color }, `${value}%`);
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: colors.accent, bold: true }, 'SYSTEM INFORMATION'),
            h(Box, { gap: 1 },
                h(Badge, { color: 'cyan' }, 'LIVE'),
                h(Text, { color: '#555555' }, stats.hostname)
            )
        ),

        // Section tabs
        h(Box, { paddingX: 1, gap: 1 },
            ...sections.map((s, i) =>
                h(Box, { key: s },
                    h(Badge, { color: section === i ? 'cyan' : 'gray' }, `${i + 1}`),
                    h(Text, { color: section === i ? colors.accent : '#555555', bold: section === i }, ` ${s}`)
                )
            )
        ),

        h(Box, { paddingX: 1 }, h(Text, { color: '#333333' }, '─'.repeat(55))),

        // Content
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },
            sections[section] === 'OVERVIEW' && [
                h(Box, { key: 'status', marginBottom: 1, gap: 2 },
                    h(Box, null, h(Text, { color: '#555555' }, 'CPU: '), h(StatusBadge, { value: stats.loadPercent, thresholds: [50, 80] })),
                    h(Box, null, h(Text, { color: '#555555' }, 'MEM: '), h(StatusBadge, { value: stats.memPercent, thresholds: [60, 85] }))
                ),
                h(Row, { key: 'host', label: 'Hostname', value: stats.hostname }),
                h(Row, { key: 'user', label: 'User', value: stats.userInfo.username }),
                h(Row, { key: 'platform', label: 'Platform', value: `${stats.platform} ${stats.arch}` }),
                h(Row, { key: 'kernel', label: 'Kernel', value: stats.release }),
                h(Row, { key: 'uptime', label: 'Uptime', value: formatUptime(stats.uptime), valueColor: colors.good }),
                h(Row, { key: 'cores', label: 'CPU', value: `${stats.cpuCount} cores @ ${stats.cpuSpeed}MHz` }),
                h(Row, { key: 'mem', label: 'Memory', value: `${formatBytes(stats.usedMem)} / ${formatBytes(stats.totalMem)}` }),
            ],

            sections[section] === 'CPU' && [
                h(Row, { key: 'model', label: 'Model', value: stats.cpuModel }),
                h(Row, { key: 'cores', label: 'Cores', value: `${stats.cpuCount}` }),
                h(Row, { key: 'speed', label: 'Speed', value: `${stats.cpuSpeed} MHz` }),
                h(Text, { key: 'div1' }, ''),
                h(Row, { key: 'load1', label: 'Load (1m)', value: stats.loadAvg[0].toFixed(2), valueColor: stats.loadAvg[0] > stats.cpuCount ? colors.bad : colors.good }),
                h(Row, { key: 'load5', label: 'Load (5m)', value: stats.loadAvg[1].toFixed(2) }),
                h(Row, { key: 'load15', label: 'Load (15m)', value: stats.loadAvg[2].toFixed(2) }),
                h(Text, { key: 'div2' }, ''),
                h(Text, { key: 'chTitle', color: '#555555' }, 'CPU Load History:'),
                cpuHistory.length > 2 && h(BarChart, {
                    key: 'chart',
                    data: cpuHistory.map((v, i) => ({ label: '', value: v })),
                    height: 4,
                    barColor: colors.accent,
                }),
            ],

            sections[section] === 'MEMORY' && [
                h(Box, { key: 'status', marginBottom: 1 },
                    h(StatusBadge, { value: stats.memPercent, thresholds: [60, 85] }),
                    h(Text, { color: '#888888' }, ` ${formatBytes(stats.usedMem)} used`)
                ),
                h(Row, { key: 'total', label: 'Total', value: formatBytes(stats.totalMem) }),
                h(Row, { key: 'used', label: 'Used', value: formatBytes(stats.usedMem), valueColor: stats.memPercent > 80 ? colors.bad : colors.good }),
                h(Row, { key: 'free', label: 'Available', value: formatBytes(stats.freeMem) }),
                h(Text, { key: 'div' }, ''),
                h(Text, { key: 'chTitle', color: '#555555' }, 'Memory Usage History:'),
                memHistory.length > 2 && h(BarChart, {
                    key: 'chart',
                    data: memHistory.map((v, i) => ({ label: '', value: v })),
                    height: 4,
                    barColor: colors.secondary,
                }),
            ],

            sections[section] === 'DISK' && (
                stats.disks.length === 0 ?
                    h(Text, { color: '#555555' }, 'No disk information available') :
                    stats.disks.map((disk, i) =>
                        h(Box, { key: i, flexDirection: 'column', marginBottom: 1 },
                            h(Box, { gap: 1 },
                                h(Text, { color: colors.accent, bold: true }, disk.mount),
                                h(Badge, { color: disk.percent > 90 ? 'red' : disk.percent > 70 ? 'yellow' : 'green' }, `${disk.percent}%`)
                            ),
                            h(Row, { label: '  Device', value: disk.device }),
                            h(Row, { label: '  Used/Total', value: `${disk.used} / ${disk.size}` }),
                            h(Row, { label: '  Available', value: disk.avail })
                        )
                    )
            ),

            sections[section] === 'NETWORK' && (
                stats.networks.length === 0 ?
                    h(Text, { color: '#555555' }, 'No network interfaces') :
                    stats.networks.filter(n => n.family === 'IPv4').map((net, i) =>
                        h(Box, { key: i, flexDirection: 'column', marginBottom: 1 },
                            h(Box, { gap: 1 },
                                h(Text, { color: colors.accent, bold: true }, net.name),
                                h(Badge, { color: net.internal ? 'gray' : 'green' }, net.internal ? 'LOCAL' : 'EXT')
                            ),
                            h(Row, { label: '  IPv4', value: net.address }),
                            h(Row, { label: '  MAC', value: net.mac })
                        )
                    )
            )
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'cyan' }, '←→'),
            h(Text, { color: '#555555' }, 'sections'),
            h(Badge, { color: 'cyan' }, '1-5'),
            h(Text, { color: '#555555' }, 'direct'),
            h(Text, { color: '#333333' }, '│'),
            h(Text, { color: '#555555' }, 'refresh: 2s')
        )
    );
};

export default Program;
