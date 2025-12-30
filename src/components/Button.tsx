import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme/colors.js';

interface ButtonProps {
    label: string;
    focused?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
    label,
    focused = false,
    disabled = false,
    variant = 'primary',
}) => {
    const getColors = () => {
        if (disabled) {
            return { fg: colors.fg.muted, border: colors.border.inactive };
        }
        if (focused) {
            switch (variant) {
                case 'danger':
                    return { fg: colors.status.error, border: colors.status.error };
                case 'secondary':
                    return { fg: colors.fg.primary, border: colors.accent.secondary };
                default:
                    return { fg: colors.bg.primary, border: colors.accent.primary };
            }
        }
        return { fg: colors.fg.primary, border: colors.border.inactive };
    };

    const style = getColors();

    return (
        <Box>
            <Text color={style.border}>[</Text>
            <Text color={style.fg} bold={focused}>{` ${label} `}</Text>
            <Text color={style.border}>]</Text>
        </Box>
    );
};
