import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../core/SettingsContext.js';
import fs from 'fs';
import path from 'path';

interface MenuBarProps {
    title?: string;
}

// Read version from package.json
const getVersion = () => {
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        return `v${packageJson.version}`;
    } catch {
        return 'v1.0.0';
    }
};

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
            <Text color={theme.colors.fg.muted}>{getVersion()}</Text>
        </Box>
    );
};
