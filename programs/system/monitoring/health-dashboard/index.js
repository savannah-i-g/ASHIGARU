import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import { BarChart } from '@pppp606/ink-chart';
import si from 'systeminformation';
import os from 'os';

const h = React.createElement;

const SystemHealth = ({ isFocused, onClose, settings }) => {
    // Get theme colors
    const currentTheme = settings?.theme || 'Cyberpunk';
    const themeColors = {
        Cyberpunk: {
            accent: '#00ffff',
            secondary: '#ff00ff',
            bg: '#000000',
            success: '#00ff88',
            warning: '#ffaa00',
            error: '#ff4444',
            muted: '#666666'
        },
        Mono: {
            accent: '#ffffff',
            secondary: '#888888',
            bg: '#000000',
            success: '#ffffff',
            warning: '#aaaaaa',
            error: '#cccccc',
            muted: '#555555'
        },
        Matrix: {
            accent: '#00ff00',
            secondary: '#88ff00',
            bg: '#000000',
            success: '#00ff00',
            warning: '#88ff00',
            error: '#ff0000',
            muted: '#004400'
        },
        Amber: {
            accent: '#ffaa00',
            secondary: '#ff6600',
            bg: '#0a0500',
            success: '#ffcc00',
            warning: '#ff8800',
            error: '#ff3300',
            muted: '#663300'
        },
    };
    const colors = themeColors[currentTheme];

    // State management
    const [healthScore, setHealthScore] = React.useState(100);
    const [cpuUsage, setCpuUsage] = React.useState(0);
    const [memUsage, setMemUsage] = React.useState(0);
    const [diskUsage, setDiskUsage] = React.useState(0);
    const [loadAvg, setLoadAvg] = React.useState([0, 0, 0]);
    const [uptime, setUptime] = React.useState(0);
    const [issues, setIssues] = React.useState([]);
    const [suggestions, setSuggestions] = React.useState([]);
    const [lastUpdate, setLastUpdate] = React.useState(new Date());

    // Calculate health score based on system metrics
    const calculateHealthScore = (cpu, mem, disk, load) => {
        // CPU health: 0-100 (lower CPU usage = better health)
        const cpuHealth = Math.max(0, 100 - (cpu * 1.2));

        // Memory health: 0-100 (lower memory usage = better health)
        const memHealth = Math.max(0, 100 - (mem * 1.1));

        // Disk health: 0-100 (more free space = better health)
        const diskFree = 100 - disk;
        const diskHealth = Math.max(0, diskFree > 10 ? 100 - ((100 - diskFree) * 0.5) : diskFree * 5);

        // Load health: based on load average vs CPU count
        const cpuCount = os.cpus().length;
        const loadPct = (load[0] / cpuCount) * 100;
        const loadHealth = Math.max(0, 100 - loadPct);

        // Weighted average (CPU: 25%, Memory: 25%, Disk: 30%, Load: 20%)
        const overall = (cpuHealth * 0.25) + (memHealth * 0.25) + (diskHealth * 0.30) + (loadHealth * 0.20);

        return Math.round(Math.max(0, Math.min(100, overall)));
    };

    // Detect issues and generate suggestions
    const analyzeSystem = (cpu, mem, disk, load) => {
        const detectedIssues = [];
        const quickFixes = [];
        const cpuCount = os.cpus().length;
        const loadPct = (load[0] / cpuCount) * 100;

        // CPU issues
        if (cpu > 90) {
            detectedIssues.push({ severity: 'critical', category: 'CPU', message: `CPU usage critical: ${cpu.toFixed(1)}%` });
            quickFixes.push('• Check top processes with Process Manager');
            quickFixes.push('• Close unused applications to reduce CPU load');
        } else if (cpu > 75) {
            detectedIssues.push({ severity: 'warning', category: 'CPU', message: `CPU usage high: ${cpu.toFixed(1)}%` });
            quickFixes.push('• Monitor CPU-intensive processes');
        }

        // Memory issues
        if (mem > 90) {
            detectedIssues.push({ severity: 'critical', category: 'Memory', message: `Memory usage critical: ${mem.toFixed(1)}%` });
            quickFixes.push('• Clear system cache: sync && echo 3 > /proc/sys/vm/drop_caches');
            quickFixes.push('• Close memory-intensive applications');
            quickFixes.push('• Consider adding swap space if available');
        } else if (mem > 75) {
            detectedIssues.push({ severity: 'warning', category: 'Memory', message: `Memory usage high: ${mem.toFixed(1)}%` });
            quickFixes.push('• Monitor memory usage by process');
        }

        // Disk issues
        if (disk > 90) {
            detectedIssues.push({ severity: 'critical', category: 'Disk', message: `Disk usage critical: ${disk.toFixed(1)}%` });
            quickFixes.push('• Clean temp files: rm -rf /tmp/*');
            quickFixes.push('• Remove old logs: journalctl --vacuum-time=7d');
            quickFixes.push('• Check for large files: du -sh /* | sort -h');
        } else if (disk > 80) {
            detectedIssues.push({ severity: 'warning', category: 'Disk', message: `Disk usage high: ${disk.toFixed(1)}%` });
            quickFixes.push('• Review disk usage with File Browser');
        }

        // Load average issues
        if (loadPct > 100) {
            detectedIssues.push({ severity: 'critical', category: 'Load', message: `System load critical: ${load[0].toFixed(2)} (${cpuCount} cores)` });
            quickFixes.push('• Reduce background processes and services');
            quickFixes.push('• Check for runaway processes');
        } else if (loadPct > 75) {
            detectedIssues.push({ severity: 'warning', category: 'Load', message: `System load high: ${load[0].toFixed(2)}` });
        }

        // All good!
        if (detectedIssues.length === 0) {
            detectedIssues.push({ severity: 'info', category: 'System', message: 'All systems operating normally' });
            quickFixes.push('• System is healthy - no action needed');
        }

        setIssues(detectedIssues);
        setSuggestions(quickFixes);
    };

    // Fetch system metrics
    const fetchMetrics = async () => {
        try {
            // CPU usage
            const cpuLoad = await si.currentLoad();
            const cpu = cpuLoad.currentLoad;

            // Memory usage
            const mem = await si.mem();
            const memPct = (mem.used / mem.total) * 100;

            // Disk usage (main filesystem)
            const fsSize = await si.fsSize();
            const mainFs = fsSize[0] || {};
            const diskPct = mainFs.use || 0;

            // Load average
            const load = os.loadavg();

            // Uptime
            const uptimeSeconds = os.uptime();

            // Update state
            setCpuUsage(cpu);
            setMemUsage(memPct);
            setDiskUsage(diskPct);
            setLoadAvg(load);
            setUptime(uptimeSeconds);
            setLastUpdate(new Date());

            // Calculate health and analyze
            const score = calculateHealthScore(cpu, memPct, diskPct, load);
            setHealthScore(score);
            analyzeSystem(cpu, memPct, diskPct, load);

        } catch (err) {
            console.error('Error fetching metrics:', err);
        }
    };

    // Initial fetch and refresh interval
    React.useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000); // Update every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // Keyboard input
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            onClose();
        } else if (input === 'r' || input === 'R') {
            fetchMetrics();
        }
    }, { isActive: isFocused });

    // Format uptime
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    // Get health badge color
    const getHealthBadgeColor = (score) => {
        if (score >= 80) return 'green';
        if (score >= 60) return 'yellow';
        return 'red';
    };

    // Get severity badge color
    const getSeverityColor = (severity) => {
        if (severity === 'critical') return colors.error;
        if (severity === 'warning') return colors.warning;
        if (severity === 'info') return colors.success;
        return colors.muted;
    };

    // Render functions
    const renderHeader = () => {
        const badgeColor = getHealthBadgeColor(healthScore);
        const healthStatus = healthScore >= 80 ? 'Excellent' :
                            healthScore >= 60 ? 'Fair' : 'Critical';

        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1, justifyContent: 'space-between' },
                h(Box, {},
                    h(Text, { bold: true, color: colors.accent }, 'System Health Dashboard')
                ),
                h(Box, { gap: 1 },
                    h(Badge, { color: badgeColor }, `${healthScore}%`),
                    h(Text, { color: colors.secondary }, healthStatus)
                )
            )
        );
    };

    const renderMetrics = () => {
        const chartData = [
            { label: 'CPU', value: Math.round(cpuUsage) },
            { label: 'Memory', value: Math.round(memUsage) },
            { label: 'Disk', value: Math.round(diskUsage) },
        ];

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                h(Text, { bold: true, color: colors.secondary }, 'Resource Usage'),
                h(Box, { marginTop: 1 },
                    h(BarChart, {
                        data: chartData,
                        height: 8,
                        showValues: true,
                        color: colors.accent
                    })
                )
            )
        );
    };

    const renderSystemInfo = () => {
        const cpuCount = os.cpus().length;
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(1);

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                h(Text, { bold: true, color: colors.secondary }, 'System Information'),
                h(Box, { flexDirection: 'column', marginTop: 1 },
                    h(Box, {},
                        h(Text, { color: colors.muted }, 'Hostname: '),
                        h(Text, { color: colors.accent }, os.hostname())
                    ),
                    h(Box, {},
                        h(Text, { color: colors.muted }, 'Uptime: '),
                        h(Text, { color: colors.accent }, formatUptime(uptime))
                    ),
                    h(Box, {},
                        h(Text, { color: colors.muted }, 'CPU Cores: '),
                        h(Text, { color: colors.accent }, `${cpuCount}`)
                    ),
                    h(Box, {},
                        h(Text, { color: colors.muted }, 'Total Memory: '),
                        h(Text, { color: colors.accent }, `${totalMem} GB`)
                    ),
                    h(Box, {},
                        h(Text, { color: colors.muted }, 'Load Average: '),
                        h(Text, { color: colors.accent }, `${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}`)
                    )
                )
            )
        );
    };

    const renderIssues = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                h(Text, { bold: true, color: colors.secondary }, 'System Issues'),
                h(Box, { flexDirection: 'column', marginTop: 1 },
                    ...issues.slice(0, 5).map((issue, idx) =>
                        h(Box, { key: idx, marginBottom: idx < issues.length - 1 ? 1 : 0 },
                            h(Text, { color: getSeverityColor(issue.severity), bold: true }, `[${issue.category}] `),
                            h(Text, { color: '#ffffff' }, issue.message)
                        )
                    )
                )
            )
        );
    };

    const renderSuggestions = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                h(Text, { bold: true, color: colors.secondary }, 'Quick-Fix Suggestions'),
                h(Box, { flexDirection: 'column', marginTop: 1 },
                    ...suggestions.slice(0, 5).map((suggestion, idx) =>
                        h(Text, { key: idx, color: colors.muted }, suggestion)
                    )
                )
            )
        );
    };

    const renderFooter = () => {
        const timeStr = lastUpdate.toLocaleTimeString();

        return h(Box, { marginTop: 1, borderStyle: 'single', borderColor: colors.muted, paddingX: 1, justifyContent: 'space-between' },
            h(Text, { color: colors.muted }, 'R: Refresh | ESC: Close'),
            h(Text, { color: colors.muted }, `Updated: ${timeStr}`)
        );
    };

    // Main render
    const borderColor = isFocused ? colors.accent : colors.muted;

    return h(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor,
        flexGrow: 1,
        padding: 1
    },
        renderHeader(),
        renderMetrics(),
        renderSystemInfo(),
        renderIssues(),
        renderSuggestions(),
        renderFooter()
    );
};

export default SystemHealth;
