# ASHIGARU API System

The unified API layer provides programs with easy access to system features including storage, notifications, windows, sounds, and AI.

## Table of Contents

- [Overview](#overview)
- [Getting API Access](#getting-api-access)
- [System API](#system-api)
- [Storage API](#storage-api)
- [Notifications API](#notifications-api)
- [Windows API](#windows-api)
- [Sound API](#sound-api)
- [AI API](#ai-api)
- [IPC Access](#ipc-access)
- [Best Practices](#best-practices)
- [Complete Example](#complete-example)

---

## Overview

The API system provides a single `api` prop to programs with access to:

| Module | Purpose |
|--------|---------|
| `api.system` | System information and events |
| `api.storage` | Persistent key-value storage per program |
| `api.notifications` | Toast notifications via IPC |
| `api.windows` | Window management operations |
| `api.sound` | Audio feedback (system and custom sounds) |
| `api.ai` | AI/LLM capabilities |
| `api.ipc` | Raw IPC access for advanced use cases |

---

## Getting API Access

Every program receives the `api` prop from the window manager:

```javascript
const MyProgram = ({ api, windowId, isFocused }) => {
    // api: ProgramAPI - All API modules
    // windowId: string - This window's unique ID

    if (!api) {
        return <Text>API not available</Text>;
    }

    // Use API modules...
    const stats = api.system.getStats();
    await api.storage.set('key', 'value');
    api.notifications.success('Done!');
};
```

---

## System API

Access system information and emit/receive events.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getStats()` | SystemStats | Get comprehensive system statistics |
| `getHostname()` | string | Get system hostname |
| `getPlatform()` | string | Get OS platform (`linux`, `darwin`, `win32`) |
| `getArch()` | string | Get CPU architecture |
| `getUptime()` | number | Get system uptime in seconds |
| `onEvent(event, handler)` | () => void | Subscribe to a system event |
| `emit(event, data)` | void | Emit a system event |

### SystemStats Object

```javascript
const stats = api.system.getStats();
// {
//   hostname: 'my-machine',
//   platform: 'linux',
//   arch: 'x64',
//   release: '5.15.0-generic',
//   uptime: 86400,
//   totalMemory: 16000000000,
//   freeMemory: 8000000000,
//   usedMemory: 8000000000,
//   memoryPercent: 50,
//   cpuCount: 8,
//   cpuModel: 'Intel Core i7',
//   loadAverage: [1.5, 1.2, 0.9]
// }
```

### System Events

```javascript
// Subscribe to custom events
const unsubscribe = api.system.onEvent('custom-event', (data) => {
    console.log('Event data:', data);
});

// Emit events for other programs
api.system.emit('status-changed', { newStatus: 'active' });

// Cleanup
unsubscribe();
```

Events are broadcast on channels prefixed with `system.` via IPC.

---

## Storage API

Persistent key-value storage isolated per program. Data is stored in `~/.ashigaru-data/{programId}/`.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get<T>(key)` | Promise<T \| null> | Get a stored value |
| `set<T>(key, value)` | Promise<void> | Store a value |
| `delete(key)` | Promise<void> | Delete a value |
| `list()` | Promise<string[]> | List all keys |
| `clear()` | Promise<void> | Clear all program data |
| `has(key)` | Promise<boolean> | Check if key exists |

### Basic Usage

```javascript
// Store data
await api.storage.set('user-preferences', {
    theme: 'dark',
    fontSize: 14
});

// Retrieve data
const prefs = await api.storage.get('user-preferences');
// { theme: 'dark', fontSize: 14 }

// Check existence
const exists = await api.storage.has('user-preferences');
// true

// List all keys
const keys = await api.storage.list();
// ['user-preferences', 'recent-files', ...]

// Delete specific key
await api.storage.delete('recent-files');

// Clear all data
await api.storage.clear();
```

### Storage Location

```
~/.ashigaru-data/
├── my-program/
│   ├── user-preferences.json
│   ├── recent-files.json
│   └── settings.json
└── another-program/
    └── data.json
```

Each key is stored as a separate JSON file containing:

```json
{
    "key": "user-preferences",
    "value": { "theme": "dark", "fontSize": 14 },
    "updatedAt": "2025-12-31T15:00:00.000Z"
}
```

---

## Notifications API

Display toast notifications to the user. Notifications are broadcast via IPC, allowing custom notification handlers.

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `show(message, options?)` | string, NotificationOptions | Show custom notification |
| `success(message, title?)` | string, string? | Show success notification |
| `error(message, title?)` | string, string? | Show error notification |
| `warning(message, title?)` | string, string? | Show warning notification |
| `info(message, title?)` | string, string? | Show info notification |

### NotificationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | `'info'` | `'info'`, `'success'`, `'warning'`, `'error'` |
| `duration` | number | `3000` | Duration in ms (0 = persistent) |
| `title` | string | - | Optional title |

### Usage

```javascript
// Simple notifications
api.notifications.success('File saved successfully');
api.notifications.error('Failed to connect to server');
api.notifications.warning('Disk space is running low');
api.notifications.info('Update available');

// Custom notification
api.notifications.show('Custom message', {
    type: 'success',
    title: 'My App',
    duration: 5000
});
```

### Listening for Notifications

Programs can listen for and display notifications:

```javascript
api.ipc.subscribe('system.notification', (message) => {
    const notification = message.payload;
    // notification: {
    //   id: 'notif-1-1704067200000',
    //   message: 'File saved',
    //   type: 'success',
    //   title: 'My App',
    //   duration: 3000,
    //   timestamp: 1704067200000,
    //   source: 'my-program'
    // }
});
```

---

## Windows API

Manage windows and communicate with other window instances.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCurrentId()` | string | Get current window ID |
| `openProgram(programId)` | Promise<string \| null> | Open a program, returns window ID |
| `close()` | void | Close the current window |
| `minimize()` | void | Minimize the current window |
| `focus()` | void | Request focus for current window |
| `list()` | WindowInfo[] | Get list of all open windows |
| `sendMessage(windowId, type, payload)` | void | Send direct message to another window |
| `onMessage(handler)` | () => void | Listen for direct messages |

### WindowInfo Object

```javascript
const windows = api.windows.list();
// [
//   {
//     id: 'window-1',
//     programId: 'settings',
//     programName: 'Settings',
//     isFocused: false,
//     isMinimized: false
//   },
//   {
//     id: 'window-2',
//     programId: 'my-program',
//     programName: 'My Program',
//     isFocused: true,
//     isMinimized: false
//   }
// ]
```

### Window Operations

```javascript
// Get current window ID
const myId = api.windows.getCurrentId();

// List all windows
const windows = api.windows.list();
console.log(`${windows.length} windows open`);

// Close current window
api.windows.close();

// Minimize current window
api.windows.minimize();
```

### Direct Messaging

```javascript
// Send message to specific window
api.windows.sendMessage('window-3', 'command', {
    action: 'refresh',
    data: { force: true }
});

// Listen for incoming messages
const unsubscribe = api.windows.onMessage((message) => {
    console.log('From:', message.sender);
    console.log('Type:', message.type);
    console.log('Data:', message.payload);

    if (message.type === 'command') {
        // Handle command...
    }
});

// Cleanup
unsubscribe();
```

---

## Sound API

Play audio feedback with support for both system sounds and custom program sounds.

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `play(type)` | SoundType | Play a system sound |
| `click()` | - | Play click sound |
| `hover()` | - | Play hover/focus sound |
| `success()` | - | Play success sound |
| `error()` | - | Play error sound |
| `notify()` | - | Play notification sound |
| `playFile(absolutePath)` | string | Play sound from absolute path |
| `playCustom(filename)` | string | Play sound from program's /sounds directory |
| `isEnabled()` | - | Check if sounds are enabled |

### System Sounds

```javascript
// Play predefined sounds
api.sound.click();
api.sound.success();
api.sound.error();
api.sound.hover();
api.sound.notify();

// Or by type
api.sound.play('open');
api.sound.play('close');
```

### Custom Program Sounds

Programs can bundle their own sounds in a `/sounds` subdirectory:

```
programs/
└── my-program/
    ├── manifest.json
    ├── index.js
    └── sounds/
        ├── alert.mp3
        ├── beep.wav
        └── complete.ogg
```

Play custom sounds:

```javascript
// Play from program's sounds directory
api.sound.playCustom('alert.mp3');
api.sound.playCustom('beep.wav');
api.sound.playCustom('complete.ogg');

// Play from any absolute path
api.sound.playFile('/home/user/sounds/custom.mp3');
```

### Sound Settings

Sounds respect the user's settings:

```javascript
// Check if sounds are enabled
if (api.sound.isEnabled()) {
    api.sound.success();
}

// Sounds will automatically not play if disabled in settings
// No need to check manually - methods handle this internally
```

---

## AI API

Access AI/LLM capabilities if configured.

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `ask(prompt)` | string | Promise<string> | Send prompt, get response |
| `stream(prompt, onChunk)` | string, function | Promise<void> | Stream response |
| `setSystemPrompt(prompt)` | string | void | Set context prompt |
| `getSystemPrompt()` | - | string | Get current system prompt |
| `isAvailable()` | - | boolean | Check if AI is configured |
| `getProvider()` | - | string | Get provider name |
| `clearHistory()` | - | void | Clear conversation history |

### Checking Availability

```javascript
if (!api.ai.isAvailable()) {
    console.log('AI not configured - check API key');
    return;
}

console.log('Using provider:', api.ai.getProvider());
```

### Simple Request

```javascript
try {
    const answer = await api.ai.ask('What is the capital of France?');
    console.log(answer); // 'The capital of France is Paris.'
} catch (error) {
    console.error('AI request failed:', error.message);
}
```

### Streaming Response

```javascript
await api.ai.stream('Tell me a story', (chunk) => {
    process.stdout.write(chunk);
});
```

### Context and History

```javascript
// Set system prompt for context
api.ai.setSystemPrompt('You are a helpful coding assistant.');

// Clear conversation history
api.ai.clearHistory();
```

---

## IPC Access

The `api.ipc` provides full access to the IPC system for advanced use cases.

See [IPC Documentation](./IPC.md) for complete details.

```javascript
// Raw IPC is available at api.ipc
api.ipc.publish('channel', 'type', payload);
api.ipc.subscribe('channel', handler);
api.ipc.registerService('name', methods);
await api.ipc.callService('name', 'method', ...args);
```

---

## Best Practices

### 1. Check API Availability

```javascript
if (!api) {
    return <Text>API not available</Text>;
}
```

### 2. Handle Async Operations

```javascript
const loadData = async () => {
    try {
        const data = await api.storage.get('key');
        if (data) setData(data);
    } catch (error) {
        api.notifications.error('Failed to load data');
    }
};
```

### 3. Clean Up Subscriptions

```javascript
useEffect(() => {
    const unsub = api.windows.onMessage(handler);
    return () => unsub();
}, []);
```

### 4. Use Appropriate Sound Timing

```javascript
// Play sounds on meaningful actions, not every interaction
const handleSave = async () => {
    try {
        await save();
        api.sound.success();
        api.notifications.success('Saved');
    } catch {
        api.sound.error();
        api.notifications.error('Save failed');
    }
};
```

### 5. Store Only Necessary Data

```javascript
// Good: Store essential data
await api.storage.set('preferences', { theme: 'dark' });

// Bad: Store large or sensitive data
await api.storage.set('cache', hugeArray); // Too large
await api.storage.set('token', apiKey);    // Sensitive
```

---

## Complete Example

A program demonstrating multiple API modules:

```javascript
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

const h = React.createElement;

const APIDemo = ({ api, windowId, isFocused, onClose }) => {
    const [stats, setStats] = useState(null);
    const [counter, setCounter] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load system stats and stored data
    useEffect(() => {
        if (!api) return;

        // Get system info
        setStats(api.system.getStats());

        // Load persisted counter
        const loadCounter = async () => {
            const saved = await api.storage.get('counter');
            if (saved !== null) setCounter(saved);
            setLoading(false);
        };
        loadCounter();

        // Refresh stats periodically
        const interval = setInterval(() => {
            setStats(api.system.getStats());
        }, 2000);

        return () => clearInterval(interval);
    }, [api]);

    // Save counter when it changes
    useEffect(() => {
        if (api && !loading) {
            api.storage.set('counter', counter);
        }
    }, [counter, loading]);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isFocused || !api) return;

        if (key.escape) {
            api.storage.clear(); // Clear on close
            onClose();
        }
        if (input === '+') {
            setCounter(c => c + 1);
            api.sound.click();
        }
        if (input === '-') {
            setCounter(c => Math.max(0, c - 1));
            api.sound.click();
        }
        if (input === 'n') {
            api.notifications.success(`Counter is ${counter}`, 'API Demo');
        }
    }, { isActive: isFocused });

    if (!api) {
        return h(Text, { color: 'red' }, 'API not available');
    }

    return h(Box, { flexDirection: 'column', borderStyle: 'single' },
        h(Text, { bold: true, color: '#00ffff' }, 'API Demo'),
        h(Text, null, ''),
        h(Text, null, `Hostname: ${stats?.hostname || 'Loading...'}`),
        h(Text, null, `Memory: ${stats?.memoryPercent || 0}%`),
        h(Text, null, `Counter: ${counter}`),
        h(Text, null, ''),
        h(Text, { dimColor: true }, '+/- change counter, N notify, ESC close')
    );
};

export default APIDemo;
```

---

## TypeScript Types

For TypeScript users, import types from the API module:

```typescript
import type {
    ProgramAPI,
    SystemAPI,
    SystemStats,
    StorageAPI,
    NotificationsAPI,
    NotificationOptions,
    NotificationType,
    WindowsAPI,
    WindowInfo,
    SoundAPI,
    SoundType,
    AIAPI
} from '../core/api/types';
```

See [src/core/api/types.ts](file:///home/administrator/TUI_Test/src/core/api/types.ts) for complete type definitions.
