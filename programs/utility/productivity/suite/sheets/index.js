import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const h = React.createElement;

// Simple table component
const SimpleTable = ({ data, headers, selectedRow, selectedCol, colors }) => {
    return h(Box, { flexDirection: 'column' },
        // Header row
        h(Box, {},
            h(Text, { bold: true, color: colors.muted }, '#   '),
            ...headers.map(header =>
                h(Box, { key: header, width: 12 },
                    h(Text, { bold: true, color: colors.secondary }, header)
                )
            )
        ),
        // Data rows
        ...data.slice(0, 10).map((row, rowIdx) =>
            h(Box, { key: rowIdx },
                h(Text, {
                    color: rowIdx === selectedRow ? colors.accent : colors.muted,
                    bold: rowIdx === selectedRow
                }, `${rowIdx + 1}   `),
                ...headers.map((header, colIdx) => {
                    const isSelected = rowIdx === selectedRow && colIdx === selectedCol;
                    return h(Box, { key: header, width: 12 },
                        h(Text, {
                            color: isSelected ? colors.accent : (rowIdx === selectedRow ? colors.secondary : '#ffffff'),
                            bold: isSelected,
                            backgroundColor: isSelected ? colors.muted : undefined
                        }, (row[header] || '').substring(0, 10))
                    );
                })
            )
        )
    );
};

