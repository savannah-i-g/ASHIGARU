import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../core/SettingsContext.js';

interface MenuBarProps {
    title?: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({
    title = ' ASHIGARU ',
}) => {
    const { theme } = useSettings();

    return (
        <Box columnGap={0} paddingX={1} justifyContent="space-between">
            <Box>
                <Text color={theme.colors.accent.primary} bold>{"◢◤◢◤◢"}</Text>
                <Text backgroundColor={theme.colors.fg.primary} color="#000000" bold>{title}</Text>
                <Text color={theme.colors.accent.primary} bold>{"◤◢◤◢◤"}</Text>
            </Box>
            <Text color={theme.colors.fg.muted}>v1.0</Text>
        </Box>
    );
};
