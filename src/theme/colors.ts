/**
 * Cyberpunk Minimalist Color Palette
 * Clean, high-contrast, utilitarian
 */
export const colors = {
    // Backgrounds
    bg: {
        primary: '#000000',
        secondary: '#0a0a0a',
        panel: '#111111',
    },

    // Foregrounds
    fg: {
        primary: '#ffffff',
        secondary: '#888888',
        muted: '#555555',
        dim: '#333333',
    },

    // Accent - single cyan for focus/active states
    accent: {
        primary: '#00ffff',
        secondary: '#00aaaa',
        highlight: '#ff00ff',
    },

    // Borders
    border: {
        active: '#00ffff',
        inactive: '#333333',
    },

    // Status
    status: {
        success: '#00ff88',
        error: '#ff4444',
        warning: '#ffaa00',
    },
} as const;

export type ColorTheme = typeof colors;