const SuiteSheets = ({ isFocused, onClose, settings, lockInput, unlockInput }) => {
    const currentTheme = settings?.theme || 'Cyberpunk';
    const themeColors = {
        Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', success: '#00ff88', error: '#ff4444', muted: '#666666' },
        Mono: { accent: '#ffffff', secondary: '#888888', success: '#ffffff', error: '#aaaaaa', muted: '#555555' },
        Matrix: { accent: '#00ff00', secondary: '#88ff00', success: '#00ff00', error: '#ff0000', muted: '#004400' },
        Amber: { accent: '#ffaa00', secondary: '#ff6600', success: '#ffcc00', error: '#ff3300', muted: '#663300' },
    };
    const colors = themeColors[currentTheme];

    const [mode, setMode] = React.useState('view'); // view, menu, file-open, file-save, edit-cell
    const [data, setData] = React.useState([{ A: '', B: '', C: '', D: '', E: '' }]);
    const [headers, setHeaders] = React.useState(['A', 'B', 'C', 'D', 'E']);
    const [selectedRow, setSelectedRow] = React.useState(0);
    const [selectedCol, setSelectedCol] = React.useState(0);
    const [currentFilePath, setCurrentFilePath] = React.useState('');
    const [inputValue, setInputValue] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [modified, setModified] = React.useState(false);

    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Lock/unlock input
    React.useEffect(() => {
        const isTextInputMode = mode === 'file-open' || mode === 'file-save' || mode === 'edit-cell';
        if (isFocused && isTextInputMode) {
            lockInput?.();
        } else {
            unlockInput?.();
        }
        return () => unlockInput?.();
    }, [mode, isFocused, lockInput, unlockInput]);

    const parseCSV = (csvText) => {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return { headers: ['A'], rows: [{ A: '' }] };

        const parsedHeaders = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            parsedHeaders.forEach((header, idx) => {
                row[header] = values[idx]?.trim() || '';
            });
            return row;
        });

        return { headers: parsedHeaders, rows: rows.length > 0 ? rows : [{}] };
    };

    const toCSV = () => {
        const headerRow = headers.join(',');
        const dataRows = data.map(row =>
            headers.map(h => row[h] || '').join(',')
        );
        return [headerRow, ...dataRows].join('\n');
    };

    const newSheet = () => {
        setHeaders(['A', 'B', 'C', 'D', 'E']);
        setData([{ A: '', B: '', C: '', D: '', E: '' }]);
        setSelectedRow(0);
        setSelectedCol(0);
        setCurrentFilePath('');
        setModified(false);
        setMessage('New sheet created');
    };

    const openSheet = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);
            const content = await readFile(fullPath, 'utf-8');
            const { headers: csvHeaders, rows } = parseCSV(content);
            setHeaders(csvHeaders);
            setData(rows);
            setSelectedRow(0);
            setSelectedCol(0);
            setCurrentFilePath(fullPath);
            setModified(false);
            setMessage(`Opened ${path.basename(fullPath)}`);
            setMode('view');
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    const saveSheet = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);
            const csvContent = toCSV();
            await writeFile(fullPath, csvContent, 'utf-8');
            setCurrentFilePath(fullPath);
            setModified(false);
            setMessage(`Saved ${path.basename(fullPath)}`);
            setMode('view');
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    const menuItems = [
        { label: 'New Sheet', value: 'new' },
        { label: 'Open CSV', value: 'open' },
        { label: 'Save', value: 'save' },
        { label: 'Save As', value: 'save-as' },
        { label: 'Add Row', value: 'add-row' },
        { label: 'Add Column', value: 'add-col' },
        { label: 'Back to View', value: 'back' },
    ];

    const handleMenuSelect = (item) => {
        if (item.value === 'new') {
            newSheet();
            setMode('view');
        } else if (item.value === 'open') {
            setMode('file-open');
            setInputValue('');
        } else if (item.value === 'save') {
            if (currentFilePath) {
                saveSheet(currentFilePath);
            } else {
                setMode('file-save');
                setInputValue('');
            }
        } else if (item.value === 'save-as') {
            setMode('file-save');
            setInputValue(currentFilePath || '');
        } else if (item.value === 'add-row') {
            const newRow = {};
            headers.forEach(h => newRow[h] = '');
            setData([...data, newRow]);
            setModified(true);
            setMessage('Row added');
            setMode('view');
        } else if (item.value === 'add-col') {
            const newCol = String.fromCharCode(65 + headers.length); // A, B, C...
            setHeaders([...headers, newCol]);
            setData(data.map(row => ({ ...row, [newCol]: '' })));
            setModified(true);
            setMessage('Column added');
            setMode('view');
        } else if (item.value === 'back') {
            setMode('view');
        }
    };

    const editCell = () => {
        const currentHeader = headers[selectedCol];
        const currentValue = data[selectedRow]?.[currentHeader] || '';
        setInputValue(currentValue);
        setMode('edit-cell');
    };

    const saveCellEdit = () => {
        const currentHeader = headers[selectedCol];
        const newData = [...data];
        newData[selectedRow] = { ...newData[selectedRow], [currentHeader]: inputValue };
        setData(newData);
        setModified(true);
        setMode('view');
    };

    // Dedicated ESC handler
    useInput((input, key) => {
        if (!isFocused) return;
        if (key.escape) {
            if (mode === 'view') {
                onClose();
            } else {
                setMode('view');
            }
        }
    }, { isActive: isFocused });

    useInput((input, key) => {
        if (!isFocused) return;

        if (mode === 'view') {
            if (key.upArrow) {
                setSelectedRow(Math.max(0, selectedRow - 1));
            } else if (key.downArrow) {
                setSelectedRow(Math.min(data.length - 1, selectedRow + 1));
            } else if (key.leftArrow) {
                setSelectedCol(Math.max(0, selectedCol - 1));
            } else if (key.rightArrow) {
                setSelectedCol(Math.min(headers.length - 1, selectedCol + 1));
            } else if (input === 'e' || input === 'E' || key.return) {
                editCell();
            } else if (input === 'm' || input === 'M') {
                setMode('menu');
            }
        }
    }, { isActive: isFocused && mode === 'view' });

    const renderHeader = () => {
        const fileName = currentFilePath ? path.basename(currentFilePath) : 'Untitled';
        const cellRef = `${headers[selectedCol]}${selectedRow + 1}`;

        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1, justifyContent: 'space-between' },
                h(Box, {},
                    h(Text, { bold: true, color: colors.accent }, 'Suite Sheets'),
                    modified && h(Text, { color: colors.error }, ' *')
                ),
                h(Box, { gap: 1 },
                    h(Text, { color: colors.secondary }, fileName),
                    h(Text, { color: colors.muted }, ` | Cell: ${cellRef}`)
                )
            ),
            message && h(Box, { marginTop: 1, paddingX: 1 },
                h(Text, { color: colors.success }, message)
            )
        );
    };

    const renderSheet = () => {
        const currentHeader = headers[selectedCol];

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.secondary, paddingX: 1, flexDirection: 'column' },
                h(Box, { marginBottom: 1 },
                    h(Text, { color: colors.accent, bold: true }, 'Selected: '),
                    h(Text, { color: colors.secondary }, `${headers[selectedCol]}${selectedRow + 1} = "${data[selectedRow]?.[currentHeader] || ''}"`)
                ),
                h(SimpleTable, {
                    data,
                    headers,
                    selectedRow,
                    selectedCol,
                    colors
                })
            )
        );
    };

    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'Sheet Menu:'),
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
                    if (mode === 'file-open') openSheet(inputValue);
                    else if (mode === 'file-save') saveSheet(inputValue);
                },
                placeholder
            })
        );
    };

    const renderCellEdit = () => {
        const cellRef = `${headers[selectedCol]}${selectedRow + 1}`;

        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, `Edit Cell ${cellRef}:`),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: saveCellEdit,
                placeholder: 'Enter value...'
            })
        );
    };

    const renderFooter = () => {
        let shortcuts = '';
        if (mode === 'view') {
            shortcuts = 'Arrow Keys: Navigate | E/Enter: Edit Cell | M: Menu | ESC: Close';
        } else if (mode === 'menu') {
            shortcuts = '↑↓: Navigate | Enter: Select | ESC: Back';
        } else {
            shortcuts = 'Enter: Confirm | ESC: Cancel';
        }

        return h(Box, { marginTop: 1, borderStyle: 'single', borderColor: colors.muted, paddingX: 1 },
            h(Text, { color: colors.muted }, shortcuts)
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
        mode === 'view' && renderSheet(),
        mode === 'menu' && renderMenu(),
        mode === 'file-open' && renderFileInput('Open CSV:', 'e.g., ~/data.csv'),
        mode === 'file-save' && renderFileInput('Save As:', 'e.g., ~/data.csv'),
        mode === 'edit-cell' && renderCellEdit(),
        renderFooter()
    );
};

export default SuiteSheets;
