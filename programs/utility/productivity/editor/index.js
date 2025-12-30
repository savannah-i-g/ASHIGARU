import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Badge } from '@inkjs/ui';
import { ScrollView } from 'ink-scroll-view';
import SyntaxHighlight from 'ink-syntax-highlight';
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
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', lineNum: '#555555', cursor: '#00ffff', status: '#00ff88' },
    Mono: { accent: '#ffffff', secondary: '#888888', lineNum: '#555555', cursor: '#ffffff', status: '#aaaaaa' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', lineNum: '#005500', cursor: '#00ff00', status: '#00ff00' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', lineNum: '#553300', cursor: '#ffaa00', status: '#ffcc00' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', lineNum: '#555555', cursor: '#00ffff', status: '#00ff88' });

const getLanguage = (filepath) => {
    const ext = path.extname(filepath).toLowerCase();
    const map = {
        '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
        '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
        '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown',
        '.html': 'html', '.css': 'css', '.sh': 'bash', '.bash': 'bash',
    };
    return map[ext] || 'text';
};

const Program = ({ isFocused, onClose, lockInput, unlockInput }) => {
    const colors = getThemeColors(loadTheme());
    const { stdout } = useStdout();
    const viewportHeight = (stdout?.rows || 24) - 8;

    const [mode, setMode] = useState('normal'); // normal, insert, command, browse
    const [lines, setLines] = useState(['']);
    const [cursorX, setCursorX] = useState(0);
    const [cursorY, setCursorY] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [filePath, setFilePath] = useState('');
    const [modified, setModified] = useState(false);
    const [command, setCommand] = useState('');
    const [message, setMessage] = useState('Type :e <path> to open, :w to save, :q to quit');
    const [browseDir, setBrowseDir] = useState(os.homedir());
    const [browseItems, setBrowseItems] = useState([]);
    const [browseIndex, setBrowseIndex] = useState(0);

    const scrollRef = useRef(null);

    // Load directory for browse mode
    const loadDirectory = (dir) => {
        try {
            const items = fs.readdirSync(dir).map(name => {
                const fullPath = path.join(dir, name);
                try {
                    const stat = fs.statSync(fullPath);
                    return { name, isDir: stat.isDirectory(), path: fullPath };
                } catch {
                    return { name, isDir: false, path: fullPath };
                }
            }).sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
            });
            setBrowseItems([{ name: '..', isDir: true, path: path.dirname(dir) }, ...items]);
            setBrowseDir(dir);
            setBrowseIndex(0);
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        }
    };

    // Open file
    const openFile = (filepath) => {
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            setLines(content.split('\n'));
            setFilePath(filepath);
            setCursorX(0);
            setCursorY(0);
            setScrollOffset(0);
            setModified(false);
            setMode('normal');
            setMessage(`Opened: ${filepath}`);
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        }
    };

    // Save file
    const saveFile = () => {
        if (!filePath) {
            setMessage('No file path. Use :w <path>');
            return;
        }
        try {
            fs.writeFileSync(filePath, lines.join('\n'));
            setModified(false);
            setMessage(`Saved: ${filePath}`);
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        }
    };

    // Lock/unlock input based on mode
    useEffect(() => {
        if ((mode === 'insert' || mode === 'command') && lockInput) {
            lockInput();
        } else if (unlockInput) {
            unlockInput();
        }
    }, [mode, lockInput, unlockInput]);

    useEffect(() => {
        return () => { if (unlockInput) unlockInput(); };
    }, [unlockInput]);

    // Keep cursor in view
    useEffect(() => {
        if (cursorY < scrollOffset) {
            setScrollOffset(cursorY);
        } else if (cursorY >= scrollOffset + viewportHeight) {
            setScrollOffset(cursorY - viewportHeight + 1);
        }
    }, [cursorY, viewportHeight]);

    const executeCommand = (cmd) => {
        const parts = cmd.trim().split(/\s+/);
        const action = parts[0];
        const arg = parts.slice(1).join(' ');

        if (action === 'q' || action === 'quit') {
            if (modified) {
                setMessage('Unsaved changes! Use :q! to force quit');
            } else {
                if (onClose) onClose();
            }
        } else if (action === 'q!') {
            if (onClose) onClose();
        } else if (action === 'w' || action === 'write') {
            if (arg) setFilePath(arg);
            saveFile();
        } else if (action === 'wq') {
            saveFile();
            if (onClose) onClose();
        } else if (action === 'e' || action === 'edit') {
            if (arg) {
                const fullPath = arg.startsWith('/') ? arg : path.join(os.homedir(), arg);
                openFile(fullPath);
            } else {
                loadDirectory(os.homedir());
                setMode('browse');
            }
        } else if (action === 'new') {
            setLines(['']);
            setFilePath('');
            setCursorX(0);
            setCursorY(0);
            setModified(false);
            setMessage('New file');
        } else {
            setMessage(`Unknown command: ${action}`);
        }
    };

    useInput((input, key) => {
        if (!isFocused) return;

        // ===== BROWSE MODE =====
        if (mode === 'browse') {
            if (key.escape) {
                setMode('normal');
                return;
            }
            if (key.upArrow) {
                setBrowseIndex(i => Math.max(0, i - 1));
                return;
            }
            if (key.downArrow) {
                setBrowseIndex(i => Math.min(browseItems.length - 1, i + 1));
                return;
            }
            if (key.return) {
                const item = browseItems[browseIndex];
                if (item) {
                    if (item.isDir) {
                        loadDirectory(item.path);
                    } else {
                        openFile(item.path);
                    }
                }
                return;
            }
            return;
        }

        // ===== COMMAND MODE =====
        if (mode === 'command') {
            if (key.escape) {
                setMode('normal');
                setCommand('');
                return;
            }
            if (key.return) {
                executeCommand(command);
                setMode('normal');
                setCommand('');
                return;
            }
            if (key.backspace || key.delete) {
                setCommand(c => c.slice(0, -1));
                return;
            }
            if (input && !key.ctrl && !key.meta) {
                setCommand(c => c + input);
            }
            return;
        }

        // ===== INSERT MODE =====
        if (mode === 'insert') {
            if (key.escape) {
                setMode('normal');
                return;
            }
            if (key.return) {
                const line = lines[cursorY] || '';
                const before = line.slice(0, cursorX);
                const after = line.slice(cursorX);
                const newLines = [...lines];
                newLines[cursorY] = before;
                newLines.splice(cursorY + 1, 0, after);
                setLines(newLines);
                setCursorY(y => y + 1);
                setCursorX(0);
                setModified(true);
                return;
            }
            if (key.backspace || key.delete) {
                if (cursorX > 0) {
                    const line = lines[cursorY];
                    const newLine = line.slice(0, cursorX - 1) + line.slice(cursorX);
                    const newLines = [...lines];
                    newLines[cursorY] = newLine;
                    setLines(newLines);
                    setCursorX(x => x - 1);
                    setModified(true);
                } else if (cursorY > 0) {
                    const prevLine = lines[cursorY - 1];
                    const currLine = lines[cursorY];
                    const newLines = [...lines];
                    newLines[cursorY - 1] = prevLine + currLine;
                    newLines.splice(cursorY, 1);
                    setLines(newLines);
                    setCursorY(y => y - 1);
                    setCursorX(prevLine.length);
                    setModified(true);
                }
                return;
            }
            if (key.leftArrow) { setCursorX(x => Math.max(0, x - 1)); return; }
            if (key.rightArrow) { setCursorX(x => Math.min((lines[cursorY] || '').length, x + 1)); return; }
            if (key.upArrow) { setCursorY(y => Math.max(0, y - 1)); return; }
            if (key.downArrow) { setCursorY(y => Math.min(lines.length - 1, y + 1)); return; }

            if (input && !key.ctrl && !key.meta) {
                const line = lines[cursorY] || '';
                const newLine = line.slice(0, cursorX) + input + line.slice(cursorX);
                const newLines = [...lines];
                newLines[cursorY] = newLine;
                setLines(newLines);
                setCursorX(x => x + input.length);
                setModified(true);
            }
            return;
        }

        // ===== NORMAL MODE =====
        if (input === ':') {
            setMode('command');
            setCommand('');
            return;
        }
        if (input === 'i') { setMode('insert'); return; }
        if (input === 'a') { setCursorX(x => Math.min((lines[cursorY] || '').length, x + 1)); setMode('insert'); return; }
        if (input === 'o') {
            const newLines = [...lines];
            newLines.splice(cursorY + 1, 0, '');
            setLines(newLines);
            setCursorY(y => y + 1);
            setCursorX(0);
            setMode('insert');
            setModified(true);
            return;
        }
        if (input === 'O') {
            const newLines = [...lines];
            newLines.splice(cursorY, 0, '');
            setLines(newLines);
            setCursorX(0);
            setMode('insert');
            setModified(true);
            return;
        }

        // Navigation
        if (input === 'h' || key.leftArrow) { setCursorX(x => Math.max(0, x - 1)); return; }
        if (input === 'l' || key.rightArrow) { setCursorX(x => Math.min((lines[cursorY] || '').length - 1, x + 1)); return; }
        if (input === 'j' || key.downArrow) { setCursorY(y => Math.min(lines.length - 1, y + 1)); return; }
        if (input === 'k' || key.upArrow) { setCursorY(y => Math.max(0, y - 1)); return; }
        if (input === '0') { setCursorX(0); return; }
        if (input === '$') { setCursorX((lines[cursorY] || '').length - 1); return; }
        if (input === 'g') { setCursorY(0); setCursorX(0); return; }
        if (input === 'G') { setCursorY(lines.length - 1); return; }

        // Delete line
        if (input === 'd') {
            if (lines.length > 1) {
                const newLines = [...lines];
                newLines.splice(cursorY, 1);
                setLines(newLines);
                if (cursorY >= newLines.length) setCursorY(newLines.length - 1);
                setModified(true);
            } else {
                setLines(['']);
                setCursorX(0);
                setModified(true);
            }
            return;
        }

        // Page navigation
        if (key.pageUp || (key.ctrl && input === 'u')) {
            setCursorY(y => Math.max(0, y - viewportHeight));
            return;
        }
        if (key.pageDown || (key.ctrl && input === 'd')) {
            setCursorY(y => Math.min(lines.length - 1, y + viewportHeight));
            return;
        }
    }, { isActive: isFocused });

    // Adjust cursor X after Y change
    useEffect(() => {
        const lineLen = (lines[cursorY] || '').length;
        if (cursorX > lineLen) {
            setCursorX(Math.max(0, lineLen - 1));
        }
    }, [cursorY, lines]);

    const borderColor = isFocused ? colors.accent : '#333333';
    const language = getLanguage(filePath);
    const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight);
    const lineNumWidth = String(lines.length).length + 1;

    const getModeColor = () => {
        switch (mode) {
            case 'insert': return 'green';
            case 'command': return 'yellow';
            case 'browse': return 'cyan';
            default: return 'gray';
        }
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 1 },
                h(Text, { color: colors.accent, bold: true }, '◢ EDITOR'),
                h(Badge, { color: getModeColor() }, mode.toUpperCase()),
                modified && h(Badge, { color: 'red' }, 'MODIFIED'),
            ),
            h(Text, { color: colors.lineNum }, filePath ? path.basename(filePath) : '[No File]')
        ),

        // Browse mode
        mode === 'browse' ?
            h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                h(Text, { color: colors.accent }, `◢ ${browseDir}`),
                h(Text, { color: '#333333' }, '─'.repeat(40)),
                h(Box, { flexDirection: 'column', flexGrow: 1 },
                    ...browseItems.slice(0, viewportHeight).map((item, i) =>
                        h(Box, { key: i },
                            h(Text, { color: i === browseIndex ? colors.accent : colors.lineNum }, i === browseIndex ? '▶ ' : '  '),
                            h(Text, { color: item.isDir ? colors.secondary : colors.accent }, item.isDir ? `${item.name}/` : item.name)
                        )
                    )
                )
            ) :
            // Editor content
            h(Box, { flexDirection: 'column', flexGrow: 1 },
                ...visibleLines.map((line, i) => {
                    const lineNum = scrollOffset + i;
                    const isCursorLine = lineNum === cursorY;

                    return h(Box, { key: lineNum },
                        h(Box, { width: lineNumWidth + 1 },
                            h(Text, { color: isCursorLine ? colors.accent : colors.lineNum },
                                String(lineNum + 1).padStart(lineNumWidth, ' ') + ' '
                            )
                        ),
                        h(Text, { color: isCursorLine ? '#ffffff' : '#cccccc' },
                            isCursorLine && mode !== 'command' ?
                                line.slice(0, cursorX) :
                                line
                        ),
                        isCursorLine && mode !== 'command' && h(Text, { backgroundColor: colors.cursor, color: '#000000' },
                            line[cursorX] || ' '
                        ),
                        isCursorLine && mode !== 'command' && h(Text, { color: '#cccccc' },
                            line.slice(cursorX + 1)
                        )
                    );
                })
            ),

        // Command/status line
        h(Box, {
            paddingX: 1,
            borderStyle: 'single', borderColor: mode === 'command' ? colors.accent : '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            mode === 'command' ?
                h(Box, null,
                    h(Text, { color: colors.accent }, ':'),
                    h(Text, null, command),
                    h(Text, { color: colors.cursor }, '█')
                ) :
                h(Text, { color: colors.lineNum }, message)
        ),

        // Footer
        h(Box, { paddingX: 1, gap: 1 },
            mode === 'normal' && [
                h(Badge, { key: 'i', color: 'green' }, 'i'),
                h(Text, { key: 'il', color: colors.lineNum }, 'insert'),
                h(Badge, { key: 'col', color: 'yellow' }, ':'),
                h(Text, { key: 'coll', color: colors.lineNum }, 'cmd'),
                h(Badge, { key: 'h', color: 'cyan' }, 'hjkl'),
                h(Text, { key: 'hl', color: colors.lineNum }, 'move'),
            ],
            mode === 'insert' && [
                h(Badge, { key: 'esc', color: 'red' }, 'ESC'),
                h(Text, { key: 'escl', color: colors.lineNum }, 'normal'),
            ],
            mode === 'command' && [
                h(Badge, { key: 'esc', color: 'red' }, 'ESC'),
                h(Text, { key: 'escl', color: colors.lineNum }, 'cancel'),
                h(Text, { key: 'cmds', color: colors.lineNum }, ':w :q :e :wq'),
            ],
            mode === 'browse' && [
                h(Badge, { key: 'esc', color: 'red' }, 'ESC'),
                h(Text, { key: 'escl', color: colors.lineNum }, 'cancel'),
                h(Badge, { key: 'ent', color: 'green' }, 'Enter'),
                h(Text, { key: 'entl', color: colors.lineNum }, 'open'),
            ],
            h(Text, { color: '#333333' }, '│'),
            h(Text, { color: colors.lineNum }, `Ln ${cursorY + 1}, Col ${cursorX + 1}`)
        )
    );
};

export default Program;
