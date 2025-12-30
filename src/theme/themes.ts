/**
 * Theme definitions with multiple palettes
 * All borders angular (single/double), background color variations
 */

export interface ThemeColors {
    bg: {
        base: string;
        panel: string;
        surface: string;
        elevated: string;
    };
    fg: {
        primary: string;
        secondary: string;
        muted: string;
    };
    accent: {
        primary: string;
        secondary: string;
    };
    border: {
        active: string;
        inactive: string;
    };
    status: {
        success: string;
        warning: string;
        error: string;
    };
}

export interface Theme {
    name: string;
    colors: ThemeColors;
    borderStyle: 'single' | 'double' | 'classic';
}

// Cyberpunk theme - cyan/magenta on deep black
export const cyberpunkTheme: Theme = {
    name: 'Cyberpunk',
    borderStyle: 'single',
    colors: {
        bg: {
            base: '#000000',
            panel: '#0a0a0a',
            surface: '#111111',
            elevated: '#1a1a1a',
        },
        fg: {
            primary: '#ffffff',
            secondary: '#888888',
            muted: '#555555',
        },
        accent: {
            primary: '#00ffff',
            secondary: '#ff00ff',
        },
        border: {
            active: '#00ffff',
            inactive: '#333333',
        },
        status: {
            success: '#00ff88',
            warning: '#ffaa00',
            error: '#ff4444',
        },
    },
};

// Monochrome theme - white/gray on black
export const monochromeTheme: Theme = {
    name: 'Mono',
    borderStyle: 'single',
    colors: {
        bg: {
            base: '#000000',
            panel: '#080808',
            surface: '#101010',
            elevated: '#181818',
        },
        fg: {
            primary: '#ffffff',
            secondary: '#aaaaaa',
            muted: '#666666',
        },
        accent: {
            primary: '#ffffff',
            secondary: '#888888',
        },
        border: {
            active: '#ffffff',
            inactive: '#333333',
        },
        status: {
            success: '#ffffff',
            warning: '#aaaaaa',
            error: '#888888',
        },
    },
};

// Matrix theme - green on black
export const matrixTheme: Theme = {
    name: 'Matrix',
    borderStyle: 'single',
    colors: {
        bg: {
            base: '#000000',
            panel: '#001100',
            surface: '#002200',
            elevated: '#003300',
        },
        fg: {
            primary: '#00ff00',
            secondary: '#00aa00',
            muted: '#006600',
        },
        accent: {
            primary: '#00ff00',
            secondary: '#88ff88',
        },
        border: {
            active: '#00ff00',
            inactive: '#004400',
        },
        status: {
            success: '#00ff00',
            warning: '#88ff00',
            error: '#ff0000',
        },
    },
};

// Amber theme - warm amber/orange on dark brown
export const amberTheme: Theme = {
    name: 'Amber',
    borderStyle: 'double',
    colors: {
        bg: {
            base: '#0a0500',
            panel: '#0f0800',
            surface: '#140a00',
            elevated: '#1a0d00',
        },
        fg: {
            primary: '#ffaa00',
            secondary: '#aa7700',
            muted: '#664400',
        },
        accent: {
            primary: '#ffaa00',
            secondary: '#ff6600',
        },
        border: {
            active: '#ffaa00',
            inactive: '#442200',
        },
        status: {
            success: '#88ff00',
            warning: '#ffaa00',
            error: '#ff4400',
        },
    },
};

export const themes: Theme[] = [
    cyberpunkTheme,
    monochromeTheme,
    matrixTheme,
    amberTheme,
];

export const getThemeByName = (name: string): Theme => {
    return themes.find((t) => t.name === name) || cyberpunkTheme;
};
