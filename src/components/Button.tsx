import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme/colors.js';
import { playClick, playHover } from '../utils/sound.js';
import { useSettings } from '../core/SettingsContext.js';

interface ButtonProps {
    label: string;
    focused?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    onPress?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    focused = false,
    disabled = false,
    variant = 'primary',
    onPress,
}) => {
    const { settings } = useSettings();
    const prevFocused = useRef(focused);

    // Play hover sound when focus changes to this button
    useEffect(() => {
        if (focused && !prevFocused.current && !disabled) {
            playHover(settings.sounds);
        }
        prevFocused.current = focused;
    }, [focused, disabled, settings.sounds]);

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

    // Handle press with sound
    const handlePress = () => {
        if (disabled) return;
        playClick(settings.sounds);
        onPress?.();
    };

    return (
        <Box>
            <Text color={style.border}>[</Text>
            <Text color={style.fg} bold={focused}>{` ${label} `}</Text>
            <Text color={style.border}>]</Text>
        </Box>
    );
};
