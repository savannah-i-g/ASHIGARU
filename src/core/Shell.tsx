import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { Badge } from '@inkjs/ui';
import { StatusBar } from '../components/StatusBar.js';
import { MenuBar } from '../components/MenuBar.js';
import { Desktop } from '../components/Desktop.js';
import { useWindowManager, WindowContainer } from './WindowManager.js';
import { useSettings } from './SettingsContext.js';
import { programLoader } from './ProgramLoader.js';
import type { ProgramModule } from '../types/program.js';

interface CategoryData {
    name: string;
    programs: ProgramModule[];
}

interface LauncherProps {
    categories: CategoryData[];
    onSelect: (program: ProgramModule) => void;
    onClose: () => void;
}

const Launcher: React.FC<LauncherProps> = ({ categories, onSelect, onClose }) => {
    const { theme } = useSettings();
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [programIndex, setProgramIndex] = useState(0);

    const currentCategory = categories[categoryIndex];
    const currentProgram = currentCategory?.programs[programIndex];

    useInput((input, key) => {
        if (key.escape) { onClose(); return; }
        if (key.leftArrow) { setCategoryIndex((i: number) => (i > 0 ? i - 1 : categories.length - 1)); setProgramIndex(0); return; }
        if (key.rightArrow) { setCategoryIndex((i: number) => (i < categories.length - 1 ? i + 1 : 0)); setProgramIndex(0); return; }
        if (key.upArrow && currentCategory) { setProgramIndex((i: number) => (i > 0 ? i - 1 : currentCategory.programs.length - 1)); return; }
        if (key.downArrow && currentCategory) { setProgramIndex((i: number) => (i < currentCategory.programs.length - 1 ? i + 1 : 0)); return; }
        if (key.return && currentProgram) { onSelect(currentProgram); return; }
    });

    const totalPrograms = categories.reduce((sum: number, c: CategoryData) => sum + c.programs.length, 0);

    return (
        <Box flexDirection="column" borderStyle={theme.borderStyle} borderColor={theme.colors.accent.primary} width={64}>
            <Box paddingX={1} justifyContent="space-between" borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderTop={false} borderLeft={false} borderRight={false}>
                <Text color={theme.colors.accent.primary} bold>PROGRAM LAUNCHER</Text>
                <Text color={theme.colors.fg.muted}>{totalPrograms} programs</Text>
            </Box>
            <Box paddingX={1} gap={1}>
                {categories.map((cat: CategoryData, i: number) => (
                    <Box key={cat.name} gap={1}>
                        <Badge color={i === categoryIndex ? 'cyan' : 'gray'}>{cat.name.toUpperCase()}</Badge>
                    </Box>
                ))}
            </Box>
            <Box paddingX={1}><Text color={theme.colors.border.inactive}>{'─'.repeat(60)}</Text></Box>
            <Box flexDirection="column" paddingX={1} paddingY={1} minHeight={12}>
                {currentCategory?.programs.map((program: ProgramModule, index: number) => (
                    <Box key={program.manifest.id}>
                        <Text color={index === programIndex ? theme.colors.accent.primary : theme.colors.fg.muted}>{index === programIndex ? '>> ' : '   '}</Text>
                        <Box width={16}><Text color={index === programIndex ? theme.colors.fg.primary : theme.colors.fg.secondary} bold={index === programIndex}>{program.manifest.name}</Text></Box>
                        <Text color={theme.colors.fg.muted}>{program.manifest.description.slice(0, 28)}</Text>
                    </Box>
                ))}
                {(!currentCategory || currentCategory.programs.length === 0) && <Text color={theme.colors.fg.muted}>No programs</Text>}
            </Box>
            <Box paddingX={1} gap={1} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderBottom={false} borderLeft={false} borderRight={false}>
                <Badge color="cyan">{'<>'}</Badge>
                <Text color={theme.colors.fg.muted}>category</Text>
                <Badge color="cyan">↑↓</Badge>
                <Text color={theme.colors.fg.muted}>select</Text>
                <Badge color="green">Enter</Badge>
                <Text color={theme.colors.fg.muted}>launch</Text>
                <Badge color="red">^L</Badge>
                <Text color={theme.colors.fg.muted}>close</Text>
            </Box>
        </Box>
    );
};

interface WindowListProps {
    onClose: () => void;
}

