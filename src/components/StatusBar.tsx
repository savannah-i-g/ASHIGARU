import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '@inkjs/ui';
import { useSettings } from '../core/SettingsContext.js';

interface StatusBarProps {
    programName?: string;
    status?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    programName = 'ASHIGARU',
    status,
}) => {
    const { theme } = useSettings();

    return (
        <Box paddingX={1} justifyContent="space-between">
            <Box>
                <Text color={theme.colors.accent.primary}>[*] </Text>
                <Text color={theme.colors.fg.primary}>{programName}</Text>
                {status && (
                    <Text color={theme.colors.fg.muted}> | {status}</Text>
                )}
            </Box>
            <Box gap={1}>
                <Badge color="cyan">^L</Badge>
                <Text color={theme.colors.fg.muted}>menu</Text>
                <Badge color="cyan">`</Badge>
                <Text color={theme.colors.fg.muted}>windows</Text>
                <Badge color="yellow">M</Badge>
                <Text color={theme.colors.fg.muted}>min</Text>
                <Badge color="red">X</Badge>
                <Text color={theme.colors.fg.muted}>close</Text>
                <Badge color="red">Q</Badge>
                <Text color={theme.colors.fg.muted}>quit</Text>
            </Box>
        </Box>
    );
};
