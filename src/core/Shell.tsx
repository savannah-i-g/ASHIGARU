import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { Badge } from '@inkjs/ui';
import TextInput from 'ink-text-input';
import { StatusBar } from '../components/StatusBar.js';
import { MenuBar } from '../components/MenuBar.js';
import { Desktop } from '../components/Desktop.js';
import { useWindowManager, WindowContainer } from './WindowManager.js';
import { useSettings } from './SettingsContext.js';
import { programLoader, DirectoryContents } from './ProgramLoader.js';
import type { ProgramModule } from '../types/program.js';

/**
 * Scrolling text component - scrolls when selected, truncates when not
 */
const ScrollingText: React.FC<{
    text: string;
    maxWidth: number;
    isSelected: boolean;
    color: string;
}> = ({ text, maxWidth, isSelected, color }) => {
    const [offset, setOffset] = useState(0);

    // Reset offset when selection changes
    useEffect(() => {
        setOffset(0);
    }, [isSelected, text]);

    // Scroll animation when selected and text is too long
    useEffect(() => {
        if (!isSelected || text.length <= maxWidth) {
            setOffset(0);
            return;
        }

        const totalLength = text.length + 3; // Add spacing for loop
        const interval = setInterval(() => {
            setOffset((prev) => (prev + 1) % totalLength);
        }, 300); // Scroll speed

        return () => clearInterval(interval);
    }, [isSelected, text, maxWidth]);

    // If text fits, just show it
    if (text.length <= maxWidth) {
        return <Text color={color}>{text}</Text>;
    }

    // If not selected, truncate with ellipsis
    if (!isSelected) {
        return <Text color={color}>{text.slice(0, maxWidth - 3) + '...'}</Text>;
    }

    // Scrolling text when selected
    const paddedText = text + '   ' + text; // Loop seamlessly
    const visibleText = paddedText.slice(offset, offset + maxWidth);

    return <Text color={color}>{visibleText}</Text>;
};

interface LauncherProps {
    onSelect: (program: ProgramModule) => void;
    onClose: () => void;
}

/**
 * Search modal for filtering all programs
 */
