#!/usr/bin/env node
import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './core/App.js';

// Clear the terminal and render the app with full screen
console.clear();

const { waitUntilExit } = render(<App />, {
    // Use full terminal height
    exitOnCtrlC: true,
});

waitUntilExit().then(() => {
    console.clear();
    console.log('Goodbye from ASHIGARU');
});
