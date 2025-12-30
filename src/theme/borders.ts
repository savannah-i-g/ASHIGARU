/**
 * Box-drawing character sets for different border styles
 */
export const borderStyles = {
    single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴',
        cross: '┼',
    },

    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║',
        leftT: '╠',
        rightT: '╣',
        topT: '╦',
        bottomT: '╩',
        cross: '╬',
    },

    rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴',
        cross: '┼',
    },

    heavy: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃',
        leftT: '┣',
        rightT: '┫',
        topT: '┳',
        bottomT: '┻',
        cross: '╋',
    },

    ascii: {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        leftT: '+',
        rightT: '+',
        topT: '+',
        bottomT: '+',
        cross: '+',
    },
} as const;

export type BorderStyle = keyof typeof borderStyles;
export type BorderChars = (typeof borderStyles)[BorderStyle];