const SearchModal: React.FC<{
    onSelect: (program: ProgramModule) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const { theme } = useSettings();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProgramModule[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(true);

    useEffect(() => {
        const search = async () => {
            if (query.length > 0) {
                const found = await programLoader.searchPrograms(query);
                setResults(found);
                setSelectedIndex(0);
            } else {
                setResults([]);
            }
        };
        search();
    }, [query]);

    useInput((input, key) => {
        if (!isSearching) {
            if (key.escape) {
                onClose();
                return;
            }
            if (key.upArrow) {
                setSelectedIndex((i) => Math.max(0, i - 1));
                return;
            }
            if (key.downArrow) {
                setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
                return;
            }
            if (key.return && results[selectedIndex]) {
                onSelect(results[selectedIndex]);
                return;
            }
            if (key.tab) {
                setIsSearching(true);
                return;
            }
        } else {
            if (key.escape) {
                onClose();
                return;
            }
            if (key.downArrow || key.return) {
                if (results.length > 0) {
                    setIsSearching(false);
                }
                return;
            }
        }
    });

    return (
        <Box flexDirection="column" borderStyle={theme.borderStyle} borderColor={theme.colors.accent.secondary} width={60}>
            <Box paddingX={1} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderTop={false} borderLeft={false} borderRight={false}>
                <Text color={theme.colors.accent.secondary} bold>SEARCH PROGRAMS</Text>
            </Box>
            <Box paddingX={1} paddingY={1}>
                <Text color={theme.colors.fg.muted}>{'> '}</Text>
                <TextInput
                    value={query}
                    onChange={setQuery}
                    focus={isSearching}
                    placeholder="Type to search..."
                />
            </Box>
            <Box paddingX={1}><Text color={theme.colors.border.inactive}>{'─'.repeat(56)}</Text></Box>
            <Box flexDirection="column" paddingX={1} minHeight={8}>
                {results.length === 0 && query.length > 0 && (
                    <Text color={theme.colors.fg.muted}>No programs found</Text>
                )}
                {results.length === 0 && query.length === 0 && (
                    <Text color={theme.colors.fg.muted}>Start typing to search...</Text>
                )}
                {results.slice(0, 8).map((program, i) => {
                    const isSel = i === selectedIndex && !isSearching;
                    const relPath = programLoader.getProgramRelativePath(program);
                    return (
                        <Box key={program.manifest.id}>
                            <Text color={isSel ? theme.colors.accent.secondary : theme.colors.fg.muted}>
                                {isSel ? '>> ' : '   '}
                            </Text>
                            <Box width={18}>
                                <Text color={isSel ? theme.colors.fg.primary : theme.colors.fg.secondary} bold={isSel}>
                                    {program.manifest.name}
                                </Text>
                            </Box>
                            <Text color={theme.colors.fg.muted}>
                                {relPath ? `${relPath}/` : ''}{program.manifest.id}
                            </Text>
                        </Box>
                    );
                })}
            </Box>
            <Box paddingX={1} gap={1} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderBottom={false} borderLeft={false} borderRight={false}>
                <Badge color="cyan">↓</Badge>
                <Text color={theme.colors.fg.muted}>results</Text>
                <Badge color="green">Enter</Badge>
                <Text color={theme.colors.fg.muted}>launch</Text>
                <Badge color="red">ESC</Badge>
                <Text color={theme.colors.fg.muted}>back</Text>
            </Box>
        </Box>
    );
};

/**
 * File explorer-style program launcher with subdirectory navigation
 */
const Launcher: React.FC<LauncherProps> = ({ onSelect, onClose }) => {
    const { theme } = useSettings();
    const [currentPath, setCurrentPath] = useState('');
    const [contents, setContents] = useState<DirectoryContents>({ currentPath: '', folders: [], programs: [] });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(true);

    // Combined items: folders first, then programs
    const items: Array<{ type: 'folder' | 'program'; name: string; program?: ProgramModule }> = [
        ...contents.folders.map((f) => ({ type: 'folder' as const, name: f })),
        ...contents.programs.map((p) => ({ type: 'program' as const, name: p.manifest.name, program: p })),
    ];

    const breadcrumbs = currentPath ? ['PROGRAMS', ...currentPath.split('/')] : ['PROGRAMS'];

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const dir = await programLoader.getDirectoryContents(currentPath);
            setContents(dir);
            setSelectedIndex(0);
            setLoading(false);
        };
        load();
    }, [currentPath]);

    useInput((input, key) => {
        if (showSearch) return;

        if (key.escape) {
            if (currentPath) {
                // Go up one level
                const parts = currentPath.split('/');
                parts.pop();
                setCurrentPath(parts.join('/'));
            } else {
                onClose();
            }
            return;
        }

        if (input === '/') {
            setShowSearch(true);
            return;
        }

        if (key.upArrow) {
            setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1));
            return;
        }

        if (key.downArrow) {
            setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0));
            return;
        }

        if (key.backspace || key.leftArrow) {
            if (currentPath) {
                const parts = currentPath.split('/');
                parts.pop();
                setCurrentPath(parts.join('/'));
            }
            return;
        }

        if (key.return || key.rightArrow) {
            const item = items[selectedIndex];
            if (!item) return;

            if (item.type === 'folder') {
                // Navigate into folder
                setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name);
            } else if (item.program) {
                // Launch program
                onSelect(item.program);
            }
            return;
        }
    });

    if (showSearch) {
        return (
            <SearchModal
                onSelect={(p) => {
                    setShowSearch(false);
                    onSelect(p);
                }}
                onClose={() => setShowSearch(false)}
            />
        );
    }

    const totalPrograms = items.filter((i) => i.type === 'program').length;
    const totalFolders = items.filter((i) => i.type === 'folder').length;

    return (
        <Box flexDirection="column" borderStyle={theme.borderStyle} borderColor={theme.colors.accent.primary} width={64}>
            {/* Header */}
            <Box paddingX={1} justifyContent="space-between" borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderTop={false} borderLeft={false} borderRight={false}>
                <Text color={theme.colors.accent.primary} bold>PROGRAM LAUNCHER</Text>
                <Box gap={1}>
                    <Text color={theme.colors.fg.muted}>{totalFolders}🖿 {totalPrograms}⚙</Text>
                </Box>
            </Box>

            {/* Breadcrumb navigation */}
            <Box paddingX={1} paddingY={0}>
                {breadcrumbs.map((crumb, i) => (
                    <Box key={i}>
                        {i > 0 && <Text color={theme.colors.fg.muted}> {'>'} </Text>}
                        <Text color={i === breadcrumbs.length - 1 ? theme.colors.accent.primary : theme.colors.fg.muted} bold={i === breadcrumbs.length - 1}>
                            {crumb.toUpperCase()}
                        </Text>
                    </Box>
                ))}
            </Box>

            <Box paddingX={1}><Text color={theme.colors.border.inactive}>{'─'.repeat(60)}</Text></Box>

            {/* Contents */}
            <Box flexDirection="column" paddingX={1} paddingY={1} minHeight={12}>
                {loading ? (
                    <Text color={theme.colors.fg.muted}>Loading...</Text>
                ) : items.length === 0 ? (
                    <Text color={theme.colors.fg.muted}>Empty directory</Text>
                ) : (
                    items.slice(0, 10).map((item, index) => {
                        const isSel = index === selectedIndex;
                        const isFolder = item.type === 'folder';

                        return (
                            <Box key={item.name}>
                                <Text color={isSel ? theme.colors.accent.primary : theme.colors.fg.muted}>
                                    {isSel ? '>> ' : '   '}
                                </Text>
                                <Text color={isFolder ? theme.colors.accent.secondary : theme.colors.fg.muted}>
                                    {isFolder ? '🖿 ' : '⚙ '}
                                </Text>
                                <Box width={16}>
                                    <Text color={isSel ? theme.colors.fg.primary : theme.colors.fg.secondary} bold={isSel}>
                                        {item.name}
                                    </Text>
                                </Box>
                                <ScrollingText
                                    text={item.program ? item.program.manifest.description : 'Directory'}
                                    maxWidth={28}
                                    isSelected={isSel}
                                    color={theme.colors.fg.muted}
                                />
                            </Box>
                        );
                    })
                )}
            </Box>

            {/* Footer controls */}
            <Box paddingX={1} gap={1} borderStyle={theme.borderStyle} borderColor={theme.colors.border.inactive} borderBottom={false} borderLeft={false} borderRight={false}>
                <Badge color="cyan">↑↓</Badge>
                <Text color={theme.colors.fg.muted}>nav</Text>
                <Badge color="cyan">{'→'}</Badge>
                <Text color={theme.colors.fg.muted}>open</Text>
                <Badge color="cyan">{'←'}</Badge>
                <Text color={theme.colors.fg.muted}>back</Text>
                <Badge color="magenta">/</Badge>
                <Text color={theme.colors.fg.muted}>search</Text>
                <Badge color="red">ESC</Badge>
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
        const initialize = async () => {
            // Pre-load programs for fast launcher open
            const programs = await programLoader.getAllProgramsFlat();
            setStatus(`${programs.length} programs`);
            setLoading(false);
        };
        initialize();
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

        // All window controls require Ctrl modifier
        if (key.ctrl) {
            if (input === 'q') { exit(); return; }
            if ((input === 'x' || input === 'w') && visibleWindows.length > 0) { closeFocusedWindow(); return; }
            if (input === 'd' && visibleWindows.length > 0) { minimizeFocused(); return; }
            if (input === 'l') { setShowLauncher(true); return; }
        }
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
                        <Launcher onSelect={handleLaunch} onClose={() => setShowLauncher(false)} />
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
