import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import os from 'os';

const h = React.createElement;

const NOTES_PATH = path.join(os.homedir(), '.cypher-notes.json');

const loadTheme = () => {
    try {
        const p = path.join(os.homedir(), '.cypher-tui-settings.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
    } catch { }
    return 'Cyberpunk';
};

const getAccent = (t) => ({ Cyberpunk: '#00ffff', Mono: '#ffffff', Matrix: '#00ff00', Amber: '#ffaa00' }[t] || '#00ffff');

const loadNotes = () => {
    try {
        if (fs.existsSync(NOTES_PATH)) {
            return JSON.parse(fs.readFileSync(NOTES_PATH, 'utf-8'));
        }
    } catch { }
    return [];
};

const saveNotes = (notes) => {
    try {
        fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2));
    } catch { }
};

const Program = ({ isFocused }) => {
    const accent = getAccent(loadTheme());
    const [notes, setNotes] = useState(loadNotes);
    const [selected, setSelected] = useState(0);
    const [mode, setMode] = useState('list'); // list, add, edit
    const [inputText, setInputText] = useState('');
    const [message, setMessage] = useState('');

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 1500);
    };

    const persistNotes = (newNotes) => {
        setNotes(newNotes);
        saveNotes(newNotes);
    };

    useInput((input, key) => {
        if (!isFocused) return;

        // Input/Edit mode
        if (mode === 'add' || mode === 'edit') {
            if (key.escape) {
                setMode('list');
                setInputText('');
                return;
            }
            if (key.return) {
                if (inputText.trim()) {
                    if (mode === 'add') {
                        persistNotes([...notes, { id: Date.now(), text: inputText.trim(), done: false }]);
                        showMessage('Note added');
                    } else {
                        const updated = notes.map((n, i) => (i === selected ? { ...n, text: inputText.trim() } : n));
                        persistNotes(updated);
                        showMessage('Note updated');
                    }
                }
                setMode('list');
                setInputText('');
                return;
            }
            if (key.backspace || key.delete) {
                setInputText((t) => t.slice(0, -1));
                return;
            }
            if (input && !key.ctrl && !key.meta) {
                setInputText((t) => t + input);
            }
            return;
        }

        // List mode
        if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
        if (key.downArrow) setSelected((i) => Math.min(notes.length - 1, i + 1));

        // Toggle done
        if ((key.return || input === ' ') && notes.length > 0) {
            const updated = notes.map((n, i) => (i === selected ? { ...n, done: !n.done } : n));
            persistNotes(updated);
        }

        // Add new note
        if (input === 'a' || input === 'n') {
            setMode('add');
            setInputText('');
        }

        // Edit note
        if (input === 'e' && notes.length > 0) {
            setMode('edit');
            setInputText(notes[selected]?.text || '');
        }

        // Delete note
        if (input === 'd' && notes.length > 0) {
            const updated = notes.filter((_, i) => i !== selected);
            persistNotes(updated);
            setSelected((i) => Math.min(i, updated.length - 1));
            showMessage('Note deleted');
        }

        // Clear completed
        if (input === 'c') {
            const updated = notes.filter((n) => !n.done);
            persistNotes(updated);
            setSelected(0);
            showMessage('Cleared completed');
        }
    }, { isActive: isFocused });

    const borderColor = isFocused ? accent : '#333333';
    const doneCount = notes.filter((n) => n.done).length;

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: accent, bold: true }, 'NOTES'),
            message ? h(Text, { color: '#00ff88' }, message) :
                h(Text, { color: '#555555' }, `${doneCount}/${notes.length} done`)
        ),

        // Input mode
        (mode === 'add' || mode === 'edit') && h(Box, { paddingX: 1, marginY: 1 },
            h(Text, { color: accent }, mode === 'add' ? '+ ' : '* '),
            h(Text, { color: '#ffffff' }, inputText),
            h(Text, { color: accent }, '_')
        ),

        // Notes list
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },
            notes.length === 0 ?
                h(Text, { color: '#555555' }, 'No notes. Press [a] to add one.') :
                notes.map((note, i) => {
                    const isSel = i === selected;
                    return h(Box, { key: note.id },
                        h(Text, { color: isSel ? accent : '#555555' }, isSel ? '> ' : '  '),
                        h(Text, { color: note.done ? '#00ff88' : '#555555' }, note.done ? '[x] ' : '[ ] '),
                        h(Text, {
                            color: note.done ? '#555555' : (isSel ? '#ffffff' : '#888888'),
                            strikethrough: note.done
                        }, note.text)
                    );
                })
        ),

        // Stats bar
        notes.length > 0 && h(Box, { paddingX: 1 },
            h(Text, { color: '#00ff88' }, '='.repeat(Math.round((doneCount / notes.length) * 20))),
            h(Text, { color: '#333333' }, '-'.repeat(20 - Math.round((doneCount / notes.length) * 20))),
            h(Text, { color: '#555555' }, ` ${Math.round((doneCount / notes.length) * 100)}%`)
        ),

        // Footer
        h(Box, {
            paddingX: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: '#555555' },
                mode !== 'list' ? '[enter] save [esc] cancel' : '[a]dd [e]dit [d]el [c]lear done [space] toggle'
            )
        )
    );
};

export default Program;
