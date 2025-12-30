import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const h = React.createElement;

const EnvironmentManager = ({ isFocused, onClose, settings, lockInput, unlockInput }) => {
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
    const [envVars, setEnvVars] = React.useState([]);
    const [filteredVars, setFilteredVars] = React.useState([]);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [mode, setMode] = React.useState('view'); // view, search, add-name, add-value, edit, confirm-delete
    const [searchQuery, setSearchQuery] = React.useState('');
    const [inputValue, setInputValue] = React.useState('');
    const [newVarName, setNewVarName] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [messageType, setMessageType] = React.useState('info'); // info, success, error

    // Load environment variables on mount
    React.useEffect(() => {
        const vars = Object.entries(process.env).map(([key, value]) => ({
            name: key,
            value: value || '',
        }));
        vars.sort((a, b) => a.name.localeCompare(b.name));
        setEnvVars(vars);
        setFilteredVars(vars);
    }, []);

    // Filter variables based on search query
    React.useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredVars(envVars);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = envVars.filter(
                v => v.name.toLowerCase().includes(query) || v.value.toLowerCase().includes(query)
            );
            setFilteredVars(filtered);
        }
        setSelectedIndex(0);
    }, [searchQuery, envVars]);

    // Auto-clear messages after 3 seconds
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Lock/unlock input based on mode
    React.useEffect(() => {
        const isTextInputMode = mode === 'search' || mode === 'add-name' ||
                                mode === 'add-value' || mode === 'edit';

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

    // Show message helper
    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    };

    // Handle adding new variable
    const handleAddVariable = () => {
        if (!newVarName.trim() || !inputValue.trim()) {
            showMessage('Variable name and value cannot be empty', 'error');
            return;
        }

        const exists = envVars.find(v => v.name === newVarName.trim());
        if (exists) {
            showMessage(`Variable ${newVarName} already exists. Use Edit to modify it.`, 'error');
            setMode('view');
            setNewVarName('');
            setInputValue('');
            return;
        }

        process.env[newVarName.trim()] = inputValue.trim();
        const newVar = { name: newVarName.trim(), value: inputValue.trim() };
        const updated = [...envVars, newVar].sort((a, b) => a.name.localeCompare(b.name));
        setEnvVars(updated);

        showMessage(`Added ${newVarName}`, 'success');
        setMode('view');
        setNewVarName('');
        setInputValue('');
    };

    // Handle editing variable
    const handleEditVariable = () => {
        const selected = filteredVars[selectedIndex];
        if (!selected) return;

        process.env[selected.name] = inputValue.trim();
        const updated = envVars.map(v =>
            v.name === selected.name ? { ...v, value: inputValue.trim() } : v
        );
        setEnvVars(updated);

        showMessage(`Updated ${selected.name}`, 'success');
        setMode('view');
        setInputValue('');
    };

    // Handle deleting variable
    const handleDeleteVariable = () => {
        const selected = filteredVars[selectedIndex];
        if (!selected) return;

        delete process.env[selected.name];
        const updated = envVars.filter(v => v.name !== selected.name);
        setEnvVars(updated);

        showMessage(`Deleted ${selected.name}`, 'success');
        setMode('view');
        setSelectedIndex(Math.max(0, selectedIndex - 1));
    };

    // Handle exporting to .env file
    const handleExport = async () => {
        try {
            const content = envVars
                .map(v => `${v.name}=${v.value}`)
                .join('\n');

            const exportPath = path.join(os.homedir(), 'exported-env.env');
            await writeFile(exportPath, content, 'utf-8');

            showMessage(`Exported to ${exportPath}`, 'success');
        } catch (err) {
            showMessage(`Export failed: ${err.message}`, 'error');
        }
    };

    // Dedicated ESC handler (works even when input is locked)
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (mode === 'view') {
                onClose();
            } else {
                setMode('view');
                setSearchQuery('');
                setInputValue('');
                setNewVarName('');
            }
        }
    }, { isActive: isFocused });

    // Keyboard input handling for non-text-input modes
    useInput((input, key) => {
        if (!isFocused) return;

        // Mode-specific handlers
        if (mode === 'view') {
            if (key.upArrow) {
                setSelectedIndex(Math.max(0, selectedIndex - 1));
            } else if (key.downArrow) {
                setSelectedIndex(Math.min(filteredVars.length - 1, selectedIndex + 1));
            } else if (input === '/') {
                setMode('search');
            } else if (input === 'a' || input === 'A') {
                setMode('add-name');
                setInputValue('');
                setNewVarName('');
            } else if (input === 'e' || input === 'E') {
                if (filteredVars[selectedIndex]) {
                    setInputValue(filteredVars[selectedIndex].value);
                    setMode('edit');
                }
            } else if (input === 'd' || input === 'D') {
                if (filteredVars[selectedIndex]) {
                    setMode('confirm-delete');
                }
            } else if (input === 'x' || input === 'X') {
                handleExport();
            }
        } else if (mode === 'confirm-delete') {
            if (input === 'y' || input === 'Y') {
                handleDeleteVariable();
            } else if (input === 'n' || input === 'N') {
                setMode('view');
            }
        }
    }, { isActive: isFocused && mode !== 'search' && mode !== 'add-name' && mode !== 'add-value' && mode !== 'edit' });

    // Render helpers
    const renderHeader = () => {
        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1 },
                h(Text, { bold: true, color: colors.accent }, 'Environment Manager'),
                h(Text, { color: colors.muted }, ` - ${filteredVars.length} variable${filteredVars.length !== 1 ? 's' : ''}`)
            ),
            message && h(Box, { marginTop: 1, paddingX: 1 },
                h(Text, {
                    color: messageType === 'success' ? colors.success :
                           messageType === 'error' ? colors.error : colors.accent
                }, message)
            )
        );
    };

    const renderVariableList = () => {
        const visibleStart = Math.max(0, selectedIndex - 10);
        const visibleEnd = Math.min(filteredVars.length, visibleStart + 20);
        const visibleVars = filteredVars.slice(visibleStart, visibleEnd);

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1 },
                h(Text, { bold: true, color: colors.secondary }, 'NAME'),
                h(Text, { bold: true, color: colors.secondary }, '                    VALUE')
            ),
            ...visibleVars.map((v, idx) => {
                const actualIndex = visibleStart + idx;
                const isSelected = actualIndex === selectedIndex;
                const displayValue = v.value.length > 60 ? v.value.substring(0, 57) + '...' : v.value;

                return h(Box, {
                    key: v.name,
                    paddingX: 1,
                    backgroundColor: isSelected ? colors.muted : undefined
                },
                    h(Text, {
                        color: isSelected ? colors.accent : colors.secondary,
                        bold: isSelected
                    }, isSelected ? '▶ ' : '  '),
                    h(Box, { width: 30 },
                        h(Text, {
                            color: isSelected ? colors.accent : '#ffffff',
                            bold: isSelected
                        }, v.name.length > 28 ? v.name.substring(0, 25) + '...' : v.name)
                    ),
                    h(Text, {
                        color: isSelected ? colors.accent : colors.muted
                    }, displayValue)
                );
            })
        );
    };

    const renderFooter = () => {
        let shortcuts = '';

        if (mode === 'view') {
            shortcuts = '↑↓: Navigate | /: Search | A: Add | E: Edit | D: Delete | X: Export | ESC: Close';
        } else if (mode === 'search') {
            shortcuts = 'Type to search | ESC: Cancel';
        } else if (mode === 'add-name' || mode === 'add-value') {
            shortcuts = 'ENTER: Continue | ESC: Cancel';
        } else if (mode === 'edit') {
            shortcuts = 'ENTER: Save | ESC: Cancel';
        } else if (mode === 'confirm-delete') {
            shortcuts = 'Y: Confirm | N: Cancel';
        }

        return h(Box, { marginTop: 1, borderStyle: 'single', borderColor: colors.muted, paddingX: 1 },
            h(Text, { color: colors.muted }, shortcuts)
        );
    };

    const renderSearchInput = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1 },
                h(Text, { color: colors.accent }, 'Search: '),
                h(TextInput, {
                    value: searchQuery,
                    onChange: setSearchQuery,
                    onSubmit: () => setMode('view'),
                    placeholder: 'Filter by name or value...'
                })
            )
        );
    };

    const renderAddNameInput = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1 },
                h(Text, { color: colors.accent }, 'Variable Name: '),
                h(TextInput, {
                    value: newVarName,
                    onChange: setNewVarName,
                    onSubmit: () => {
                        if (newVarName.trim()) {
                            setMode('add-value');
                        }
                    },
                    placeholder: 'e.g., MY_VAR'
                })
            )
        );
    };

    const renderAddValueInput = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1 },
                h(Text, { color: colors.secondary }, `${newVarName} = `),
                h(TextInput, {
                    value: inputValue,
                    onChange: setInputValue,
                    onSubmit: handleAddVariable,
                    placeholder: 'Enter value...'
                })
            )
        );
    };

    const renderEditInput = () => {
        const selected = filteredVars[selectedIndex];
        if (!selected) return null;

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { paddingX: 1 },
                h(Text, { color: colors.secondary }, `${selected.name} = `),
                h(TextInput, {
                    value: inputValue,
                    onChange: setInputValue,
                    onSubmit: handleEditVariable,
                    placeholder: 'Enter new value...'
                })
            )
        );
    };

    const renderConfirmDelete = () => {
        const selected = filteredVars[selectedIndex];
        if (!selected) return null;

        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.error, bold: true },
                `Delete ${selected.name}? (Y/N)`
            )
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
        mode === 'search' && renderSearchInput(),
        mode === 'add-name' && renderAddNameInput(),
        mode === 'add-value' && renderAddValueInput(),
        mode === 'edit' && renderEditInput(),
        mode === 'confirm-delete' && renderConfirmDelete(),
        (mode === 'view') && renderVariableList(),
        renderFooter()
    );
};

export default EnvironmentManager;
