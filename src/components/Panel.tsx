import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme/colors.js';

interface PanelProps {
    title?: string;
    focused?: boolean;
    width?: number | string;
    height?: number | string;
    children?: React.ReactNode;
    padding?: number;
}

/**
 * Minimal panel using Ink's built-in border support
 */
export const Panel: React.FC<PanelProps> = ({
    title,
    focused = false,
    width,
    height,
    children,
    padding = 1,
}) => {
    const borderColor = focused ? colors.border.active : colors.border.inactive;

    return (
        <Box
            flexDirection="column"
            width={width}
            height={height}
            borderStyle="single"
            borderColor={borderColor}
            paddingX={padding}
            paddingY={padding > 0 ? 1 : 0}
        >
            {title && (
                <Box marginBottom={1}>
                    <Text color={focused ? colors.accent.primary : colors.fg.secondary} bold>
                        {title}
                    </Text>
                </Box>
            )}
            {children}
        </Box>
    );
};
