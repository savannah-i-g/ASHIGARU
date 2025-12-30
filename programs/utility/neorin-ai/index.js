import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Badge, TextInput, Spinner } from '@inkjs/ui';
import { ScrollView } from 'ink-scroll-view';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
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
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', user: '#00ff88', ai: '#ffaa00', dim: '#555555', text: '#cccccc' },
    Mono: { accent: '#ffffff', secondary: '#888888', user: '#ffffff', ai: '#aaaaaa', dim: '#555555', text: '#cccccc' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', user: '#00ff00', ai: '#88ff88', dim: '#005500', text: '#00aa00' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', user: '#ffcc00', ai: '#ff8800', dim: '#553300', text: '#ddaa00' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', user: '#00ff88', ai: '#ffaa00', dim: '#555555', text: '#cccccc' });

const wrapText = (text, width = 70) => {
    if (!text) return [''];
    const lines = [];
    const paragraphs = text.split('\n');
    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) { lines.push(''); continue; }
        const words = paragraph.split(/\s+/);
        let currentLine = '';
        for (const word of words) {
            if (currentLine.length + word.length + 1 <= width) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
    }
    return lines.length ? lines : [''];
};

// Load system prompt from file
const PROMPT_FILE = new URL('./system-prompt.txt', import.meta.url).pathname;
const loadSystemPrompt = () => {
    try {
        if (fs.existsSync(PROMPT_FILE)) {
            return fs.readFileSync(PROMPT_FILE, 'utf-8').trim();
        }
    } catch { }
    return 'You are NeoRin, a tactical AI assistant. Be concise, direct, and to the point.';
};

// Sessions storage path
const SESSIONS_DIR = path.join(os.homedir(), '.ashigaru-sessions');
const SETTINGS_FILE = path.join(os.homedir(), '.neorin-settings.json');

// Available models
const MODELS = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: 'Preview, highest quality' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Preview, fast' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'High quality' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Fast, balanced' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Previous gen' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Legacy fast' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Legacy quality' },
];

const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        }
    } catch { }
    return { model: 'gemini-2.5-flash', streamResponse: true };
};

const saveSettings = (settings) => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
};

const ensureSessionsDir = () => {
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
};

const loadSessions = () => {
    ensureSessionsDir();
    try {
        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            const content = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
            return { id: f.replace('.json', ''), name: content.name, messages: content.messages, created: content.created };
        }).sort((a, b) => (b.created || 0) - (a.created || 0));
    } catch { return []; }
};

const saveSession = (session) => {
    ensureSessionsDir();
    fs.writeFileSync(
        path.join(SESSIONS_DIR, `${session.id}.json`),
        JSON.stringify({ name: session.name, messages: session.messages, created: session.created }, null, 2)
    );
};

