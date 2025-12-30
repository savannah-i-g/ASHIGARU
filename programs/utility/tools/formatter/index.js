import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import SyntaxHighlight from 'ink-syntax-highlight';
import { Badge } from '@inkjs/ui';
import { readFile, writeFile } from 'fs/promises';
import yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { diffLines } from 'diff';
import path from 'path';
import os from 'os';

const h = React.createElement;

const DataFormatter = ({ isFocused, onClose, settings, lockInput, unlockInput }) => {
    // Get theme colors
    const currentTheme = settings?.theme || 'Cyberpunk';
    const themeColors = {
        Cyberpunk: {
            accent: '#00ffff',
            secondary: '#ff00ff',
            bg: '#000000',
            success: '#00ff88',
            error: '#ff4444',
            muted: '#666666'
        },
        Mono: {
            accent: '#ffffff',
            secondary: '#888888',
            bg: '#000000',
            success: '#ffffff',
            error: '#aaaaaa',
            muted: '#555555'
        },
        Matrix: {
            accent: '#00ff00',
            secondary: '#88ff00',
            bg: '#000000',
            success: '#00ff00',
            error: '#ff0000',
            muted: '#004400'
        },
        Amber: {
            accent: '#ffaa00',
            secondary: '#ff6600',
            bg: '#0a0500',
            success: '#ffcc00',
            error: '#ff3300',
            muted: '#663300'
        },
    };
    const colors = themeColors[currentTheme];

    // State management
    const [mode, setMode] = React.useState('menu');
    const [content, setContent] = React.useState('');
    const [content2, setContent2] = React.useState(''); // For diff comparison
    const [format, setFormat] = React.useState('json'); // json, yaml, xml
    const [targetFormat, setTargetFormat] = React.useState('yaml');
    const [result, setResult] = React.useState('');
    const [error, setError] = React.useState('');
    const [inputValue, setInputValue] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [scrollOffset, setScrollOffset] = React.useState(0);
    const [operation, setOperation] = React.useState(''); // format, convert, diff

    // Auto-clear messages
    React.useEffect(() => {
        if (message || error) {
            const timer = setTimeout(() => {
                setMessage('');
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, error]);

    // Lock/unlock input based on mode
    React.useEffect(() => {
        const isTextInputMode = mode.includes('path') || mode.includes('paste');

        if (isFocused && isTextInputMode) {
            lockInput?.();
        } else {
            unlockInput?.();
        }

        // Cleanup: always unlock on unmount
        return () => {
            unlockInput?.();
        };
    }, [mode, isFocused, lockInput, unlockInput]);

    // Format detection
    const detectFormat = (text) => {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return 'json';
        } else if (trimmed.startsWith('<')) {
            return 'xml';
        } else {
            // Try to parse as YAML
            try {
                yaml.load(trimmed);
                return 'yaml';
            } catch {
                return 'unknown';
            }
        }
    };

    // Parse content based on format
    const parseContent = (text, fmt) => {
        try {
            if (fmt === 'json') {
                return JSON.parse(text);
            } else if (fmt === 'yaml') {
                return yaml.load(text);
            } else if (fmt === 'xml') {
                const parser = new XMLParser({
                    ignoreAttributes: false,
                    attributeNamePrefix: '@_'
                });
                return parser.parse(text);
            }
        } catch (err) {
            throw new Error(`Parse error: ${err.message}`);
        }
        return null;
    };

    // Stringify content to format
    const stringifyContent = (data, fmt) => {
        try {
            if (fmt === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (fmt === 'yaml') {
                return yaml.dump(data, { indent: 2, lineWidth: -1 });
            } else if (fmt === 'xml') {
                const builder = new XMLBuilder({
                    ignoreAttributes: false,
                    attributeNamePrefix: '@_',
                    format: true,
                    indentBy: '  '
                });
                return builder.build(data);
            }
        } catch (err) {
            throw new Error(`Stringify error: ${err.message}`);
        }
        return '';
    };

    // Handle format operation
    const handleFormat = async () => {
        try {
            const detected = detectFormat(content);
            const fmt = detected !== 'unknown' ? detected : format;

            const parsed = parseContent(content, fmt);
            const formatted = stringifyContent(parsed, fmt);

            setResult(formatted);
            setFormat(fmt);
            setMode('format-view');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle convert operation
    const handleConvert = async () => {
        try {
            const parsed = parseContent(content, format);
            const converted = stringifyContent(parsed, targetFormat);

            setResult(converted);
            setMode('convert-view');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle diff operation
    const handleDiff = () => {
        try {
            const diff = diffLines(content, content2);
            let diffOutput = '';

            diff.forEach(part => {
                const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
                const lines = part.value.split('\n').filter(l => l);
                lines.forEach(line => {
                    diffOutput += prefix + line + '\n';
                });
            });

            setResult(diffOutput || 'No differences found');
            setMode('diff-view');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Load file
    const loadFile = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);

            const fileContent = await readFile(fullPath, 'utf-8');
            return fileContent;
        } catch (err) {
            throw new Error(`Failed to load file: ${err.message}`);
        }
    };

    // Save file
    const handleSave = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);

            await writeFile(fullPath, result, 'utf-8');
            setMessage(`Saved to ${fullPath}`);
            setMode(operation === 'format' ? 'format-view' : 'convert-view');
        } catch (err) {
            setError(`Save failed: ${err.message}`);
        }
    };

    // Dedicated ESC handler (works even when input is locked)
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (mode === 'menu') {
                onClose();
            } else {
                setMode('menu');
                setContent('');
                setContent2('');
                setResult('');
                setError('');
                setInputValue('');
                setScrollOffset(0);
            }
        }
    }, { isActive: isFocused });

    // Keyboard input handling for non-text-input modes
    useInput((input, key) => {
        if (!isFocused) return;

        // Scrolling in view modes
        if ((mode === 'format-view' || mode === 'convert-view' || mode === 'diff-view')) {
            if (key.upArrow) {
                setScrollOffset(Math.max(0, scrollOffset - 1));
            } else if (key.downArrow) {
                const lines = result.split('\n').length;
                setScrollOffset(Math.min(lines - 10, scrollOffset + 1));
            } else if (input === 's' || input === 'S') {
                setMode('save-path');
                setInputValue('');
            }
        }
    }, { isActive: isFocused && !['menu', 'format-input-method', 'format-select', 'convert-source-format', 'convert-target-format', 'diff-method'].includes(mode) && mode.indexOf('paste') === -1 && mode.indexOf('path') === -1 });

    // Main menu items
    const menuItems = [
        { label: 'Format & Validate', value: 'format' },
        { label: 'Convert Format', value: 'convert' },
        { label: 'Compare Files (Diff)', value: 'diff' },
        { label: 'Exit', value: 'exit' },
    ];

    const handleMenuSelect = (item) => {
        if (item.value === 'exit') {
            onClose();
        } else {
            setOperation(item.value);
            setMode(`${item.value}-input-method`);
        }
    };

    // Input method items
    const inputMethodItems = [
        { label: 'Load from file', value: 'file' },
        { label: 'Paste content', value: 'paste' },
        { label: 'Back', value: 'back' },
    ];

    const handleInputMethodSelect = (item) => {
        if (item.value === 'back') {
            setMode('menu');
        } else if (item.value === 'file') {
            setMode(`${operation}-file-path`);
            setInputValue('');
        } else if (item.value === 'paste') {
            setMode(`${operation}-paste`);
            setInputValue('');
        }
    };

    // Format selection items
    const formatItems = [
        { label: 'JSON', value: 'json' },
        { label: 'YAML', value: 'yaml' },
        { label: 'XML', value: 'xml' },
        { label: 'Back', value: 'back' },
    ];

    const handleFormatSelect = (item) => {
        if (item.value === 'back') {
            setMode('menu');
        } else {
            if (mode === 'convert-source-format') {
                setFormat(item.value);
                setMode('convert-target-format');
            } else if (mode === 'convert-target-format') {
                setTargetFormat(item.value);
                handleConvert();
            } else if (mode === 'format-select') {
                setFormat(item.value);
                handleFormat();
            }
        }
    };

    // Handle file path submission
    const handleFilePathSubmit = async () => {
        try {
            const fileContent = await loadFile(inputValue);

            if (operation === 'format') {
                setContent(fileContent);
                const detected = detectFormat(fileContent);
                if (detected === 'unknown') {
                    setMode('format-select');
                } else {
                    setFormat(detected);
                    await handleFormat();
                }
            } else if (operation === 'convert') {
                setContent(fileContent);
                setMode('convert-source-format');
            } else if (operation === 'diff') {
                if (!content) {
                    setContent(fileContent);
                    setMessage('First file loaded. Now load second file.');
                    setInputValue('');
                    setMode('diff-file2');
                } else {
                    setContent2(fileContent);
                    handleDiff();
                }
            }

            setInputValue('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle paste submission
    const handlePasteSubmit = () => {
        if (!inputValue.trim()) {
            setError('Content cannot be empty');
            return;
        }

        if (operation === 'format') {
            setContent(inputValue);
            const detected = detectFormat(inputValue);
            if (detected === 'unknown') {
                setMode('format-select');
            } else {
                setFormat(detected);
                handleFormat();
            }
        } else if (operation === 'convert') {
            setContent(inputValue);
            setMode('convert-source-format');
        } else if (operation === 'diff') {
            if (!content) {
                setContent(inputValue);
                setMessage('First content saved. Now enter second content.');
                setInputValue('');
            } else {
                setContent2(inputValue);
                handleDiff();
            }
        }

        setInputValue('');
    };

    // Diff method selection
    const diffMethodItems = [
        { label: 'Load both from files', value: 'files' },
        { label: 'Paste both contents', value: 'paste' },
        { label: 'Back', value: 'back' },
    ];

    const handleDiffMethodSelect = (item) => {
        if (item.value === 'back') {
            setMode('menu');
        } else if (item.value === 'files') {
            setMode('diff-file1');
            setInputValue('');
        } else if (item.value === 'paste') {
            setMode('diff-paste');
            setInputValue('');
        }
    };

    // Render functions
    const renderHeader = () => {
        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1 },
                h(Text, { bold: true, color: colors.accent }, 'Data Formatter'),
                operation && h(Text, { color: colors.secondary }, ` - ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
            ),
            error && h(Box, { marginTop: 1, paddingX: 1 },
                h(Badge, { color: 'red' }, 'ERROR'),
                h(Text, { color: colors.error }, ` ${error}`)
            ),
            message && h(Box, { marginTop: 1, paddingX: 1 },
                h(Badge, { color: 'green' }, 'INFO'),
                h(Text, { color: colors.success }, ` ${message}`)
            )
        );
    };

    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'Select an operation:'),
            h(SelectInput, { items: menuItems, onSelect: handleMenuSelect })
        );
    };

    const renderInputMethod = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'Choose input method:'),
            h(SelectInput, { items: inputMethodItems, onSelect: handleInputMethodSelect })
        );
    };

    const renderFormatSelect = () => {
        const title = mode === 'convert-source-format' ? 'Select source format:' :
                      mode === 'convert-target-format' ? 'Select target format:' :
                      'Select format:';

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, title),
            h(SelectInput, { items: formatItems, onSelect: handleFormatSelect })
        );
    };

    const renderDiffMethod = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'Choose comparison method:'),
            h(SelectInput, { items: diffMethodItems, onSelect: handleDiffMethodSelect })
        );
    };

    const renderFilePathInput = () => {
        const label = mode === 'diff-file2' ? 'Second file path: ' : 'File path: ';

        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, label),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: handleFilePathSubmit,
                placeholder: 'e.g., ~/data.json'
            })
        );
    };

    const renderPasteInput = () => {
        const label = content ? 'Second content (single line): ' : 'Paste content (single line): ';

        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, label),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: handlePasteSubmit,
                placeholder: 'Enter or paste your data...'
            }),
            h(Text, { color: colors.muted, marginTop: 1 }, 'Tip: For multiline, use files instead')
        );
    };

    const renderSavePathInput = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, 'Save to: '),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: () => handleSave(inputValue),
                placeholder: 'e.g., ~/output.json'
            })
        );
    };

    const renderResult = () => {
        const lines = result.split('\n');
        const visibleLines = lines.slice(scrollOffset, scrollOffset + 20);
        const displayContent = visibleLines.join('\n');

        // Determine language for syntax highlighting
        let language = 'javascript'; // default
        if (mode === 'format-view' || mode === 'convert-view') {
            if (mode === 'format-view' && format === 'yaml') language = 'yaml';
            else if (mode === 'format-view' && format === 'xml') language = 'xml';
            else if (mode === 'convert-view' && targetFormat === 'yaml') language = 'yaml';
            else if (mode === 'convert-view' && targetFormat === 'xml') language = 'xml';
        }

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1, marginBottom: 1 },
                h(Badge, { color: 'green' }, 'VALID'),
                mode === 'format-view' && h(Text, { color: colors.success }, ` ${format.toUpperCase()} formatted`),
                mode === 'convert-view' && h(Text, { color: colors.success }, ` Converted to ${targetFormat.toUpperCase()}`)
            ),
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                mode === 'diff-view' ?
                    h(Text, null, displayContent) :
                    h(SyntaxHighlight, { language, code: displayContent })
            ),
            lines.length > 20 && h(Box, { paddingX: 1, marginTop: 1 },
                h(Text, { color: colors.muted }, `Lines ${scrollOffset + 1}-${Math.min(scrollOffset + 20, lines.length)} of ${lines.length}`)
            )
        );
    };

    const renderFooter = () => {
        let shortcuts = '';

        if (mode === 'menu') {
            shortcuts = '↑↓: Navigate | ENTER: Select | ESC: Close';
        } else if (mode.includes('view')) {
            shortcuts = '↑↓: Scroll | S: Save | ESC: Menu';
        } else if (mode.includes('path') || mode.includes('paste')) {
            shortcuts = 'ENTER: Submit | ESC: Cancel';
        } else {
            shortcuts = 'ESC: Back to Menu';
        }

        return h(Box, { marginTop: 1, borderStyle: 'single', borderColor: colors.muted, paddingX: 1 },
            h(Text, { color: colors.muted }, shortcuts)
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
        mode === 'menu' && renderMenu(),
        (mode === 'format-input-method' || mode === 'convert-input-method') && renderInputMethod(),
        (mode === 'format-select' || mode === 'convert-source-format' || mode === 'convert-target-format') && renderFormatSelect(),
        mode === 'diff-method' && renderDiffMethod(),
        (mode === 'format-file-path' || mode === 'convert-file-path' || mode === 'diff-file1' || mode === 'diff-file2') && renderFilePathInput(),
        (mode === 'format-paste' || mode === 'convert-paste' || mode === 'diff-paste') && renderPasteInput(),
        mode === 'save-path' && renderSavePathInput(),
        (mode === 'format-view' || mode === 'convert-view' || mode === 'diff-view') && renderResult(),
        renderFooter()
    );
};

export default DataFormatter;
