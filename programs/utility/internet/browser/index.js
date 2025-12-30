import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Badge, TextInput, Spinner } from '@inkjs/ui';
import { ScrollView } from 'ink-scroll-view';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import querystring from 'querystring';

const h = React.createElement;

const loadTheme = () => {
    try {
        const p = path.join(os.homedir(), '.cypher-tui-settings.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
    } catch { }
    return 'Cyberpunk';
};

const getThemeColors = (t) => ({
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', link: '#00ff88', header: '#ffaa00', dim: '#555555', text: '#cccccc', input: '#00ffff' },
    Mono: { accent: '#ffffff', secondary: '#888888', link: '#aaaaaa', header: '#ffffff', dim: '#555555', text: '#cccccc', input: '#ffffff' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', link: '#00ff00', header: '#00ff00', dim: '#005500', text: '#00aa00', input: '#00ff00' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', link: '#ffcc00', header: '#ffaa00', dim: '#553300', text: '#ddaa00', input: '#ffcc00' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', link: '#00ff88', header: '#ffaa00', dim: '#555555', text: '#cccccc', input: '#00ffff' });

const wrapText = (text, width = 70) => {
    if (!text || text.length <= width) return [text];
    const words = text.split(/\s+/);
    const lines = [];
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
    return lines;
};

const decodeEntities = (text) => {
    const entities = {
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
        '&quot;': '"', '&#39;': "'", '&apos;': "'",
        '&copy;': '©', '&reg;': '®', '&trade;': '™',
        '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
    };
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        result = result.replace(new RegExp(entity, 'gi'), char);
    }
    result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return result;
};

// Extract forms from HTML
const extractForms = (html, baseUrl) => {
    const forms = [];
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formRegex.exec(html)) !== null) {
        const formTag = formMatch[0];
        const formContent = formMatch[1];

        // Extract form attributes
        const actionMatch = formTag.match(/action=["']([^"']*?)["']/i);
        const methodMatch = formTag.match(/method=["']([^"']*?)["']/i);
        const nameMatch = formTag.match(/(?:name|id)=["']([^"']*?)["']/i);

        const action = actionMatch ? actionMatch[1] : '';
        const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();
        const formName = nameMatch ? nameMatch[1] : `form-${forms.length}`;

        // Resolve action URL
        let actionUrl = action;
        if (action && !action.startsWith('http')) {
            try {
                actionUrl = new URL(action, baseUrl).href;
            } catch { actionUrl = baseUrl; }
        } else if (!action) {
            actionUrl = baseUrl;
        }

        // Extract inputs
        const inputs = [];
        const inputRegex = /<input[^>]*>/gi;
        let inputMatch;

        while ((inputMatch = inputRegex.exec(formContent)) !== null) {
            const inputTag = inputMatch[0];
            const typeMatch = inputTag.match(/type=["']([^"']*?)["']/i);
            const nameMatch = inputTag.match(/name=["']([^"']*?)["']/i);
            const valueMatch = inputTag.match(/value=["']([^"']*?)["']/i);
            const placeholderMatch = inputTag.match(/placeholder=["']([^"']*?)["']/i);

            const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
            const name = nameMatch ? nameMatch[1] : '';

            if (name && type !== 'hidden' && type !== 'submit' && type !== 'button' && type !== 'image') {
                inputs.push({
                    type,
                    name,
                    value: valueMatch ? decodeEntities(valueMatch[1]) : '',
                    placeholder: placeholderMatch ? decodeEntities(placeholderMatch[1]) : name,
                });
            }

            // Capture hidden fields for submission
            if (type === 'hidden' && name) {
                inputs.push({
                    type: 'hidden',
                    name,
                    value: valueMatch ? valueMatch[1] : '',
                    placeholder: '',
                });
            }
        }

        // Extract textareas
        const textareaRegex = /<textarea[^>]*name=["']([^"']*?)["'][^>]*>([\s\S]*?)<\/textarea>/gi;
        let textareaMatch;
        while ((textareaMatch = textareaRegex.exec(formContent)) !== null) {
            inputs.push({
                type: 'textarea',
                name: textareaMatch[1],
                value: decodeEntities(textareaMatch[2].replace(/<[^>]+>/g, '')),
                placeholder: textareaMatch[1],
            });
        }

        // Extract select dropdowns
        const selectRegex = /<select[^>]*name=["']([^"']*?)["'][^>]*>([\s\S]*?)<\/select>/gi;
        let selectMatch;
        while ((selectMatch = selectRegex.exec(formContent)) !== null) {
            const options = [];
            const optionRegex = /<option[^>]*value=["']([^"']*?)["'][^>]*>([^<]*)/gi;
            let optMatch;
            while ((optMatch = optionRegex.exec(selectMatch[2])) !== null) {
                options.push({ value: optMatch[1], label: decodeEntities(optMatch[2].trim()) });
            }
            if (options.length > 0) {
                inputs.push({
                    type: 'select',
                    name: selectMatch[1],
                    value: options[0].value,
                    placeholder: selectMatch[1],
                    options,
                });
            }
        }

        // Only add forms with fillable inputs
        const fillableInputs = inputs.filter(i => i.type !== 'hidden');
        if (fillableInputs.length > 0) {
            forms.push({
                name: formName,
                action: actionUrl,
                method,
                inputs,
            });
        }
    }

    return forms;
};

// HTML to content converter
const htmlToContent = (html, lineWidth = 70) => {
    const content = [];

    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
    html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Untitled';

    const links = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
        const href = linkMatch[1];
        const text = decodeEntities(linkMatch[2].replace(/<[^>]+>/g, '').trim());
        if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            links.push({ href, text: text.slice(0, 50) });
        }
    }

    // Mark forms in content
    html = html.replace(/<form[^>]*>/gi, '\n[[FORM]]\n');
    html = html.replace(/<\/form>/gi, '\n[[/FORM]]\n');
    html = html.replace(/<input[^>]*type=["']?submit["']?[^>]*value=["']([^"']+)["'][^>]*>/gi, '\n  [[BUTTON:$1]]\n');
    html = html.replace(/<input[^>]*type=["']?submit["']?[^>]*>/gi, '\n  [[BUTTON:Submit]]\n');
    html = html.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, '\n  [[BUTTON:$1]]\n');
    html = html.replace(/<input[^>]*placeholder=["']([^"']+)["'][^>]*>/gi, '\n  ┌ $1: [________________]\n');
    html = html.replace(/<input[^>]*name=["']([^"']+)["'][^>]*>/gi, '\n  ┌ $1: [________________]\n');

    html = html.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n[[H1]]$1[[/H1]]\n');
    html = html.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n[[H2]]$1[[/H2]]\n');
    html = html.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n[[H3]]$1[[/H3]]\n');
    html = html.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n[[H4]]$1[[/H4]]\n');
    html = html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n[[QUOTE]]$1[[/QUOTE]]\n');
    html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n[[CODE]]$1[[/CODE]]\n');
    html = html.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
    html = html.replace(/<ul[^>]*>/gi, '\n[[UL]]');
    html = html.replace(/<\/ul>/gi, '[[/UL]]\n');
    html = html.replace(/<ol[^>]*>/gi, '\n[[OL]]');
    html = html.replace(/<\/ol>/gi, '[[/OL]]\n');
    html = html.replace(/<li[^>]*>/gi, '[[LI]]');
    html = html.replace(/<\/li>/gi, '[[/LI]]');
    html = html.replace(/<p[^>]*>/gi, '\n[[P]]');
    html = html.replace(/<\/p>/gi, '[[/P]]\n');
    html = html.replace(/<br\s*\/?>/gi, '\n');
    html = html.replace(/<hr\s*\/?>/gi, '\n[[HR]]\n');
    html = html.replace(/<\/?(?:div|section|article|header|footer|nav|main|aside|figure|table|tr|td|th)[^>]*>/gi, '\n');
    html = html.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
    html = html.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '_$1_');
    html = html.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const cleanText = text.replace(/<[^>]+>/g, '').trim();
        return cleanText ? `[${cleanText}]` : '';
    });

    html = html.replace(/<[^>]+>/g, '');
    html = decodeEntities(html);

    const lines = html.split('\n');
    let inList = false, listType = 'ul', listCounter = 0, inQuote = false, inCode = false, inForm = false;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.includes('[[FORM]]')) { inForm = true; content.push({ type: 'form', text: '┌─ FORM ─────────────────────────────────' }); continue; }
        if (line.includes('[[/FORM]]')) { inForm = false; content.push({ type: 'form', text: '└─────────────────────────────────────────' }); continue; }

        if (line.includes('[[BUTTON:')) {
            const btnText = line.replace(/\[\[BUTTON:/g, '').replace(/\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            content.push({ type: 'button', text: `  ◢ [${btnText}] ◤` });
            continue;
        }

        if (line.includes('[[H1]]')) {
            const text = line.replace(/\[\[H1\]\]/g, '').replace(/\[\[\/H1\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            if (text) { content.push({ type: 'spacer', text: '' }); content.push({ type: 'h1', text: `═══ ${text.toUpperCase()} ═══` }); content.push({ type: 'spacer', text: '' }); }
            continue;
        }
        if (line.includes('[[H2]]')) {
            const text = line.replace(/\[\[H2\]\]/g, '').replace(/\[\[\/H2\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            if (text) { content.push({ type: 'spacer', text: '' }); content.push({ type: 'h2', text: `── ${text} ──` }); }
            continue;
        }
        if (line.includes('[[H3]]')) {
            const text = line.replace(/\[\[H3\]\]/g, '').replace(/\[\[\/H3\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            if (text) content.push({ type: 'h3', text: `▸ ${text}` });
            continue;
        }
        if (line.includes('[[H4]]')) {
            const text = line.replace(/\[\[H4\]\]/g, '').replace(/\[\[\/H4\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            if (text) content.push({ type: 'h4', text: `  ${text}` });
            continue;
        }
        if (line.includes('[[HR]]')) { content.push({ type: 'hr', text: '─'.repeat(lineWidth - 4) }); continue; }

        if (line.includes('[[UL]]')) { inList = true; listType = 'ul'; line = line.replace('[[UL]]', ''); }
        if (line.includes('[[OL]]')) { inList = true; listType = 'ol'; listCounter = 0; line = line.replace('[[OL]]', ''); }
        if (line.includes('[[/UL]]') || line.includes('[[/OL]]')) { inList = false; line = line.replace('[[/UL]]', '').replace('[[/OL]]', ''); }

        if (line.includes('[[LI]]')) {
            const itemText = line.replace(/\[\[LI\]\]/g, '').replace(/\[\[\/LI\]\]/g, '').replace(/<[^>]+>/g, '').trim();
            if (itemText) {
                if (listType === 'ol') { listCounter++; const wrapped = wrapText(itemText, lineWidth - 6); content.push({ type: 'list', text: `  ${listCounter}. ${wrapped[0]}` }); for (let i = 1; i < wrapped.length; i++) content.push({ type: 'list', text: `     ${wrapped[i]}` }); }
                else { const wrapped = wrapText(itemText, lineWidth - 6); content.push({ type: 'list', text: `  • ${wrapped[0]}` }); for (let i = 1; i < wrapped.length; i++) content.push({ type: 'list', text: `    ${wrapped[i]}` }); }
            }
            continue;
        }

        if (line.includes('[[CODE]]')) { inCode = true; line = line.replace('[[CODE]]', ''); }
        if (line.includes('[[/CODE]]')) { inCode = false; line = line.replace('[[/CODE]]', ''); }
        if (inCode) { const codeText = line.replace(/\[\[CODE\]\]/g, '').replace(/\[\[\/CODE\]\]/g, '').trim(); if (codeText) content.push({ type: 'code', text: `  │ ${codeText}` }); continue; }

        if (line.includes('[[QUOTE]]')) { inQuote = true; line = line.replace('[[QUOTE]]', ''); }
        if (line.includes('[[/QUOTE]]')) { inQuote = false; line = line.replace('[[/QUOTE]]', ''); }
        if (line.includes('[[P]]') || line.includes('[[/P]]')) { line = line.replace(/\[\[P\]\]/g, '').replace(/\[\[\/P\]\]/g, ''); }

        line = line.replace(/\[\[[^\]]+\]\]/g, '').trim();

        if (line) {
            line = line.replace(/\s+/g, ' ').trim();
            const prefix = inQuote ? '│ ' : (inForm ? '│ ' : '');
            const wrapped = wrapText(line, lineWidth - prefix.length - 2);
            for (const wrappedLine of wrapped) {
                if (inQuote) content.push({ type: 'quote', text: `${prefix}${wrappedLine}` });
                else if (wrappedLine.includes('[') && wrappedLine.includes(']')) content.push({ type: 'link', text: wrappedLine });
                else if (inForm) content.push({ type: 'form', text: `${prefix}${wrappedLine}` });
                else content.push({ type: 'text', text: wrappedLine });
            }
        }
    }

    return { title, content, links };
};

// Fetch with GET or POST
const fetchUrl = (url, method = 'GET', postData = null) => {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const protocol = parsed.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: method,
            headers: {
                'User-Agent': 'ASHIGARU-Browser/1.0 (TUI; Text-mode)',
                'Accept': 'text/html,text/plain,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 15000,
        };

        if (method === 'POST' && postData) {
            const body = querystring.stringify(postData);
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = protocol.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, url).href;
                fetchUrl(redirectUrl, 'GET', null).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data, contentType: res.headers['content-type'] || '', finalUrl: url });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

        if (method === 'POST' && postData) {
            req.write(querystring.stringify(postData));
        }
        req.end();
    });
};

const Program = ({ isFocused, onClose, lockInput, unlockInput }) => {
    const colors = getThemeColors(loadTheme());
    const { stdout } = useStdout();
    const termWidth = stdout?.columns || 80;
    const viewportHeight = (stdout?.rows || 24) - 10;
    const lineWidth = Math.min(termWidth - 6, 80);

    const [url, setUrl] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [mode, setMode] = useState('browse'); // browse, url, bookmarks, links, form
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('ASHIGARU Browser');
    const [content, setContent] = useState([
        { type: 'h1', text: '═══ WELCOME TO ASHIGARU BROWSER ═══' },
        { type: 'spacer', text: '' },
        { type: 'text', text: 'A text-based web browser with form support.' },
        { type: 'spacer', text: '' },
        { type: 'h3', text: '▸ Controls' },
        { type: 'list', text: '  • G - Go to URL' },
        { type: 'list', text: '  • B - Bookmarks' },
        { type: 'list', text: '  • L - Links on page' },
        { type: 'list', text: '  • F - Fill forms' },
        { type: 'list', text: '  • R - Reload' },
        { type: 'list', text: '  • j/k - Scroll' },
    ]);
    const [links, setLinks] = useState([]);
    const [forms, setForms] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [bookmarks, setBookmarks] = useState(['https://lite.duckduckgo.com', 'https://news.ycombinator.com', 'https://text.npr.org', 'https://example.com']);
    const [listIndex, setListIndex] = useState(0);

    // Form state
    const [currentForm, setCurrentForm] = useState(null);
    const [formFieldIndex, setFormFieldIndex] = useState(0);
    const [formValues, setFormValues] = useState({});
    const [editingField, setEditingField] = useState(false);
    const [fieldInput, setFieldInput] = useState('');
    const [rawHtml, setRawHtml] = useState('');

    const scrollRef = useRef(null);

    useEffect(() => {
        if ((mode === 'url' || editingField) && lockInput) lockInput();
        else if (mode !== 'url' && !editingField && unlockInput) unlockInput();
    }, [mode, editingField, lockInput, unlockInput]);

    useEffect(() => { return () => { if (unlockInput) unlockInput(); }; }, [unlockInput]);

    const navigate = async (targetUrl, method = 'GET', postData = null) => {
        if (!targetUrl) return;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = 'https://' + targetUrl;

        setLoading(true);
        setError('');
        setUrl(targetUrl);
        setMode('browse');
        setCurrentForm(null);

        try {
            const result = await fetchUrl(targetUrl, method, postData);
            setRawHtml(result.data);

            if (result.statusCode >= 400) {
                setError(`HTTP ${result.statusCode}`);
                setContent([{ type: 'error', text: `Error: HTTP ${result.statusCode}` }]);
                setTitle('Error');
            } else {
                const parsed = htmlToContent(result.data, lineWidth);
                setTitle(parsed.title);
                setContent(parsed.content);
                setLinks(parsed.links);
                setForms(extractForms(result.data, targetUrl));

                setHistory(prev => [...prev.filter(h => h !== targetUrl), targetUrl]);
                setHistoryIndex(history.length);
            }
        } catch (e) {
            setError(e.message);
            setContent([{ type: 'error', text: `Error: ${e.message}` }]);
            setTitle('Error');
        }

        setLoading(false);
        scrollRef.current?.scrollToTop();
    };

    const submitForm = () => {
        if (!currentForm) return;

        const data = {};
        for (const input of currentForm.inputs) {
            data[input.name] = formValues[input.name] !== undefined ? formValues[input.name] : input.value;
        }

        if (currentForm.method === 'GET') {
            const queryStr = querystring.stringify(data);
            const submitUrl = currentForm.action + (currentForm.action.includes('?') ? '&' : '?') + queryStr;
            navigate(submitUrl, 'GET', null);
        } else {
            navigate(currentForm.action, 'POST', data);
        }
    };

    const goBack = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); navigate(history[historyIndex - 1]); } };
    const goForward = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); navigate(history[historyIndex + 1]); } };

    useInput((input, key) => {
        if (!isFocused) return;

        // URL input mode
        if (mode === 'url') {
            if (key.escape) { setMode('browse'); setUrlInput(''); }
            return;
        }

        // Form field editing
        if (editingField && currentForm) {
            if (key.escape) {
                setEditingField(false);
                setFieldInput('');
                return;
            }
            return; // TextInput handles input
        }

        // Form mode
        if (mode === 'form' && currentForm) {
            const fillableInputs = currentForm.inputs.filter(i => i.type !== 'hidden');
            if (key.escape) { setMode('browse'); setCurrentForm(null); return; }
            if (key.upArrow) { setFormFieldIndex(i => Math.max(0, i - 1)); return; }
            if (key.downArrow) { setFormFieldIndex(i => Math.min(fillableInputs.length, i + 1)); return; }
            if (key.return) {
                if (formFieldIndex >= fillableInputs.length) {
                    // Submit button
                    submitForm();
                } else {
                    // Edit field
                    const field = fillableInputs[formFieldIndex];
                    if (field.type === 'select' && field.options) {
                        // Cycle through options
                        const currentVal = formValues[field.name] || field.value;
                        const currentIdx = field.options.findIndex(o => o.value === currentVal);
                        const nextIdx = (currentIdx + 1) % field.options.length;
                        setFormValues(prev => ({ ...prev, [field.name]: field.options[nextIdx].value }));
                    } else {
                        setEditingField(true);
                        setFieldInput(formValues[field.name] || field.value || '');
                    }
                }
                return;
            }
            return;
        }

        // List modes (bookmarks, links, form selection)
        if (mode === 'bookmarks' || mode === 'links' || mode === 'formselect') {
            const list = mode === 'bookmarks' ? bookmarks : mode === 'links' ? links : forms;
            if (key.escape) { setMode('browse'); return; }
            if (key.upArrow) { setListIndex(i => Math.max(0, i - 1)); return; }
            if (key.downArrow) { setListIndex(i => Math.min(list.length - 1, i + 1)); return; }
            if (key.return) {
                if (mode === 'bookmarks') navigate(bookmarks[listIndex]);
                else if (mode === 'links' && links[listIndex]) {
                    const href = links[listIndex].href;
                    navigate(href.startsWith('http') ? href : new URL(href, url).href);
                }
                else if (mode === 'formselect' && forms[listIndex]) {
                    setCurrentForm(forms[listIndex]);
                    setFormFieldIndex(0);
                    setFormValues({});
                    setMode('form');
                }
                return;
            }
            return;
        }

        // Browse mode
        if (input === 'g' || input === 'G') { setMode('url'); setUrlInput(url); return; }
        if (input === 'b' || input === 'B') { setMode('bookmarks'); setListIndex(0); return; }
        if (input === 'l' || input === 'L') { setMode('links'); setListIndex(0); return; }
        if (input === 'f' || input === 'F') {
            if (forms.length === 1) {
                setCurrentForm(forms[0]);
                setFormFieldIndex(0);
                setFormValues({});
                setMode('form');
            } else if (forms.length > 1) {
                setMode('formselect');
                setListIndex(0);
            }
            return;
        }
        if (input === 'r' || input === 'R') { if (url) navigate(url); return; }
        if (input === 'a' || input === 'A') { if (url && !bookmarks.includes(url)) setBookmarks(prev => [...prev, url]); return; }
        if (key.leftArrow || input === 'h') { goBack(); return; }
        if (key.rightArrow) { goForward(); return; }
        if (key.upArrow || input === 'k') { scrollRef.current?.scrollBy(-1); return; }
        if (key.downArrow || input === 'j') { scrollRef.current?.scrollBy(1); return; }
        if (key.pageUp) { scrollRef.current?.scrollBy(-viewportHeight); return; }
        if (key.pageDown) { scrollRef.current?.scrollBy(viewportHeight); return; }
        if (input === 'q' || input === 'Q') { if (onClose) onClose(); return; }
    }, { isActive: isFocused });

    const handleUrlSubmit = (value) => { setMode('browse'); navigate(value); };

    const handleFieldSubmit = (value) => {
        if (currentForm) {
            const fillableInputs = currentForm.inputs.filter(i => i.type !== 'hidden');
            const field = fillableInputs[formFieldIndex];
            if (field) {
                setFormValues(prev => ({ ...prev, [field.name]: value }));
            }
        }
        setEditingField(false);
        setFieldInput('');
    };

    const borderColor = isFocused ? colors.accent : '#333333';

    const getLineStyle = (type) => ({
        h1: { color: colors.header, bold: true }, h2: { color: colors.secondary, bold: true },
        h3: { color: colors.accent, bold: false }, h4: { color: colors.text, bold: true },
        text: { color: colors.text, bold: false }, link: { color: colors.link, bold: false },
        list: { color: colors.text, bold: false }, quote: { color: colors.dim, bold: false },
        code: { color: colors.accent, bold: false }, hr: { color: colors.dim, bold: false },
        spacer: { color: colors.text, bold: false }, error: { color: '#ff4444', bold: true },
        form: { color: colors.secondary, bold: false }, button: { color: colors.input, bold: true },
    }[type] || { color: colors.text, bold: false });

    // Render overlays
    const renderOverlay = () => {
        if (mode === 'bookmarks') {
            return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                h(Text, { color: colors.accent, bold: true }, '◢ BOOKMARKS'),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                ...bookmarks.map((bm, i) => h(Box, { key: i },
                    h(Text, { color: i === listIndex ? colors.accent : colors.dim }, i === listIndex ? '▶ ' : '  '),
                    h(Text, { color: i === listIndex ? colors.link : '#888888' }, bm)
                )),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                h(Text, { color: colors.dim }, '[Enter] Open  [ESC] Cancel')
            );
        }
        if (mode === 'links') {
            return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                h(Text, { color: colors.accent, bold: true }, `◢ LINKS (${links.length})`),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                ...links.slice(0, 15).map((link, i) => h(Box, { key: i },
                    h(Text, { color: i === listIndex ? colors.accent : colors.dim }, i === listIndex ? '▶ ' : '  '),
                    h(Text, { color: i === listIndex ? colors.link : '#888888' }, link.text.slice(0, 45))
                )),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                h(Text, { color: colors.dim }, '[Enter] Open  [ESC] Cancel')
            );
        }
        if (mode === 'formselect') {
            return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                h(Text, { color: colors.accent, bold: true }, `◢ FORMS (${forms.length})`),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                ...forms.map((form, i) => h(Box, { key: i },
                    h(Text, { color: i === listIndex ? colors.accent : colors.dim }, i === listIndex ? '▶ ' : '  '),
                    h(Text, { color: i === listIndex ? colors.secondary : '#888888' }, `${form.name} (${form.inputs.filter(x => x.type !== 'hidden').length} fields)`)
                )),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                h(Text, { color: colors.dim }, '[Enter] Select  [ESC] Cancel')
            );
        }
        if (mode === 'form' && currentForm) {
            const fillableInputs = currentForm.inputs.filter(i => i.type !== 'hidden');
            return h(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
                h(Text, { color: colors.accent, bold: true }, `◢ FORM: ${currentForm.name}`),
                h(Text, { color: colors.dim }, `${currentForm.method} → ${currentForm.action.slice(0, 40)}`),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                ...fillableInputs.map((field, i) => {
                    const value = formValues[field.name] !== undefined ? formValues[field.name] : field.value;
                    const isSelected = i === formFieldIndex;
                    const displayVal = field.type === 'select' && field.options
                        ? (field.options.find(o => o.value === value)?.label || value)
                        : value;
                    return h(Box, { key: i, flexDirection: 'column' },
                        h(Box, null,
                            h(Text, { color: isSelected ? colors.accent : colors.dim }, isSelected ? '▶ ' : '  '),
                            h(Text, { color: colors.dim }, `${field.placeholder}: `),
                            isSelected && editingField ?
                                h(TextInput, { value: fieldInput, onChange: setFieldInput, onSubmit: handleFieldSubmit }) :
                                h(Text, { color: isSelected ? colors.input : '#888888' }, `[${displayVal || '___'}]`)
                        )
                    );
                }),
                h(Box, null,
                    h(Text, { color: formFieldIndex >= fillableInputs.length ? colors.accent : colors.dim }, formFieldIndex >= fillableInputs.length ? '▶ ' : '  '),
                    h(Text, { color: formFieldIndex >= fillableInputs.length ? colors.link : colors.dim, bold: true }, '◢ [SUBMIT] ◤')
                ),
                h(Text, { color: '#333333' }, '─'.repeat(50)),
                h(Text, { color: colors.dim }, '[Enter] Edit/Submit  [↑↓] Navigate  [ESC] Cancel')
            );
        }
        return null;
    };

    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        h(Box, { paddingX: 1, justifyContent: 'space-between', borderStyle: 'single', borderColor: '#333333', borderTop: false, borderLeft: false, borderRight: false },
            h(Box, { gap: 1 },
                h(Text, { color: colors.accent, bold: true }, '◢ BROWSER'),
                loading && h(Spinner, { type: 'dots' }),
                error && h(Badge, { color: 'red' }, 'ERR'),
                forms.length > 0 && h(Badge, { color: 'magenta' }, `${forms.length}F`),
            ),
            h(Text, { color: colors.dim }, title.slice(0, 30))
        ),

        h(Box, { paddingX: 1, gap: 1, borderStyle: 'single', borderColor: mode === 'url' ? colors.accent : '#333333', borderTop: false, borderLeft: false, borderRight: false },
            h(Badge, { color: 'cyan' }, 'URL'),
            mode === 'url' ?
                h(TextInput, { value: urlInput, onChange: setUrlInput, onSubmit: handleUrlSubmit, placeholder: 'Enter URL...' }) :
                h(Text, { color: url ? '#888888' : colors.dim }, url || 'Press G to enter URL')
        ),

        renderOverlay() ||
        h(Box, { flexDirection: 'column', flexGrow: 1, overflow: 'hidden' },
            h(ScrollView, { ref: scrollRef },
                ...content.map((line, i) => {
                    const style = getLineStyle(line.type);
                    return h(Text, { key: i, color: style.color, bold: style.bold }, line.text || ' ');
                })
            )
        ),

        h(Box, { paddingX: 1, justifyContent: 'space-between' },
            h(Box, { gap: 1 },
                links.length > 0 && h(Badge, { color: 'green' }, `${links.length}L`),
                history.length > 0 && h(Badge, { color: 'gray' }, `${historyIndex + 1}/${history.length}`),
            ),
            h(Text, { color: colors.dim }, `${content.length} lines`)
        ),

        h(Box, { paddingX: 1, gap: 1 },
            h(Badge, { color: 'cyan' }, 'G'), h(Text, { color: colors.dim }, 'url'),
            h(Badge, { color: 'yellow' }, 'B'), h(Text, { color: colors.dim }, 'marks'),
            h(Badge, { color: 'green' }, 'L'), h(Text, { color: colors.dim }, 'links'),
            forms.length > 0 && h(Badge, { color: 'magenta' }, 'F'),
            forms.length > 0 && h(Text, { color: colors.dim }, 'form'),
            h(Badge, { color: 'gray' }, 'R'), h(Text, { color: colors.dim }, 'reload'),
        )
    );
};

export default Program;
