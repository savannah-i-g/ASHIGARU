import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useSettings } from '../core/SettingsContext.js';

interface IntroProps {
    onComplete: () => void;
}

const ASHIGARU_BLOCK = [
    '█▀█ █▀▀ █ █ █ █▀▀ █▀█ █▀█ █ █',
    '█▀█ ▀▀█ █▀█ █ █ █ █▀█ █▀▄ █ █',
    '▀ ▀ ▀▀▀ ▀ ▀ ▀ ▀▀▀ ▀ ▀ ▀ ▀ ▀▀▀',
];

const PULSE_CHARS = ['·', '•', '●', '•', '·', ' '];
const GLITCH_CHARS = '░▒▓█▀▄▌▐┤├┴┬│─╱╲╳';

export const Intro: React.FC<IntroProps> = ({ onComplete }) => {
    const { stdout } = useStdout();
    const { theme } = useSettings();
    const width = stdout?.columns || 80;
    const height = stdout?.rows || 24;

    const [phase, setPhase] = useState<'starting' | 'wipe' | 'pulse' | 'logo' | 'build'>('starting');
    const [frame, setFrame] = useState(0);
    const completedRef = useRef(false);

    const logoWidth = ASHIGARU_BLOCK[0].length;
    const logoHeight = ASHIGARU_BLOCK.length;
    const startX = Math.floor((width - logoWidth) / 2);
    const startY = Math.floor((height - logoHeight) / 2); // Center logo vertically

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prevFrame) => {
                const newFrame = prevFrame + 1;

                // Phase transitions
                if (phase === 'starting' && newFrame > 16) {  // ~1 second
                    setPhase('wipe');
                    return 0;
                } else if (phase === 'wipe' && newFrame > 10) {  // ~600ms quick wipe
                    setPhase('pulse');
                    return 0;
                } else if (phase === 'pulse' && newFrame > 10) {
                    setPhase('logo');
                    return 0;
                } else if (phase === 'logo' && newFrame > 15) {
                    setPhase('build');
                    return 0;
                } else if (phase === 'build' && newFrame > 15) {
                    if (!completedRef.current) {
                        completedRef.current = true;
                        setTimeout(() => onComplete(), 50);
                    }
                }

                return newFrame;
            });
        }, 60);

        return () => clearInterval(interval);
    }, [phase, onComplete]);

    // Starting text display
    if (phase === 'starting') {
        const centerY = Math.floor(height / 2);
        const text = 'STARTING';
        const textX = Math.floor((width - text.length) / 2);

        return (
            <Box flexDirection="column" width="100%" height="100%">
                {Array(height).fill(null).map((_, y) => {
                    let line = ' '.repeat(width);
                    if (y === centerY) {
                        const chars = line.split('');
                        for (let i = 0; i < text.length; i++) {
                            if (textX + i >= 0 && textX + i < width) {
                                chars[textX + i] = text[i];
                            }
                        }
                        line = chars.join('');
                    }
                    return (
                        <Text key={y} color={theme.colors.accent.primary}>
                            {line}
                        </Text>
                    );
                })}
            </Box>
        );
    }

    // Cyberpunk glitch wipe effect
    if (phase === 'wipe') {
        const wipeProgress = frame / 10;
        const wipeY = Math.floor(height * wipeProgress);

        return (
            <Box flexDirection="column" width="100%" height="100%">
                {Array(height).fill(null).map((_, y) => {
                    let line: string;

                    if (y < wipeY - 2) {
                        // Already wiped - empty
                        line = ' '.repeat(width);
                    } else if (y >= wipeY - 2 && y <= wipeY) {
                        // Glitch zone - random glitch characters
                        const chars: string[] = [];
                        for (let x = 0; x < width; x++) {
                            if (Math.random() < 0.3) {
                                chars.push(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
                            } else {
                                chars.push(' ');
                            }
                        }
                        line = chars.join('');
                    } else {
                        // Not yet wiped - show starting text fading
                        const centerY = Math.floor(height / 2);
                        const text = 'STARTING';
                        const textX = Math.floor((width - text.length) / 2);

                        const chars = ' '.repeat(width).split('');
                        if (y === centerY && Math.random() < 0.5) {
                            // Glitchy remaining text
                            for (let i = 0; i < text.length; i++) {
                                if (textX + i >= 0 && textX + i < width) {
                                    chars[textX + i] = Math.random() < 0.7 ? text[i] : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                                }
                            }
                        }
                        line = chars.join('');
                    }

                    return (
                        <Text key={y} color={theme.colors.accent.secondary}>
                            {line}
                        </Text>
                    );
                })}
            </Box>
        );
    }

    // Simple pulsing dot in center
    if (phase === 'pulse') {
        const pulseChar = PULSE_CHARS[frame % PULSE_CHARS.length];
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);

        return (
            <Box flexDirection="column" width="100%" height="100%">
                {Array(height).fill(null).map((_, y) => {
                    let line = ' '.repeat(width);
                    if (y === centerY) {
                        const chars = line.split('');
                        chars[centerX] = pulseChar;
                        line = chars.join('');
                    }
                    return (
                        <Text key={y} color={theme.colors.accent.primary}>
                            {line}
                        </Text>
                    );
                })}
            </Box>
        );
    }

    // Logo reveal phase
    if (phase === 'logo') {
        const revealProgress = frame / 15;
        const maxReveal = Math.floor(logoWidth * revealProgress);
        const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

        // Draw logo at the top
        for (let ly = 0; ly < logoHeight; ly++) {
            const line = ASHIGARU_BLOCK[ly];
            const midX = Math.floor(logoWidth / 2);

            for (let lx = 0; lx < logoWidth; lx++) {
                const distFromCenter = Math.abs(lx - midX);
                const gy = startY + ly;
                const gx = startX + lx;

                if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
                    if (distFromCenter <= maxReveal) {
                        grid[gy][gx] = line[lx] || ' ';
                    } else if (distFromCenter <= maxReveal + 2) {
                        grid[gy][gx] = '░';
                    }
                }
            }
        }

        return (
            <Box flexDirection="column" width="100%" height="100%">
                {grid.map((row, y) => (
                    <Text key={y} color={theme.colors.accent.primary}>
                        {row.join('')}
                    </Text>
                ))}
            </Box>
        );
    }

    // Build border phase - optimized rendering
    const buildProgress = Math.min(1, frame / 15);
    const padding = 2;
    const boxWidth = logoWidth + padding * 2;
    const boxHeight = logoHeight + padding * 2;
    const boxStartX = startX - padding;
    const boxStartY = startY - padding;

    // For centered box border
    const halfBoxW = Math.floor(boxWidth / 2);
    const builtBoxH = Math.floor(halfBoxW * buildProgress);
    const halfBoxH = Math.floor(boxHeight / 2);
    const builtBoxV = Math.floor(halfBoxH * buildProgress);

    // For full-screen border
    const halfW = Math.floor(width / 2);
    const builtH = Math.floor(halfW * buildProgress);
    const halfH = Math.floor(height / 2);
    const builtV = Math.floor(halfH * buildProgress);

    // Helper to build a single line efficiently
    const buildLine = (y: number): string => {
        const chars: string[] = new Array(width).fill(' ');

        // Draw logo if on this line
        if (y >= startY && y < startY + logoHeight) {
            const logoLine = ASHIGARU_BLOCK[y - startY];
            for (let x = 0; x < logoWidth; x++) {
                chars[startX + x] = logoLine[x];
            }
        }

        // Draw centered box border if on this line
        const boxY = y - boxStartY;
        if (boxY >= 0 && boxY < boxHeight) {
            const isTopEdge = boxY === 0;
            const isBottomEdge = boxY === boxHeight - 1;

            if (isTopEdge || isBottomEdge) {
                // Top or bottom edge of box
                for (let x = 0; x < boxWidth; x++) {
                    const gx = boxStartX + x;
                    if (gx < 0 || gx >= width) continue;
                    if (chars[gx] !== ' ') continue; // Don't overwrite logo

                    const distFromCenter = Math.abs(x - halfBoxW);
                    if (x === 0) chars[gx] = isTopEdge ? '┌' : '└';
                    else if (x === boxWidth - 1) chars[gx] = isTopEdge ? '┐' : '┘';
                    else if (distFromCenter <= builtBoxH) chars[gx] = '─';
                }
            } else {
                // Left/Right edges of box
                const distFromCenter = Math.abs(boxY - halfBoxH);
                if (distFromCenter <= builtBoxV) {
                    if (boxStartX >= 0 && boxStartX < width && chars[boxStartX] === ' ') {
                        chars[boxStartX] = '│';
                    }
                    const rightX = boxStartX + boxWidth - 1;
                    if (rightX >= 0 && rightX < width && chars[rightX] === ' ') {
                        chars[rightX] = '│';
                    }
                }
            }
        }

        // Draw full-screen border
        if (y === 0 || y === height - 1) {
            // Top or bottom edge
            chars[0] = y === 0 ? '┌' : '└';
            chars[width - 1] = y === 0 ? '┐' : '┘';
            for (let x = 1; x <= builtH; x++) {
                if (x < width - 1 && chars[x] === ' ') chars[x] = '─';
                const fromRight = width - 1 - x;
                if (fromRight > 0 && chars[fromRight] === ' ') chars[fromRight] = '─';
            }
        } else {
            // Left/Right edges
            const distFromCenter = Math.abs(y - halfH);
            if (distFromCenter <= builtV) {
                if (y < height - 1 && chars[0] === ' ') chars[0] = '│';
                if (y < height - 1 && chars[width - 1] === ' ') chars[width - 1] = '│';
            }
        }

        return chars.join('');
    };

    return (
        <Box flexDirection="column" width="100%" height="100%">
            {Array(height).fill(null).map((_, y) => {
                const line = buildLine(y);
                return (
                    <Text key={y} color={theme.colors.accent.primary}>
                        {line}
                    </Text>
                );
            })}
        </Box>
    );
};