const deleteSession = (id) => {
    const p = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const Program = ({ isFocused, onClose, lockInput, unlockInput }) => {
    const colors = getThemeColors(loadTheme());
    const { stdout } = useStdout();
    const termWidth = stdout?.columns || 80;
    const viewportHeight = (stdout?.rows || 24) - 10;
    const lineWidth = Math.min(termWidth - 8, 75);

    // Settings state
    const [settings, setSettings] = useState(() => loadSettings());
    const [systemPrompt] = useState(() => loadSystemPrompt());

    // Session state
    const [sessions, setSessions] = useState(() => loadSessions());
    const [currentSession, setCurrentSession] = useState(() => ({
        id: generateId(),
        name: 'New Chat',
        messages: [{ role: 'assistant', content: 'NeoRin is active. Awaiting input.' }],
        created: Date.now(),
    }));

    // UI state
    const [mode, setMode] = useState('chat'); // chat, sessions, rename, settings
    const [input, setInput] = useState('');
    const [inputMode, setInputMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [streamingText, setStreamingText] = useState('');
    const [sessionIndex, setSessionIndex] = useState(0);
    const [renameInput, setRenameInput] = useState('');
    const [settingIndex, setSettingIndex] = useState(0);

    const scrollRef = useRef(null);

    // Lock/unlock input
    useEffect(() => {
        if ((inputMode || mode === 'rename') && lockInput) lockInput();
        else if (!inputMode && mode !== 'rename' && unlockInput) unlockInput();
    }, [inputMode, mode, lockInput, unlockInput]);

    useEffect(() => { return () => { if (unlockInput) unlockInput(); }; }, [unlockInput]);

    useEffect(() => { scrollRef.current?.scrollToBottom(); }, [currentSession.messages, streamingText]);

    // Auto-save current session
    useEffect(() => {
        if (currentSession.messages.length > 1) {
            saveSession(currentSession);
            setSessions(loadSessions());
        }
    }, [currentSession.messages]);

    const sendMessage = async (prompt) => {
        if (!prompt.trim() || isLoading) return;

        const userMsg = { role: 'user', content: prompt };
        setCurrentSession(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
        setInput('');
        setIsLoading(true);
        setError('');
        setStreamingText('');

        try {
            const model = google(settings.model);
            const history = [...currentSession.messages, userMsg].map(m => ({ role: m.role, content: m.content }));

            let fullText = '';
            const result = streamText({ model, system: systemPrompt, messages: history });

            for await (const chunk of result.textStream) {
                fullText += chunk;
                if (settings.streamResponse) {
                    setStreamingText(fullText);
                }
            }

            setCurrentSession(prev => ({ ...prev, messages: [...prev.messages, { role: 'assistant', content: fullText }] }));
            setStreamingText('');
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errMsg);
            setCurrentSession(prev => ({ ...prev, messages: [...prev.messages, { role: 'assistant', content: `Error: ${errMsg}` }] }));
        }

        setIsLoading(false);
    };

    const newSession = () => {
        const session = {
            id: generateId(),
            name: 'New Chat',
            messages: [{ role: 'assistant', content: 'NeoRin is active. Awaiting input.' }],
            created: Date.now(),
        };
        setCurrentSession(session);
        setMode('chat');
    };

    const loadSessionById = (id) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setCurrentSession(session);
            setMode('chat');
        }
    };

    const deleteCurrentSession = () => {
        deleteSession(sessions[sessionIndex]?.id);
        setSessions(loadSessions());
        setSessionIndex(0);
    };

    const renameSession = (newName) => {
        const session = sessions[sessionIndex];
        if (session && newName.trim()) {
            session.name = newName.trim();
            saveSession(session);
            setSessions(loadSessions());
        }
        setMode('sessions');
        setRenameInput('');
    };

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    useInput((inputChar, key) => {
        if (!isFocused) return;

        // Rename mode
        if (mode === 'rename') {
            if (key.escape) { setMode('sessions'); setRenameInput(''); }
            return;
        }

        // Settings mode
        if (mode === 'settings') {
            if (key.escape) { setMode('chat'); return; }
            if (key.upArrow) { setSettingIndex(i => Math.max(0, i - 1)); return; }
            if (key.downArrow) { setSettingIndex(i => Math.min(1, i + 1)); return; }
            // Model selection (setting 0)
            if (settingIndex === 0) {
                if (key.leftArrow) {
                    const idx = MODELS.findIndex(m => m.id === settings.model);
                    const newIdx = Math.max(0, idx - 1);
                    updateSetting('model', MODELS[newIdx].id);
                    return;
                }
                if (key.rightArrow) {
                    const idx = MODELS.findIndex(m => m.id === settings.model);
                    const newIdx = Math.min(MODELS.length - 1, idx + 1);
                    updateSetting('model', MODELS[newIdx].id);
                    return;
                }
            }
            // Stream toggle (setting 1)
            if (settingIndex === 1) {
                if (key.leftArrow || key.rightArrow || key.return) {
                    updateSetting('streamResponse', !settings.streamResponse);
                    return;
                }
            }
            return;
        }

        // Sessions mode
        if (mode === 'sessions') {
            if (key.escape) { setMode('chat'); return; }
            if (key.upArrow) { setSessionIndex(i => Math.max(0, i - 1)); return; }
            if (key.downArrow) { setSessionIndex(i => Math.min(sessions.length - 1, i + 1)); return; }
            if (key.return && sessions[sessionIndex]) { loadSessionById(sessions[sessionIndex].id); return; }
            if (inputChar === 'n' || inputChar === 'N') { newSession(); return; }
            if (inputChar === 'r' || inputChar === 'R') {
                setRenameInput(sessions[sessionIndex]?.name || '');
                setMode('rename');
                return;
            }
            if (inputChar === 'd' || inputChar === 'D') { deleteCurrentSession(); return; }
            return;
        }

        // Input mode for chat
        if (inputMode) {
            if (key.escape) { setInputMode(false); setInput(''); }
            return;
        }

        // Chat mode
        if (inputChar === 'i' || inputChar === 'I' || key.return) { setInputMode(true); return; }
        if (inputChar === 's' || inputChar === 'S') { setMode('sessions'); setSessionIndex(0); return; }
        if (inputChar === 'o' || inputChar === 'O') { setMode('settings'); setSettingIndex(0); return; }
        if (inputChar === 'c' || inputChar === 'C') {
            setCurrentSession(prev => ({
                ...prev,
                messages: [{ role: 'assistant', content: 'Session cleared. Awaiting input.' }]
            }));
            setError('');
            return;
        }
        if (key.upArrow || inputChar === 'k') { scrollRef.current?.scrollBy(-1); return; }
        if (key.downArrow || inputChar === 'j') { scrollRef.current?.scrollBy(1); return; }
        if (key.pageUp) { scrollRef.current?.scrollBy(-viewportHeight); return; }
        if (key.pageDown) { scrollRef.current?.scrollBy(viewportHeight); return; }
        if (inputChar === 'q' || inputChar === 'Q') { if (onClose) onClose(); return; }
    }, { isActive: isFocused });

    const handleSubmit = (value) => {
        if (value.trim()) sendMessage(value.trim());
        setInputMode(false);
    };

    const borderColor = isFocused ? colors.accent : '#333333';

    // Simple markdown line renderer
    const renderMarkdownLine = (line, key) => {
        if (line.startsWith('### ')) return h(Text, { key, color: colors.accent }, '▸ ' + line.slice(4));
        if (line.startsWith('## ')) return h(Text, { key, color: colors.secondary, bold: true }, '── ' + line.slice(3) + ' ──');
        if (line.startsWith('# ')) return h(Text, { key, color: colors.ai, bold: true }, '═══ ' + line.slice(2).toUpperCase() + ' ═══');
        if (line.startsWith('```')) return h(Text, { key, color: colors.dim }, '─── code ───');
        if (line.startsWith('- ') || line.startsWith('* ')) return h(Text, { key, color: colors.text }, '  • ' + line.slice(2));
        if (/^\d+\.\s/.test(line)) return h(Text, { key, color: colors.text }, '  ' + line);
        if (line.startsWith('> ')) return h(Text, { key, color: colors.dim }, '│ ' + line.slice(2));
        let formattedLine = line
            .replace(/\*\*(.+?)\*\*/g, '【$1】')
            .replace(/\*(.+?)\*/g, '_$1_')
            .replace(/__(.+?)__/g, '【$1】')
            .replace(/_(.+?)_/g, '~$1~')
            .replace(/`([^`]+)`/g, '[$1]');
        return h(Text, { key, color: colors.text }, formattedLine);
    };

    // Render a single message box
    const renderMessageBox = (msg, index, isStreaming = false) => {
        const isUser = msg.role === 'user';
        const label = isUser ? ' YOU ' : ' NEORIN ';
        const color = isUser ? colors.user : colors.ai;
        const content = isStreaming ? streamingText : msg.content;
        const maxWidth = lineWidth - 6;

        const rawLines = (content || '').split('\n');
        const wrappedLines = [];
        for (const line of rawLines) {
            const wrapped = wrapText(line, maxWidth);
            wrappedLines.push(...wrapped);
        }

        return h(Box, {
            key: index,
            flexDirection: 'column',
            borderStyle: 'single',
            borderColor: color,
            marginBottom: 1,
            paddingX: 1,
        },
            h(Box, { gap: 0 },
                h(Text, { color: color, bold: true }, '◢◤◢'),
                h(Text, { backgroundColor: color, color: '#000000', bold: true }, label),
                h(Text, { color: color, bold: true }, '◤◢◤'),
                isStreaming && h(Spinner, { type: 'dots' })
            ),
            h(Text, { color: color }, '─'.repeat(maxWidth)),
            ...wrappedLines.map((line, li) =>
                isUser ?
                    h(Text, { key: li, color: colors.text }, line || ' ') :
                    renderMarkdownLine(line, li)
            )
        );
    };

    // Sessions view
    const renderSessionsView = () => {
        return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
            h(Box, { gap: 0, marginBottom: 1 },
                h(Text, { color: colors.secondary, bold: true }, '◢◤◢'),
                h(Text, { backgroundColor: colors.secondary, color: '#000000', bold: true }, ' SESSIONS '),
                h(Text, { color: colors.secondary, bold: true }, '◤◢◤'),
            ),
            h(Text, { color: colors.secondary }, '─'.repeat(50)),

            mode === 'rename' ?
                h(Box, { gap: 1 },
                    h(Text, { color: colors.text }, 'New name: '),
                    h(TextInput, { value: renameInput, onChange: setRenameInput, onSubmit: renameSession })
                ) :
                h(Box, { flexDirection: 'column', flexGrow: 1 },
                    sessions.length === 0 ?
                        h(Text, { color: colors.dim }, 'No saved sessions') :
                        sessions.map((s, i) =>
                            h(Box, { key: s.id },
                                h(Text, { color: i === sessionIndex ? colors.accent : colors.dim }, i === sessionIndex ? '▶ ' : '  '),
                                h(Text, { color: i === sessionIndex ? colors.text : colors.dim }, s.name),
                                h(Text, { color: colors.dim }, ` (${s.messages?.length || 0} msgs)`)
                            )
                        )
                ),

            h(Text, { color: colors.secondary }, '─'.repeat(50)),
            h(Box, { gap: 1 },
                h(Badge, { color: 'green' }, 'N'), h(Text, { color: colors.dim }, 'new'),
                h(Badge, { color: 'cyan' }, 'Enter'), h(Text, { color: colors.dim }, 'load'),
                h(Badge, { color: 'yellow' }, 'R'), h(Text, { color: colors.dim }, 'rename'),
                h(Badge, { color: 'red' }, 'D'), h(Text, { color: colors.dim }, 'delete'),
                h(Badge, { color: 'gray' }, 'ESC'), h(Text, { color: colors.dim }, 'back'),
            )
        );
    };

    // Settings view
    const renderSettingsView = () => {
        const currentModel = MODELS.find(m => m.id === settings.model) || MODELS[0];

        return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
            h(Box, { gap: 0, marginBottom: 1 },
                h(Text, { color: colors.accent, bold: true }, '◢◤◢'),
                h(Text, { backgroundColor: colors.accent, color: '#000000', bold: true }, ' SETTINGS '),
                h(Text, { color: colors.accent, bold: true }, '◤◢◤'),
            ),
            h(Text, { color: colors.accent }, '─'.repeat(50)),

            // Model selection
            h(Box, { marginY: 1 },
                h(Text, { color: settingIndex === 0 ? colors.accent : colors.dim }, settingIndex === 0 ? '▶ ' : '  '),
                h(Text, { color: colors.text }, 'Model: '),
                h(Text, { color: colors.dim }, '◀ '),
                h(Text, { color: colors.accent, bold: true }, currentModel.name),
                h(Text, { color: colors.dim }, ' ▶'),
                h(Text, { color: colors.dim }, ` (${currentModel.desc})`),
            ),

            // Stream response toggle
            h(Box, {},
                h(Text, { color: settingIndex === 1 ? colors.accent : colors.dim }, settingIndex === 1 ? '▶ ' : '  '),
                h(Text, { color: colors.text }, 'Stream Response: '),
                h(Text, { color: settings.streamResponse ? colors.user : colors.dim, bold: true },
                    settings.streamResponse ? '[ON]' : '[OFF]'),
            ),

            h(Box, { marginTop: 2 },
                h(Text, { color: colors.dim }, 'System prompt loaded from: system-prompt.txt'),
            ),

            h(Text, { color: colors.accent, marginTop: 1 }, '─'.repeat(50)),
            h(Box, { gap: 1 },
                h(Badge, { color: 'cyan' }, '↑↓'), h(Text, { color: colors.dim }, 'select'),
                h(Badge, { color: 'yellow' }, '←→'), h(Text, { color: colors.dim }, 'change'),
                h(Badge, { color: 'gray' }, 'ESC'), h(Text, { color: colors.dim }, 'back'),
            )
        );
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Box, { gap: 0 },
                h(Text, { color: colors.accent, bold: true }, '◢◤◢◤◢'),
                h(Text, { backgroundColor: colors.accent, color: '#000000', bold: true }, ' NEORIN/AI '),
                h(Text, { color: colors.accent, bold: true }, '◤◢◤◢◤'),
                h(Text, null, ' '),
                isLoading && h(Spinner, { type: 'dots' }),
                error && h(Badge, { color: 'red' }, 'ERR'),
            ),
            h(Box, { gap: 1 },
                h(Text, { color: colors.dim }, currentSession.name),
                h(Badge, { color: 'cyan' }, settings.model),
            )
        ),

        // Content area
        mode === 'sessions' || mode === 'rename' ?
            renderSessionsView() :
            mode === 'settings' ?
                renderSettingsView() :
                h(Box, { flexDirection: 'column', height: viewportHeight, overflow: 'hidden', paddingX: 1 },
                    h(ScrollView, { ref: scrollRef, height: viewportHeight - 2 },
                        h(Box, { flexDirection: 'column', paddingY: 1 },
                            ...currentSession.messages.map((msg, i) => renderMessageBox(msg, i)),
                            streamingText && renderMessageBox({ role: 'assistant', content: '' }, 'streaming', true)
                        )
                    )
                ),

        // Input area (only in chat mode)
        mode === 'chat' && h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: inputMode ? colors.accent : '#333333',
            borderTop: true, borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: colors.user }, '◢'),
            inputMode ?
                h(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, placeholder: 'Type your message...' }) :
                h(Text, { color: colors.dim }, 'Press I to type a message...')
        ),

        // Footer
        h(Box, { paddingX: 1, gap: 1 },
            mode === 'chat' ? [
                h(Badge, { key: 'i', color: 'green' }, 'I'), h(Text, { key: 'it', color: colors.dim }, 'chat'),
                h(Badge, { key: 's', color: 'magenta' }, 'S'), h(Text, { key: 'st', color: colors.dim }, 'sessions'),
                h(Badge, { key: 'o', color: 'cyan' }, 'O'), h(Text, { key: 'ot', color: colors.dim }, 'settings'),
                h(Badge, { key: 'c', color: 'yellow' }, 'C'), h(Text, { key: 'ct', color: colors.dim }, 'clear'),
            ] : null
        )
    );
};

export default Program;
