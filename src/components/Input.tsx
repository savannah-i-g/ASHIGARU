import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../theme/colors.js';

interface InputProps {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    focus?: boolean;
    label?: string;
    width?: number;
}

export const Input: React.FC<InputProps> = ({
    placeholder = '',
    value,
    onChange,
    onSubmit,
    focus = true,
    label,
    width = 30,
}) => {
    const [cursorVisible, setCursorVisible] = useState(true);

    React.useEffect(() => {
        if (!focus) return;
        const interval = setInterval(() => setCursorVisible((v) => !v), 500);
        return () => clearInterval(interval);
    }, [focus]);

    useInput(
        (input, key) => {
            if (!focus) return;
            if (key.return && onSubmit) {
                onSubmit(value);
                return;
            }
            if (key.backspace || key.delete) {
                onChange(value.slice(0, -1));
                return;
            }
            if (input && !key.ctrl && !key.meta) {
                onChange(value + input);
            }
        },
        { isActive: focus }
    );

    const displayValue = value || placeholder;
    const isPlaceholder = !value && placeholder;
    const cursor = focus && cursorVisible ? '█' : ' ';

    return (
        <Box>
            {label && <Text color={colors.fg.secondary}>{label}: </Text>}
            <Text color={colors.border.active}>[</Text>
            <Box width={width}>
                <Text color={isPlaceholder ? colors.fg.muted : colors.fg.primary}>
                    {displayValue}
                </Text>
                <Text color={colors.accent.primary}>{cursor}</Text>
            </Box>
            <Text color={colors.border.active}>]</Text>
        </Box>
    );
};