const WindowList: React.FC<WindowListProps> = ({ onClose }) => {
    const { theme } = useSettings();
    const { windows, focusWindow, closeWindow, restoreWindow, minimizeWindow } = useWindowManager();
    const [selected, setSelected] = useState(0);

    useInput((input, key) => {
        if (key.escape) { onClose(); return; }
        if (key.upArrow) { setSelected((i) => Math.max(0, i - 1)); return; }
        if (key.downArrow) { setSelected((i) => Math.min(windows.length - 1, i + 1)); return; }
        if (key.return || input === ' ') {
            if (windows[selected]) {
                const win = windows[selected];
                if (win.isMinimized) {
                    restoreWindow(win.id);
                } else {
                    focusWindow(win.id);
                }
                onClose();
            }
            return;
        }
        if (input === 'm' && windows[selected]) {
            if (windows[selected].isMinimized) {
                restoreWindow(windows[selected].id);
            } else {
                minimizeWindow(windows[selected].id);
            }
            return;
        }
        if (input === 'x' && windows[selected]) {
            closeWindow(windows[selected].id);
            setSelected((i) => Math.max(0, i - 1));
            return;
        }
    });

    return (
        <Box flexDirection="column" borderStyle={theme.borderStyle} borderColor={theme.colors.accent.secondary} width={52}>
            <Box paddingX={1} justifyContent="space-between" borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderTop={false} borderLeft={false} borderRight={false}>
                <Text color={theme.colors.accent.secondary} bold>WINDOW MANAGER</Text>
                <Text color={theme.colors.fg.muted}>{windows.length} windows</Text>
            </Box>
            <Box flexDirection="column" paddingX={1} paddingY={1} minHeight={6}>
                {windows.length === 0 ? (
                    <Text color={theme.colors.fg.muted}>No windows open</Text>
                ) : (
                    windows.map((win, i) => {
                        const isSel = i === selected;
                        const statusIcon = win.isMinimized ? '[-]' : win.isFocused ? '[*]' : '[ ]';
                        const statusColor = win.isMinimized ? theme.colors.fg.muted : win.isFocused ? theme.colors.status.success : theme.colors.fg.secondary;
                        return (
                            <Box key={win.id}>
                                <Text color={isSel ? theme.colors.accent.secondary : theme.colors.fg.muted}>{isSel ? '> ' : '  '}</Text>
                                <Text color={statusColor}>{statusIcon} </Text>
                                <Text color={isSel ? theme.colors.fg.primary : theme.colors.fg.secondary}>{win.program.manifest.name}</Text>
                                {win.isMinimized && <Text color={theme.colors.fg.muted}> (minimized)</Text>}
                            </Box>
                        );
                    })
                )}
            </Box>
            <Box paddingX={1} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderBottom={false} borderLeft={false} borderRight={false}>
                <Text color={theme.colors.fg.muted}>[enter] focus  [m] toggle min  [x] close  [^L] back</Text>
            </Box>
        </Box>
    );
};

export const Shell: React.FC = () => {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const { theme } = useSettings();
    const { windows, openWindow, closeWindow, focusNext, focusedWindowId, minimizeFocused, inputLocked } = useWindowManager();
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [showLauncher, setShowLauncher] = useState(false);
    const [showWindowList, setShowWindowList] = useState(false);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('loading...');
    const [terminalHeight, setTerminalHeight] = useState(stdout?.rows || 24);

    const visibleWindows = windows.filter((w) => !w.isMinimized);

    useEffect(() => {
        const updateSize = () => { if (stdout) setTerminalHeight(stdout.rows); };
        updateSize();
        stdout?.on('resize', updateSize);
        return () => { stdout?.off('resize', updateSize); };
    }, [stdout]);

    useEffect(() => {
        const loadPrograms = async () => {
            const grouped = await programLoader.getByCategories();
            const cats: CategoryData[] = [];
            const order = ['system', 'utility', 'other'];
            for (const catName of order) {
                if (grouped.has(catName)) { cats.push({ name: catName, programs: grouped.get(catName)! }); grouped.delete(catName); }
            }
            for (const [name, programs] of grouped) { cats.push({ name, programs }); }
            setCategories(cats);
            const total = cats.reduce((sum: number, c: CategoryData) => sum + c.programs.length, 0);
            setStatus(`${total} programs`);
            setLoading(false);
        };
        loadPrograms();
    }, []);

    const closeFocusedWindow = () => {
        if (focusedWindowId) {
            closeWindow(focusedWindowId);
            if (visibleWindows.length <= 1) setStatus('closed');
        }
    };

    useInput((input, key) => {
        // Don't process system shortcuts if input is locked by a program
        if (inputLocked) return;
        if (showLauncher || showWindowList) return;

        if (input === 'q') { exit(); return; }
        if ((input === 'x' || input === 'w') && visibleWindows.length > 0) { closeFocusedWindow(); return; }
        if (input === 'm' && visibleWindows.length > 0) { minimizeFocused(); return; }
        if (key.ctrl && input === 'l') { setShowLauncher(true); return; }
        if (key.tab) { focusNext(); return; }
        if (input === '`' || input === '~') { setShowWindowList(true); return; }
    });

    const handleLaunch = (program: ProgramModule) => {
        openWindow(program);
        setShowLauncher(false);
        setStatus(program.manifest.name);
    };

    const currentProgram = windows.find((w) => w.isFocused)?.program.manifest.name;
    const minimizedCount = windows.filter((w) => w.isMinimized).length;

    return (
        <Box flexDirection="column" width="100%" height={terminalHeight} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive}>
            <MenuBar title="ASHIGARU" />
            <Box borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderTop={false} borderLeft={false} borderRight={false} />

            <Box flexGrow={1}>
                {loading ? (
                    <Box justifyContent="center" alignItems="center" flexGrow={1}><Text color={theme.colors.fg.muted}>loading...</Text></Box>
                ) : showWindowList ? (
                    <Box justifyContent="center" alignItems="center" flexGrow={1}>
                        <WindowList onClose={() => setShowWindowList(false)} />
                    </Box>
                ) : showLauncher ? (
                    <Box justifyContent="center" alignItems="center" flexGrow={1}>
                        <Launcher categories={categories} onSelect={handleLaunch} onClose={() => setShowLauncher(false)} />
                    </Box>
                ) : visibleWindows.length > 0 ? (
                    <WindowContainer />
                ) : (
                    <Desktop />
                )}
            </Box>

            <Box borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderBottom={false} borderLeft={false} borderRight={false} />
            <StatusBar
                programName={currentProgram || 'ASHIGARU'}
                status={minimizedCount > 0 ? `${status} | ${minimizedCount} minimized` : status}
            />
        </Box>
    );
};
