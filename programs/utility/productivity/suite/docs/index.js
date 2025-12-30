import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { Badge } from '@inkjs/ui';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const h = React.createElement;

const SuiteDocs = ({ isFocused, onClose, settings, lockInput, unlockInput, savedState, saveState, clearState }) => {
    const currentTheme = settings?.theme || 'Cyberpunk';
    const themeColors = {
        Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', success: '#00ff88', error: '#ff4444', muted: '#666666' },
        Mono: { accent: '#ffffff', secondary: '#888888', success: '#ffffff', error: '#aaaaaa', muted: '#555555' },
        Matrix: { accent: '#00ff00', secondary: '#88ff00', success: '#00ff00', error: '#ff0000', muted: '#004400' },
        Amber: { accent: '#ffaa00', secondary: '#ff6600', success: '#ffcc00', error: '#ff3300', muted: '#663300' },
    };
    const colors = themeColors[currentTheme];

    const [mode, setMode] = React.useState('edit'); // edit, menu, file-open, file-save
    const [lines, setLines] = React.useState(['']);
    const [currentLine, setCurrentLine] = React.useState(0);
    const [currentFilePath, setCurrentFilePath] = React.useState('');
    const [inputValue, setInputValue] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [modified, setModified] = React.useState(false);
    const [scrollOffset, setScrollOffset] = React.useState(0);

    // Restore saved state on mount
    React.useEffect(() => {
        if (savedState) {
            if (savedState.lines) setLines(savedState.lines);
            if (savedState.currentLine !== undefined) setCurrentLine(savedState.currentLine);
            if (savedState.currentFilePath) setCurrentFilePath(savedState.currentFilePath);
            if (savedState.modified !== undefined) setModified(savedState.modified);
            setMessage('Document restored from saved state');
        }
    }, []);

    // Save state when document changes
    React.useEffect(() => {
        if (saveState) {
            saveState({
                lines,
                currentLine,
                currentFilePath,
                modified
            });
        }
    }, [lines, currentLine, currentFilePath, modified]);

    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Lock/unlock input
    React.useEffect(() => {
        const isTextInputMode = mode === 'file-open' || mode === 'file-save' || mode === 'edit-line';
        if (isFocused && isTextInputMode) {
            lockInput?.();
        } else {
            unlockInput?.();
        }
        return () => unlockInput?.();
    }, [mode, isFocused, lockInput, unlockInput]);

    const newDocument = () => {
        setLines(['']);
        setCurrentLine(0);
        setCurrentFilePath('');
        setModified(false);
        setMessage('New document created');
    };

    const openDocument = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);
            const content = await readFile(fullPath, 'utf-8');
            const docLines = content.split('\n');
            setLines(docLines.length > 0 ? docLines : ['']);
            setCurrentLine(0);
            setCurrentFilePath(fullPath);
            setModified(false);
            setMessage(`Opened ${path.basename(fullPath)}`);
            setMode('edit');
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    const saveDocument = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);
            const content = lines.join('\n');
            await writeFile(fullPath, content, 'utf-8');
            setCurrentFilePath(fullPath);
            setModified(false);
            setMessage(`Saved ${path.basename(fullPath)}`);
            setMode('edit');
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    const menuItems = [
        { label: 'New Document', value: 'new' },
        { label: 'Open Document', value: 'open' },
        { label: 'Save', value: 'save' },
        { label: 'Save As', value: 'save-as' },
        { label: 'Back to Edit', value: 'back' },
    ];

    const handleMenuSelect = (item) => {
        if (item.value === 'new') {
            newDocument();
            setMode('edit');
        } else if (item.value === 'open') {
            setMode('file-open');
            setInputValue('');
        } else if (item.value === 'save') {
            if (currentFilePath) {
                saveDocument(currentFilePath);
            } else {
                setMode('file-save');
                setInputValue('');
            }
        } else if (item.value === 'save-as') {
            setMode('file-save');
            setInputValue(currentFilePath || '');
        } else if (item.value === 'back') {
            setMode('edit');
        }
    };

    const insertLine = () => {
        const newLines = [...lines];
        newLines.splice(currentLine + 1, 0, '');
        setLines(newLines);
        setCurrentLine(currentLine + 1);
        setModified(true);
    };

    const deleteLine = () => {
        if (lines.length > 1) {
            const newLines = lines.filter((_, idx) => idx !== currentLine);
            setLines(newLines);
            setCurrentLine(Math.max(0, currentLine - 1));
            setModified(true);
        }
    };

    const editLine = () => {
        setInputValue(lines[currentLine]);
        setMode('edit-line');
    };

    const saveLineEdit = () => {
        const newLines = [...lines];
        newLines[currentLine] = inputValue;
        setLines(newLines);
        setModified(true);
        setMode('edit');
    };

    // Dedicated ESC handler
    useInput((input, key) => {
        if (!isFocused) return;
        if (key.escape) {
            if (mode === 'edit') {
                // Clear saved state on proper close
                if (clearState) clearState();
                onClose();
            } else {
                setMode('edit');
            }
        }
    }, { isActive: isFocused });

    useInput((input, key) => {
        if (!isFocused) return;

        if (mode === 'edit') {
            if (key.upArrow) {
                setCurrentLine(Math.max(0, currentLine - 1));
                if (currentLine < scrollOffset) setScrollOffset(scrollOffset - 1);
            } else if (key.downArrow) {
                setCurrentLine(Math.min(lines.length - 1, currentLine + 1));
                if (currentLine >= scrollOffset + 15) setScrollOffset(scrollOffset + 1);
            } else if (input === 'i' || input === 'I') {
                insertLine();
            } else if (input === 'd' || input === 'D') {
                deleteLine();
            } else if (input === 'e' || input === 'E') {
                editLine();
            } else if (input === 'm' || input === 'M') {
                setMode('menu');
            } else if (key.return) {
                editLine();
            }
        }
    }, { isActive: isFocused && mode === 'edit' });

    const renderHeader = () => {
        const fileName = currentFilePath ? path.basename(currentFilePath) : 'Untitled';
        const wordCount = lines.join(' ').split(/\s+/).filter(w => w).length;
        const charCount = lines.join('').length;

        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1, justifyContent: 'space-between' },
                h(Box, {},
                    h(Text, { bold: true, color: colors.accent }, 'Suite Docs'),
                    modified && h(Text, { color: colors.error }, ' *')
                ),
                h(Box, { gap: 1 },
                    h(Text, { color: colors.secondary }, fileName),
                    h(Badge, { color: 'blue' }, `${wordCount}w ${charCount}c`)
                )
            ),
            message && h(Box, { marginTop: 1, paddingX: 1 },
                h(Text, { color: colors.success }, message)
            )
        );
    };

    const renderDocument = () => {
        const visibleLines = lines.slice(scrollOffset, scrollOffset + 15);

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                ...visibleLines.map((line, idx) => {
                    const actualIdx = scrollOffset + idx;
                    const isSelected = actualIdx === currentLine;

                    return h(Box, { key: actualIdx },
                        h(Text, { color: colors.muted, dimColor: true }, `${String(actualIdx + 1).padStart(3)} `),
                        h(Text, {
                            color: isSelected ? colors.accent : '#ffffff',
                            bold: isSelected,
                            backgroundColor: isSelected ? colors.muted : undefined
                        }, isSelected ? '▶ ' : '  '),
                        h(Text, { color: isSelected ? colors.accent : '#ffffff' }, line || ' ')
                    );
                })
            )
        );
    };

    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'File Menu:'),
            h(SelectInput, { items: menuItems, onSelect: handleMenuSelect })
        );
    };

    const renderFileInput = (label, placeholder) => {
        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, label),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: () => {
                    if (mode === 'file-open') openDocument(inputValue);
                    else if (mode === 'file-save') saveDocument(inputValue);
                },
                placeholder
            })
        );
    };

    const renderLineEdit = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, `Edit Line ${currentLine + 1}:`),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: saveLineEdit,
                placeholder: 'Enter text...'
            })
        );
    };

    const renderFooter = () => {
        let shortcuts = '';
        if (mode === 'edit') {
            shortcuts = '↑↓: Navigate | E/Enter: Edit Line | I: Insert | D: Delete | M: Menu | ESC: Close';
        } else if (mode === 'menu') {
            shortcuts = '↑↓: Navigate | Enter: Select | ESC: Back';
        } else {
            shortcuts = 'Enter: Confirm | ESC: Cancel';
        }

        return h(Box, { marginTop: 1, borderStyle: 'single', borderColor: colors.muted, paddingX: 1, justifyContent: 'space-between' },
            h(Text, { color: colors.muted }, shortcuts),
            h(Text, { color: colors.muted }, `Line ${currentLine + 1}/${lines.length}`)
        );
    };

    const borderColor = isFocused ? colors.accent : colors.muted;

    return h(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor,
        flexGrow: 1,
        padding: 1
    },
        renderHeader(),
        mode === 'edit' && renderDocument(),
        mode === 'menu' && renderMenu(),
        mode === 'file-open' && renderFileInput('Open File:', 'e.g., ~/document.md'),
        mode === 'file-save' && renderFileInput('Save As:', 'e.g., ~/document.md'),
        mode === 'edit-line' && renderLineEdit(),
        renderFooter()
    );
};

export default SuiteDocs;
