import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import os from 'os';
import { useSettings } from '../core/SettingsContext.js';

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
};

export const Desktop: React.FC = () => {
    const { theme, settings, getWallpaperContent } = useSettings();
    const [time, setTime] = useState(new Date());
    const [stats, setStats] = useState({
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        cpuCount: os.cpus().length,
        loadAvg: os.loadavg()[0],
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
            setStats({
                hostname: os.hostname(),
                platform: os.platform(),
                uptime: os.uptime(),
                totalMem: os.totalmem(),
                freeMem: os.freemem(),
                cpuCount: os.cpus().length,
                loadAvg: os.loadavg()[0],
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const usedMem = stats.totalMem - stats.freeMem;
    const memPercent = Math.round((usedMem / stats.totalMem) * 100);
    const memBarWidth = 12;
    const memBarFilled = Math.round((memPercent / 100) * memBarWidth);

    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <Box flexDirection="column" flexGrow={1}>
            {/* Top row - Clock (left) and System (right) */}
            <Box justifyContent="space-between" paddingX={1}>
                {/* Top Left - Clock */}
                <Box flexDirection="column">
                    <Text color={theme.colors.accent.primary} bold>{timeStr}</Text>
                    <Text color={theme.colors.fg.muted}>{dateStr}</Text>
                </Box>

                {/* Top Right - System */}
                <Box flexDirection="column" alignItems="flex-end">
                    <Text color={theme.colors.fg.primary}>{stats.hostname}</Text>
                    <Text color={theme.colors.fg.muted}>{stats.platform} | up {formatUptime(stats.uptime)}</Text>
                </Box>
            </Box>

            {/* Center - Wallpaper */}
            <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column">
                {getWallpaperContent(settings.wallpaper).map((line, i) => {
                    // Map wallpaper color setting to actual color
                    const getWallpaperColor = () => {
                        switch (settings.wallpaperColor) {
                            case 'muted': return theme.colors.fg.muted;
                            case 'white': return '#ffffff';
                            case 'accent': return theme.colors.accent.primary;
                            case 'secondary': return theme.colors.accent.secondary;
                            case 'dim': return theme.colors.border.inactive;
                            case 'success': return theme.colors.status.success;
                            case 'warning': return theme.colors.status.warning;
                            case 'error': return theme.colors.status.error;
                            default: return theme.colors.fg.muted;
                        }
                    };
                    return <Text key={i} color={getWallpaperColor()}>{line}</Text>;
                })}
            </Box>

            {/* Bottom row - Memory (left) and CPU (right) */}
            <Box justifyContent="space-between" paddingX={1}>
                {/* Bottom Left - Memory */}
                <Box flexDirection="column">
                    <Box>
                        <Text color={theme.colors.fg.muted}>mem </Text>
                        <Text color={theme.colors.status.success}>{'='.repeat(memBarFilled)}</Text>
                        <Text color={theme.colors.border.inactive}>{'-'.repeat(memBarWidth - memBarFilled)}</Text>
                        <Text color={theme.colors.fg.muted}> {memPercent}%</Text>
                    </Box>
                    <Text color={theme.colors.fg.muted}>{formatBytes(usedMem)} / {formatBytes(stats.totalMem)}</Text>
                </Box>

                {/* Bottom Right - CPU */}
                <Box flexDirection="column" alignItems="flex-end">
                    <Text color={theme.colors.fg.muted}>{stats.cpuCount} cores</Text>
                    <Box>
                        <Text color={theme.colors.fg.muted}>load </Text>
                        <Text color={stats.loadAvg > stats.cpuCount ? theme.colors.status.error : theme.colors.fg.primary}>
                            {stats.loadAvg.toFixed(2)}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
