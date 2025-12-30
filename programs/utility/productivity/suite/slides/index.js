import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { readFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const h = React.createElement;

const SuiteSlides = ({ isFocused, onClose, settings, lockInput, unlockInput }) => {
    const currentTheme = settings?.theme || 'Cyberpunk';
    const themeColors = {
        Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', success: '#00ff88', error: '#ff4444', muted: '#666666' },
        Mono: { accent: '#ffffff', secondary: '#888888', success: '#ffffff', error: '#aaaaaa', muted: '#555555' },
        Matrix: { accent: '#00ff00', secondary: '#88ff00', success: '#00ff00', error: '#ff0000', muted: '#004400' },
        Amber: { accent: '#ffaa00', secondary: '#ff6600', success: '#ffcc00', error: '#ff3300', muted: '#663300' },
    };
    const colors = themeColors[currentTheme];

    const [mode, setMode] = React.useState('menu'); // menu, file-open, view
    const [presentation, setPresentation] = React.useState({
        title: 'New Presentation',
        author: '',
        slides: [
            { title: 'Welcome', content: ['Create or open a presentation to begin'], style: 'normal' }
        ]
    });
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [inputValue, setInputValue] = React.useState('');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Lock/unlock input
    React.useEffect(() => {
        const isTextInputMode = mode === 'file-open';
        if (isFocused && isTextInputMode) {
            lockInput?.();
        } else {
            unlockInput?.();
        }
        return () => unlockInput?.();
    }, [mode, isFocused, lockInput, unlockInput]);

    const openPresentation = async (filePath) => {
        try {
            const fullPath = filePath.startsWith('/') || filePath.startsWith('~')
                ? filePath.replace('~', os.homedir())
                : path.resolve(filePath);
            const content = await readFile(fullPath, 'utf-8');
            const pres = JSON.parse(content);

            // Validate structure
            if (!pres.slides || !Array.isArray(pres.slides) || pres.slides.length === 0) {
                throw new Error('Invalid presentation format');
            }

            setPresentation(pres);
            setCurrentSlide(0);
            setMessage(`Loaded: ${pres.title}`);
            setMode('view');
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    const menuItems = [
        { label: 'Open Presentation', value: 'open' },
        { label: 'View Current', value: 'view' },
        { label: 'Exit', value: 'exit' },
    ];

    const handleMenuSelect = (item) => {
        if (item.value === 'open') {
            setMode('file-open');
            setInputValue('');
        } else if (item.value === 'view') {
            setMode('view');
        } else if (item.value === 'exit') {
            onClose();
        }
    };

    const nextSlide = () => {
        if (currentSlide < presentation.slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    // Dedicated ESC handler
    useInput((input, key) => {
        if (!isFocused) return;
        if (key.escape) {
            if (mode === 'view') {
                setMode('menu');
            } else if (mode === 'menu') {
                onClose();
            } else {
                setMode('menu');
            }
        }
    }, { isActive: isFocused });

    useInput((input, key) => {
        if (!isFocused) return;

        if (mode === 'view') {
            if (key.rightArrow || input === 'n' || input === 'N') {
                nextSlide();
            } else if (key.leftArrow || input === 'p' || input === 'P') {
                prevSlide();
            } else if (input === 'm' || input === 'M') {
                setMode('menu');
            }
        }
    }, { isActive: isFocused && mode === 'view' });

    const renderHeader = () => {
        return h(Box, { flexDirection: 'column', marginBottom: 1 },
            h(Box, { borderStyle: 'single', borderColor: colors.accent, paddingX: 1, justifyContent: 'space-between' },
                h(Box, {},
                    h(Text, { bold: true, color: colors.accent }, 'Suite Slides')
                ),
                h(Box, { gap: 1 },
                    h(Text, { color: colors.secondary }, presentation.title),
                    mode === 'view' && h(Text, { color: colors.muted }, ` | ${currentSlide + 1}/${presentation.slides.length}`)
                )
            ),
            message && h(Box, { marginTop: 1, paddingX: 1 },
                h(Text, { color: colors.success }, message)
            )
        );
    };

    const renderSlide = () => {
        const slide = presentation.slides[currentSlide];
        const titleColor = slide.style === 'title' ? colors.accent : colors.secondary;

        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Box, { borderStyle: 'double', borderColor: colors.accent, paddingX: 2, paddingY: 1, flexDirection: 'column', alignItems: 'center' },
                h(Box, { marginBottom: 2, justifyContent: 'center' },
                    h(Text, { bold: true, color: titleColor }, slide.title || '')
                ),
                h(Box, { flexDirection: 'column', alignItems: 'center' },
                    ...slide.content.map((line, idx) =>
                        h(Box, { key: idx, marginBottom: 1, justifyContent: 'center' },
                            h(Text, { color: '#ffffff' }, line)
                        )
                    )
                ),
                slide.notes && h(Box, { marginTop: 2, borderStyle: 'single', borderColor: colors.muted, paddingX: 1 },
                    h(Text, { color: colors.muted, dimColor: true }, `Notes: ${slide.notes}`)
                )
            )
        );
    };

    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1 },
            h(Text, { color: colors.secondary, bold: true }, 'Presentation Menu:'),
            h(Box, { marginTop: 1 },
                h(SelectInput, { items: menuItems, onSelect: handleMenuSelect })
            ),
            h(Box, { marginTop: 2, borderStyle: 'single', borderColor: colors.muted, paddingX: 1, flexDirection: 'column' },
                h(Text, { color: colors.accent, bold: true }, 'JSON Format Example:'),
                h(Text, { color: colors.muted }, '{'),
                h(Text, { color: colors.muted }, '  "title": "My Presentation",'),
                h(Text, { color: colors.muted }, '  "author": "Your Name",'),
                h(Text, { color: colors.muted }, '  "slides": ['),
                h(Text, { color: colors.muted }, '    {'),
                h(Text, { color: colors.muted }, '      "title": "Slide Title",'),
                h(Text, { color: colors.muted }, '      "content": ["Line 1", "Line 2"],'),
                h(Text, { color: colors.muted }, '      "style": "normal",'),
                h(Text, { color: colors.muted }, '      "notes": "Speaker notes"'),
                h(Text, { color: colors.muted }, '    }'),
                h(Text, { color: colors.muted }, '  ]'),
                h(Text, { color: colors.muted }, '}')
            )
        );
    };

    const renderFileInput = () => {
        return h(Box, { flexDirection: 'column', marginTop: 1, paddingX: 1 },
            h(Text, { color: colors.accent }, 'Open Presentation:'),
            h(TextInput, {
                value: inputValue,
                onChange: setInputValue,
                onSubmit: () => openPresentation(inputValue),
                placeholder: 'e.g., ~/presentation.json'
            })
        );
    };

    const renderFooter = () => {
        let shortcuts = '';
        if (mode === 'view') {
            shortcuts = '← →/P N: Navigate Slides | M: Menu | ESC: Back';
        } else if (mode === 'menu') {
            shortcuts = '↑↓: Navigate | Enter: Select | ESC: Close';
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
        mode === 'view' && renderSlide(),
        mode === 'menu' && renderMenu(),
        mode === 'file-open' && renderFileInput(),
        renderFooter()
    );
};

export default SuiteSlides;
