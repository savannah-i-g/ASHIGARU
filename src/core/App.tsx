import React, { useState } from 'react';
import { Box, useInput } from 'ink';
import { WindowManagerProvider } from './WindowManager.js';
import { SettingsProvider } from './SettingsContext.js';
import { IPCContextProvider } from './IPCContext.js';
import { Shell } from './Shell.js';
import { Intro } from '../components/Intro.js';

export const App: React.FC = () => {
    const [showIntro, setShowIntro] = useState(true);

    // Allow skipping intro with any key
    useInput(() => {
        if (showIntro) {
            setShowIntro(false);
        }
    });

    if (showIntro) {
        return (
            <SettingsProvider>
                <Box flexDirection="column" width="100%" height="100%">
                    <Intro onComplete={() => setShowIntro(false)} />
                </Box>
            </SettingsProvider>
        );
    }

    return (
        <SettingsProvider>
            <IPCContextProvider>
                <WindowManagerProvider>
                    <Box flexDirection="column" width="100%" height="100%">
                        <Shell />
                    </Box>
                </WindowManagerProvider>
            </IPCContextProvider>
        </SettingsProvider>
    );
};
