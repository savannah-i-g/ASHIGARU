# ASHIGARU Program Development Guide

A comprehensive guide for creating, packaging, and distributing programs for the ASHIGARU terminal interface.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Required Files](#required-files)
- [Manifest Format](#manifest-format)
- [Entry File Requirements](#entry-file-requirements)
- [Complete API Reference](#complete-api-reference)
- [IPC System](#ipc-system)
- [Unified API System](#unified-api-system)
- [State Persistence](#state-persistence)
- [Sound System](#sound-system)
- [Available Ink Components](#available-ink-components)
- [System APIs and Utilities](#system-apis-and-utilities)
- [Best Practices](#best-practices)
- [Packaging for Distribution](#packaging-for-distribution)
- [Example Program](#example-program)

---

## Overview

ASHIGARU programs are self-contained React/Ink components that run within the terminal interface. Each program must include:

1. A `manifest.json` file with metadata
2. An entry file (typically `index.js`) exporting a React component

Programs can be installed via the built-in **Package Manager** from GitHub releases or direct URLs.

---

## Directory Structure

Programs should be organized in a nested folder structure that determines their location in the launcher:

```
your-program-package/
├── category/              # e.g., "games", "utility", "system"
│   └── program-name/      # Your program folder
│       ├── manifest.json  # Required: Program metadata
│       ├── index.js       # Required: Main entry file
│       └── lib/           # Optional: Helper modules
│           ├── utils.js
│           └── ...
```

### Important Notes

- The **folder structure is preserved** when installing via Package Manager
- If your archive contains `games/pong/`, it installs to `programs/games/pong/`
- For flat packages (no category folder), the `category` field in `manifest.json` is used

---

## Required Files

### 1. manifest.json

Every program must have a `manifest.json` in its root folder.

### 2. Entry File

The file specified in the manifest's `entry` field. Must export a default React component.

---

## Manifest Format

```json
{
  "id": "my-program",
  "name": "My Program",
  "version": "1.0.0",
  "description": "A brief description of what your program does",
  "author": "Your Name",
  "icon": "⚙",
  "category": "utility",
  "entry": "index.js"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, alphanumeric, hyphens only) |
| `name` | string | Display name shown in the launcher |
| `version` | string | Semantic version (e.g., `1.0.0`) |
| `description` | string | Brief description shown in the launcher |
| `entry` | string | Path to the main entry file |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Program author/creator |
| `icon` | string | Single character/emoji for display |
| `category` | string | Fallback category if not in nested folder |

---

## Entry File Requirements

Your entry file must export a default React component with the following props:

```javascript
import React from 'react';
import { Box, Text, useInput } from 'ink';

const Program = ({ isFocused, onClose }) => {
    // isFocused: boolean - Whether this window is currently focused
    // onClose: function - Call this to close the program window

    useInput((input, key) => {
        if (!isFocused) return;
        
        if (key.escape) {
            onClose();
            return;
        }
        
        // Handle other inputs...
    }, { isActive: isFocused });

    return (
        <Box flexDirection="column" borderStyle="single" flexGrow={1}>
            <Text>Hello from My Program!</Text>
        </Box>
    );
};

export default Program;
```

### Props Received

Your program receives all props defined in the `ProgramProps` interface. The most commonly used props are:

| Prop | Type | Description |
|------|------|-------------|
| `isFocused` | boolean | `true` when this window has focus |
| `onClose` | function | Call to close the program window |
| `onFocus` | function | Call to request focus for this window |
| `manifest` | object | The program's manifest data |
| `windowId` | string | Unique ID for this window instance |
| `ipc` | IPCContextType | Inter-program communication (see [IPC System](#ipc-system)) |
| `api` | ProgramAPI | Unified API for system features (see [Unified API System](#unified-api-system)) |

For the complete API including settings, theming, and advanced features, see [Complete API Reference](#complete-api-reference).

### Using React.createElement

If you prefer not to use JSX, use `React.createElement`:

```javascript
const h = React.createElement;

const Program = ({ isFocused, onClose }) => {
    return h(Box, { flexDirection: 'column' },
        h(Text, null, 'Hello World')
    );
};

export default Program;
```

---

## Complete API Reference

This section documents all props passed to your program component via the `ProgramProps` interface.

### Core Props

These props are always provided to every program:

#### `isFocused: boolean`
- Indicates whether this program window currently has focus
- Only focused windows should process keyboard input
- Use this to conditionally enable `useInput` hooks

#### `onClose: () => void`
- Callback to close the program window
- Typically called when the user presses ESC or a close button
- Cleans up the window and removes it from the window manager

#### `onFocus: () => void`
- Callback to request focus for this window
- Call this when the user interacts with your program (e.g., clicks, types)
- Automatically handled by the window manager for focus reassignment

#### `manifest: ProgramManifest`
- The parsed manifest.json data for your program
- Contains: `id`, `name`, `version`, `description`, `author`, `icon`, `category`, `entry`
- Useful for displaying program metadata in the UI

---

### Input Control Props (Optional)

These props enable programs to claim exclusive keyboard control:

#### `lockInput?: () => void`
- Locks global keyboard input, giving your program exclusive control
- Use when your program needs uninterrupted text input (e.g., text editor, terminal)
- Prevents global shortcuts (Ctrl+L, Tab, etc.) from interfering

#### `unlockInput?: () => void`
- Releases the keyboard input lock
- Should be called when your program no longer needs exclusive control
- Always unlock on cleanup to prevent stuck input states

**Example Usage:**
```javascript
const Program = ({ isFocused, lockInput, unlockInput, onClose }) => {
    const [inputLocked, setInputLocked] = React.useState(false);

    React.useEffect(() => {
        if (isFocused && !inputLocked) {
            lockInput?.();
            setInputLocked(true);
        }
        return () => {
            if (inputLocked) {
                unlockInput?.();
            }
        };
    }, [isFocused]);

    // ... rest of program
};
```

---

### Settings and Theming Props (Optional)

These props enable programs to access and modify user settings:

#### `settings?: { theme, animations, sounds, wallpaper, wallpaperColor }`
- Current user settings from `~/.cypher-tui-settings.json`
- **Properties:**
  - `theme: string` - Active theme name (e.g., 'Cyberpunk', 'Mono', 'Matrix', 'Amber')
  - `animations: boolean` - Whether animations are enabled
  - `sounds: boolean` - Whether sound effects are enabled
  - `wallpaper: string` - Active wallpaper filename
  - `wallpaperColor: string` - Wallpaper tint color (hex format)

#### `setTheme?: (themeName: string) => void`
- Callback to change the active theme
- Available themes: `'Cyberpunk'`, `'Mono'`, `'Matrix'`, `'Amber'`
- Updates persist to settings file

#### `setWallpaper?: (wallpaperName: string) => void`
- Callback to change the desktop wallpaper
- Pass wallpaper filename (e.g., `'CYPHER.txt'`)

#### `updateSettings?: (updates: Record<string, unknown>) => void`
- Generic callback to update any settings
- Pass an object with settings to update (e.g., `{ animations: false, sounds: true }`)

#### `availableWallpapers?: string[]`
- Array of available wallpaper filenames
- Useful for displaying wallpaper selection UI

#### `getWallpaperContent?: (name: string) => string[]`
- Callback to retrieve wallpaper content as an array of lines
- Returns ASCII art content for preview or display

**Example: Using Theme Settings**
```javascript
const Program = ({ settings, setTheme, onClose }) => {
    const currentTheme = settings?.theme || 'Cyberpunk';

    const themeColors = {
        Cyberpunk: { accent: '#00ffff', bg: '#000000' },
        Mono: { accent: '#ffffff', bg: '#000000' },
        Matrix: { accent: '#00ff00', bg: '#001a00' },
        Amber: { accent: '#ffaa00', bg: '#0a0500' },
    };

    const colors = themeColors[currentTheme];

    return (
        <Box borderStyle="single" borderColor={colors.accent}>
            <Text color={colors.accent}>Current theme: {currentTheme}</Text>
        </Box>
    );
};
```

---

## State Persistence

ASHIGARU provides a built-in state persistence system that allows programs to save and restore their state across sessions. This is essential for programs like document editors, spreadsheets, or any application where losing data due to accidental minimization or closure would be problematic.

### How State Persistence Works

**Automatic Behavior:**

1. **On Window Open**: If saved state exists for a program, it's automatically loaded and passed as `savedState` prop
2. **On Minimize**: Current state is saved to `~/.ashigaru-state/{program-id}.json`
3. **On Proper Close** (ESC/X button): Saved state is cleared from disk
4. **During Runtime**: Programs can call `saveState()` anytime to update saved state

**Key Principle:** Minimizing preserves state (user might return), but properly closing clears it (user is done).

### State Persistence Props

Your program receives three optional props for state management:

#### `savedState?: unknown`
- Previously saved state from a previous session (if any exists)
- Check for this on component mount to restore data
- Will be `undefined` if no saved state exists

#### `saveState?: (state: unknown) => void`
- Function to save current program state
- Call this whenever important state changes
- State is kept in memory and saved to disk on minimize

#### `clearState?: () => void`
- Function to explicitly clear saved state
- Call this when user properly closes the program
- Automatically called by WindowManager on close, but you can call it manually

---

### Basic Implementation Pattern

Here's the recommended pattern for implementing state persistence:

```javascript
const MyProgram = ({ savedState, saveState, clearState, onClose, isFocused }) => {
    const [data, setData] = React.useState('');
    const [counter, setCounter] = React.useState(0);

    // 1. RESTORE: Load saved state on mount
    React.useEffect(() => {
        if (savedState) {
            if (savedState.data) setData(savedState.data);
            if (savedState.counter !== undefined) setCounter(savedState.counter);
        }
    }, []); // Empty deps - only run on mount

    // 2. SAVE: Save state whenever it changes
    React.useEffect(() => {
        if (saveState) {
            saveState({
                data,
                counter,
                // Include any state you want to persist
            });
        }
    }, [data, counter]); // Run when these values change

    // 3. CLEAR: Clear state on proper close
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            clearState?.(); // Clear saved state
            onClose();      // Close the program
        }
    }, { isActive: isFocused });

    return (
        // Your component UI
    );
};
```

---

### Complete Example: Suite Docs

Here's how Suite Docs implements state persistence:

```javascript
const SuiteDocs = ({
    isFocused,
    onClose,
    savedState,
    saveState,
    clearState
}) => {
    // Program state
    const [lines, setLines] = React.useState(['']);
    const [currentLine, setCurrentLine] = React.useState(0);
    const [currentFilePath, setCurrentFilePath] = React.useState('');
    const [modified, setModified] = React.useState(false);

    // 1. RESTORE: Load saved state on mount
    React.useEffect(() => {
        if (savedState) {
            if (savedState.lines) {
                setLines(savedState.lines);
            }
            if (savedState.currentLine !== undefined) {
                setCurrentLine(savedState.currentLine);
            }
            if (savedState.currentFilePath) {
                setCurrentFilePath(savedState.currentFilePath);
            }
            if (savedState.modified !== undefined) {
                setModified(savedState.modified);
            }
            // Optional: Notify user
            setMessage('Document restored from saved state');
        }
    }, []);

    // 2. SAVE: Save state when document changes
    React.useEffect(() => {
        if (saveState) {
            saveState({
                lines,
                currentLine,
                currentFilePath,
                modified
            });
        }
    }, [lines, currentLine, currentFilePath, modified]);

    // 3. CLEAR: Clear state on proper close
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (mode === 'edit') {
                // Clear saved state before closing
                if (clearState) {
                    clearState();
                }
                onClose();
            } else {
                // Just exit current mode, don't close
                setMode('edit');
            }
        }
    }, { isActive: isFocused });

    // Rest of component...
};
```

---

### What to Save vs. What Not to Save

**DO Save:**
- ✅ Document content, cursor positions
- ✅ Form inputs, field values
- ✅ Current file paths
- ✅ User selections, active items
- ✅ Scroll positions
- ✅ Modified/dirty flags
- ✅ Application-specific data

**DON'T Save:**
- ❌ Temporary UI states (loading spinners, tooltips)
- ❌ Error messages or status messages
- ❌ Passwords or sensitive credentials
- ❌ WebSocket connections or network states
- ❌ Transient animation states
- ❌ Modal/dialog open states

**Example of Good State Object:**
```javascript
saveState({
    // Essential data
    content: documentContent,
    cursorPosition: { line: 5, col: 10 },
    filePath: '/home/user/document.md',
    modified: true,

    // User preferences for this document
    fontSize: 14,
    theme: 'dark',

    // Navigation state
    scrollOffset: 100,
    selectedItemId: 'item-42'
});
```

---

### Advanced Patterns

#### Pattern 1: Conditional State Saving

Only save state when there's meaningful data:

```javascript
React.useEffect(() => {
    // Only save if there's actual content
    if (saveState && (lines.length > 1 || lines[0] !== '')) {
        saveState({ lines, currentLine });
    }
}, [lines, currentLine]);
```

#### Pattern 2: Debounced State Saving

For performance, debounce frequent updates:

```javascript
React.useEffect(() => {
    const timer = setTimeout(() => {
        saveState?.({ content, position });
    }, 500); // Wait 500ms after last change

    return () => clearTimeout(timer);
}, [content, position]);
```

#### Pattern 3: Validation Before Restore

Validate saved state before applying:

```javascript
React.useEffect(() => {
    if (savedState) {
        // Validate structure
        if (Array.isArray(savedState.lines)) {
            setLines(savedState.lines);
        }

        // Validate ranges
        const line = savedState.currentLine;
        if (typeof line === 'number' && line >= 0) {
            setCurrentLine(Math.min(line, savedState.lines.length - 1));
        }
    }
}, []);
```

#### Pattern 4: Migration for State Versions

Handle old saved state formats:

```javascript
React.useEffect(() => {
    if (savedState) {
        // Check version
        const version = savedState.version || 1;

        if (version === 1) {
            // Old format: single string
            setContent(savedState.content || '');
        } else if (version === 2) {
            // New format: array of lines
            setLines(savedState.lines || ['']);
        }
    }
}, []);

// When saving, include version
React.useEffect(() => {
    saveState?.({
        version: 2,
        lines,
        currentLine
    });
}, [lines, currentLine]);
```

---

### State Storage Details

**File Location:** `~/.ashigaru-state/{program-id}.json`

**File Format:**
```json
{
  "programId": "suite-docs",
  "timestamp": "2025-12-30T16:30:00.000Z",
  "state": {
    "lines": ["Line 1", "Line 2", "Line 3"],
    "currentLine": 1,
    "currentFilePath": "/home/user/doc.md",
    "modified": true
  }
}
```

**Storage Benefits:**
- Human-readable JSON format
- Timestamped for debugging
- Survives application crashes
- Easy to inspect or manually edit

**Cleanup:**
- Automatically cleaned on proper program close
- Can be manually deleted from `~/.ashigaru-state/`
- Small file size (typically < 100KB per program)

---

### Common Use Cases

#### Document Editor
```javascript
saveState({
    content: editorContent,
    cursorLine: currentLine,
    filePath: openFilePath,
    modified: hasUnsavedChanges
});
```

#### Spreadsheet
```javascript
saveState({
    data: csvData,
    selectedRow: activeRow,
    selectedCol: activeCol,
    filePath: csvPath
});
```

#### Form Application
```javascript
saveState({
    formData: {
        name: nameField,
        email: emailField,
        message: messageField
    },
    currentStep: wizardStep
});
```

#### Settings Panel
```javascript
saveState({
    activeTab: selectedTab,
    pendingChanges: modifiedSettings,
    previewMode: isPreviewActive
});
```

---

### Testing State Persistence

To test your implementation:

1. **Basic Save/Restore:**
   - Open your program
   - Change some state (type text, select items, etc.)
   - Minimize the program (press `M`)
   - Restore the program (click from window list)
   - Verify state is preserved

2. **Clear on Close:**
   - Open your program
   - Change some state
   - Close properly (press `ESC`)
   - Reopen the program
   - Verify state is cleared (fresh start)

3. **Crash Recovery:**
   - Open your program
   - Change some state
   - Kill the ASHIGARU process (simulate crash)
   - Restart ASHIGARU
   - Open your program
   - Verify state is restored (because minimize was called before crash)

---

### Best Practices

1. **Always Check for savedState:** Don't assume it exists
   ```javascript
   if (savedState) { /* restore logic */ }
   ```

2. **Always Check for saveState Function:** It's optional
   ```javascript
   saveState?.({ data });
   ```

3. **Clear State on Proper Close:** Prevents stale data
   ```javascript
   clearState?.();
   onClose();
   ```

4. **Don't Save Sensitive Data:** Passwords, tokens, API keys

5. **Save Frequently:** Don't wait for minimize - save on every important change

6. **Keep State Small:** Only save what's necessary to restore the UI

7. **Validate Restored State:** Don't trust saved data blindly

8. **Version Your State:** Include a version field for future migrations

---

### Troubleshooting

**State not restoring?**
- Check if savedState prop is being received
- Verify the useEffect has empty dependency array `[]`
- Check `~/.ashigaru-state/` for saved state file

**State not saving?**
- Verify saveState is called in useEffect with proper dependencies
- Check if state actually changed (useEffect won't run if deps unchanged)
- Look for errors in console

**State persisting after close?**
- Ensure clearState() is called before onClose()
- Check ESC key handler is working
- Manually delete `~/.ashigaru-state/{program-id}.json`

**Old state causing issues?**
- Add version field to state
- Validate state structure before restoring
- Provide migration logic for old versions

---

## IPC System

ASHIGARU includes an Inter-Process Communication system enabling programs to communicate with each other.

### Quick Start

```javascript
const MyProgram = ({ ipc, windowId }) => {
    // Publish to channel
    ipc.publish('myapp.events', 'status', { value: 42 });

    // Subscribe to channel
    ipc.subscribe('other.events', (msg) => console.log(msg.payload));

    // Register a callable service
    ipc.registerService('myservice', {
        getData: async () => ({ result: 'hello' })
    });

    // Call another program's service
    const result = await ipc.callService('calculator', 'add', 5, 3);
};
```

### Available Methods

| Method | Description |
|--------|-------------|
| `publish(channel, type, payload)` | Broadcast message to subscribers |
| `subscribe(channel, handler)` | Listen to channel messages |
| `sendToWindow(windowId, type, payload)` | Direct message to specific window |
| `onDirectMessage(handler)` | Listen for direct messages |
| `registerService(name, methods)` | Register callable functions |
| `callService(name, method, ...args)` | Call a registered service |
| `request(channel, type, payload, timeout)` | Send request and await response |

For complete IPC documentation, see **[docs/IPC.md](IPC.md)**

---

## Unified API System

Programs receive an `api` prop providing unified access to system features.

### Quick Start

```javascript
const MyProgram = ({ api }) => {
    // System info
    const stats = api.system.getStats();

    // Persistent storage
    await api.storage.set('key', value);
    const data = await api.storage.get('key');

    // Notifications
    api.notifications.success('Saved!');

    // Window management
    api.windows.list();
    api.windows.minimize();

    // Sounds (including custom program sounds)
    api.sound.click();
    api.sound.playCustom('alert.mp3'); // from program's /sounds folder

    // AI (if configured)
    if (api.ai.isAvailable()) {
        const answer = await api.ai.ask('Question?');
    }
};
```

### Available Modules

| Module | Description |
|--------|-------------|
| `api.system` | System stats, events, hostname, uptime |
| `api.storage` | Persistent key-value storage per program |
| `api.notifications` | Toast notifications (success, error, warning, info) |
| `api.windows` | Window management and direct messaging |
| `api.sound` | System sounds + custom program sounds |
| `api.ai` | AI/LLM capabilities |
| `api.ipc` | Raw IPC access |

For complete API documentation, see **[docs/API.md](API.md)**

---

## Sound System

ASHIGARU includes an optional sound system that provides audio feedback for UI events. Sounds are disabled by default and can be enabled in the Control Panel → Audio settings.

### Prerequisites

For sound effects to work, you need an audio player installed:

**Linux (Recommended):**
```bash
sudo apt install mpg123
```

**Alternative players** (detected automatically):
- `ffplay` (FFmpeg)
- `mpv`
- `mplayer`
- `cvlc` (VLC command-line)

### Sound Types

The system provides predefined sound types:

| Type | Description | Default Trigger |
|------|-------------|-----------------|
| `click` | Button activation/submit | Window open |
| `hover` | Focus change/selection | (Available for custom use) |
| `success` | Successful operation | (Available for custom use) |
| `error` | Error or failure | Window close |
| `notify` | Notification alert | (Available for custom use) |
| `open` | Window/menu opening | (Legacy, use `click`) |
| `close` | Window/menu closing | (Legacy, use `error`) |

### Using Sounds in Programs

Import the sound utility and call the appropriate function:

```javascript
import { playSound, playClick, playSuccess, playError } from '../utils/sound.js';

// Check if sounds are enabled from settings prop
const { settings } = props;

// Play a specific sound type
playSound('success', settings.sounds);

// Or use convenience wrappers
playClick(settings.sounds);
playSuccess(settings.sounds);
playError(settings.sounds);
```

### Complete Example

```javascript
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { playClick, playError } from '../utils/sound.js';

const MyProgram = ({ isFocused, onClose, settings }) => {
    const handleAction = () => {
        // Play success sound when action completes
        playClick(settings?.sounds || false);
        // ... perform action
    };

    const handleError = () => {
        // Play error sound on failure
        playError(settings?.sounds || false);
    };

    useInput((input, key) => {
        if (!isFocused) return;
        
        if (key.escape) {
            onClose();
            return;
        }
        
        if (key.return) {
            handleAction();
        }
    }, { isActive: isFocused });

    return (
        <Box borderStyle="single" flexGrow={1}>
            <Text>Press Enter to trigger action with sound</Text>
        </Box>
    );
};

export default MyProgram;
```

### Adding Custom Sounds

1. **Place MP3 files** in the `sounds/` directory:
   - `sounds/click.mp3`
   - `sounds/hover.mp3`
   - `sounds/success.mp3`
   - `sounds/error.mp3`
   - `sounds/notify.mp3`
   - `sounds/open.mp3`
   - `sounds/close.mp3`

2. **Keep sounds short** (< 0.5 seconds) for responsive feedback

3. **Use low volume** to avoid being disruptive

### Sound API Reference

#### `playSound(type: SoundType, soundsEnabled: boolean): void`
- Plays a sound of the specified type
- Does nothing if `soundsEnabled` is `false`
- Fails silently if sound file is missing or no audio player is available

#### Convenience Functions
- `playClick(soundsEnabled: boolean)` - Click/activation sound
- `playHover(soundsEnabled: boolean)` - Focus/selection sound
- `playSuccess(soundsEnabled: boolean)` - Success sound
- `playError(soundsEnabled: boolean)` - Error sound

### Best Practices

1. **Always check settings** - Pass `settings.sounds` to sound functions
2. **Don't assume availability** - Sound playback may fail silently (no player, missing files)
3. **Keep sounds subtle** - Users should be able to work without sound
4. **Use appropriate types** - Match sound type to the action context
5. **Fire and forget** - Sound functions are async but don't need to be awaited

---

## Available Ink Components

ASHIGARU provides access to a rich set of Ink components and libraries for building terminal UIs.

### Core Ink Components

From the `ink` package (v6.6.0):

| Component/Hook | Description | Usage |
|----------------|-------------|-------|
| `Box` | Flexbox layout container | `<Box flexDirection="column" padding={1}>` |
| `Text` | Render text with color/styling | `<Text color="#00ffff" bold>Hello</Text>` |
| `useInput` | Keyboard input hook | `useInput((input, key) => {...}, { isActive })` |
| `useApp` | Access app control methods | `const { exit } = useApp()` |
| `useStdout` | Access stdout dimensions | `const { stdout } = useStdout()` |
| `useStdin` | Access stdin control | `const { stdin } = useStdin()` |
| `useFocus` | Focus management | `const { focusNext, focusPrev } = useFocus()` |

### Official Ink UI Components

From `@inkjs/ui` (v2.0.0):

| Component | Description | Usage |
|-----------|-------------|-------|
| `Badge` | Styled badge/label with color | `<Badge color="green">Active</Badge>` |
| `TextInput` | Text input field | `<TextInput value={value} onChange={setValue} />` |

### Extended Ink Components

Additional specialized components available:

#### Text Input
- **Package:** `ink-text-input` (v6.0.0)
- **Component:** `TextInput`
- **Usage:** `<TextInput value={text} onChange={setText} placeholder="Enter text..." />`

#### Selection Lists
- **Package:** `ink-select-input` (v6.2.0)
- **Component:** `SelectInput`
- **Usage:**
  ```javascript
  <SelectInput
      items={[
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' }
      ]}
      onSelect={(item) => console.log(item.value)}
  />
  ```

#### Loading Spinners
- **Package:** `ink-spinner` (v5.0.0)
- **Component:** `Spinner`
- **Usage:** `<Spinner type="dots" />`

#### Tables
- **Package:** `ink-table` (v3.1.0)
- **Component:** `Table`
- **Usage:**
  ```javascript
  <Table
      data={[
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
      ]}
  />
  ```

#### Markdown Rendering
- **Package:** `ink-markdown` (v1.0.4)
- **Component:** `Markdown`
- **Usage:** `<Markdown>{markdownString}</Markdown>`

#### Syntax Highlighting
- **Package:** `ink-syntax-highlight` (v2.0.2)
- **Component:** `SyntaxHighlight`
- **Usage:**
  ```javascript
  <SyntaxHighlight
      language="javascript"
      code={codeString}
  />
  ```

#### Visual Dividers
- **Package:** `ink-divider` (v4.1.1)
- **Component:** `Divider`
- **Usage:** `<Divider title="Section" />`

#### Scrollable Views
- **Package:** `ink-scroll-view` (v0.3.3)
- **Component:** `ScrollView`
- **Usage:**
  ```javascript
  <ScrollView height={10}>
      <Text>{longContent}</Text>
  </ScrollView>
  ```

#### Charts and Graphs
- **Package:** `@pppp606/ink-chart` (v0.2.3)
- **Components:** `BarChart`, `LineChart`
- **Usage:**
  ```javascript
  <BarChart
      data={[
          { label: 'CPU', value: 45 },
          { label: 'Memory', value: 72 }
      ]}
      height={10}
  />
  ```

---

## System APIs and Utilities

ASHIGARU programs run in a Node.js environment and have full access to Node.js APIs and installed packages.

### Node.js Core Modules

Common modules used in system programs:

#### File System (`fs` / `fs/promises`)
```javascript
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';

// Synchronous
const data = fs.readFileSync('/path/to/file', 'utf-8');

// Asynchronous (preferred)
const data = await readFile('/path/to/file', 'utf-8');
```

#### Operating System (`os`)
```javascript
import os from 'os';

const homeDir = os.homedir();        // /home/username
const platform = os.platform();      // 'linux', 'darwin', 'win32'
const hostname = os.hostname();      // 'mycomputer'
const cpus = os.cpus();             // CPU information array
const totalMem = os.totalmem();     // Total memory in bytes
const freeMem = os.freemem();       // Free memory in bytes
const uptime = os.uptime();         // System uptime in seconds
```

#### Path (`path`)
```javascript
import path from 'path';

const joined = path.join('/home', 'user', 'file.txt');
const resolved = path.resolve('./relative/path');
const extension = path.extname('file.txt');  // '.txt'
const basename = path.basename('/path/to/file.txt');  // 'file.txt'
```

#### Child Process (`child_process`)
```javascript
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute shell command
const { stdout, stderr } = await execAsync('ls -la');
console.log(stdout);

// Spawn process with streaming
const process = spawn('tail', ['-f', '/var/log/syslog']);
process.stdout.on('data', (data) => {
    console.log(data.toString());
});
```

#### Network (`net`, `dns`)
```javascript
import { networkInterfaces } from 'os';
import dns from 'dns/promises';

// Get network interfaces
const interfaces = networkInterfaces();

// DNS lookup
const addresses = await dns.resolve4('example.com');
```

### Third-Party Packages

ASHIGARU includes several useful packages:

#### System Information (`systeminformation`)
```javascript
import si from 'systeminformation';

// CPU information
const cpu = await si.cpu();

// Memory usage
const mem = await si.mem();

// Disk layout
const disks = await si.diskLayout();

// Network stats
const networkStats = await si.networkStats();

// Processes
const processes = await si.processes();
```

#### Configuration Management
```javascript
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

// Standard settings location
const settingsPath = path.join(os.homedir(), '.cypher-tui-settings.json');

// Read settings
const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));

// Write settings
await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
```

### Useful Patterns

#### Periodic Data Updates
```javascript
const Program = ({ isFocused, onClose }) => {
    const [data, setData] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            const result = await someAsyncOperation();
            setData(result);
        };

        fetchData();
        const interval = setInterval(fetchData, 2000);  // Update every 2 seconds

        return () => clearInterval(interval);
    }, []);

    return <Box>{/* Render data */}</Box>;
};
```

#### Error Handling
```javascript
const [error, setError] = React.useState(null);

try {
    const result = await riskyOperation();
} catch (err) {
    setError(err.message);
    setTimeout(() => setError(null), 3000);  // Clear error after 3 seconds
}

// In render:
{error && <Text color="red">{error}</Text>}
```

#### File Operations with User Feedback
```javascript
const [loading, setLoading] = React.useState(false);
const [message, setMessage] = React.useState('');

const handleSave = async () => {
    setLoading(true);
    try {
        await writeFile('/path/to/file', content);
        setMessage('Saved successfully!');
    } catch (err) {
        setMessage(`Error: ${err.message}`);
    } finally {
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    }
};

// In render:
{loading && <Spinner />}
{message && <Text>{message}</Text>}
```

---

## Best Practices

### 1. Always Check `isFocused`

Only process input when your window is focused:

```javascript
useInput((input, key) => {
    if (!isFocused) return;
    // Handle input...
}, { isActive: isFocused });
```

### 2. Handle ESC to Close

Users expect ESC to close programs:

```javascript
if (key.escape) {
    onClose();
    return;
}
```

### 3. Use Theme Colors

Load user's theme settings for consistent styling:

```javascript
import os from 'os';
import fs from 'fs';
import path from 'path';

const loadTheme = () => {
    try {
        const p = path.join(os.homedir(), '.cypher-tui-settings.json');
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
        }
    } catch {}
    return 'Cyberpunk';
};

const getThemeColors = (t) => ({
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88' },
    Mono: { accent: '#ffffff', secondary: '#888888', good: '#ffffff' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', good: '#00ff00' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', good: '#ffcc00' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88' });
```

### 4. Use Dynamic Border Colors

Show focus state visually:

```javascript
const borderColor = isFocused ? colors.accent : '#333333';

return h(Box, { borderStyle: 'single', borderColor, flexGrow: 1 },
    // Content...
);
```

### 5. Lock Input for Text Entry

When using `TextInput` or other text input components, lock global input to prevent window manager shortcuts from interfering:

```javascript
const Program = ({ isFocused, lockInput, unlockInput, onClose }) => {
    const [mode, setMode] = React.useState('view'); // view, input, etc.

    // Lock/unlock input based on mode
    React.useEffect(() => {
        const isTextInputMode = mode === 'input' || mode === 'edit';

        if (isFocused && isTextInputMode) {
            lockInput?.();
        } else {
            unlockInput?.();
        }

        // Cleanup: always unlock on unmount
        return () => {
            unlockInput?.();
        };
    }, [mode, isFocused, lockInput, unlockInput]);

    // Dedicated ESC handler that works even when input is locked
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (mode === 'view') {
                onClose();
            } else {
                setMode('view'); // Exit text input mode
            }
        }
    }, { isActive: isFocused }); // Always active!

    // Regular input handler for non-text modes
    useInput((input, key) => {
        if (!isFocused) return;
        // Handle other keys...
    }, { isActive: isFocused && mode !== 'input' && mode !== 'edit' });

    // ... rest of program
};
```

**Important:** Always create a separate `useInput` hook for ESC that has `isActive: isFocused` (without mode checks) so users can always exit text input fields. This prevents keys like `M` (minimize), `X` (close), etc. from triggering while typing, but still allows ESC to work.

### 6. Implement State Persistence for Stateful Programs

If your program manages important data (documents, forms, selections), implement state persistence:

```javascript
// Restore on mount
React.useEffect(() => {
    if (savedState) {
        restoreStateLogic(savedState);
    }
}, []);

// Save on changes
React.useEffect(() => {
    saveState?.({ importantData });
}, [importantData]);

// Clear on close
const handleClose = () => {
    clearState?.();
    onClose();
};
```

See the [State Persistence](#state-persistence) section for complete documentation.

### 7. Avoid Blocking Operations

Use async/await and show loading states for I/O operations.

---

## Packaging for Distribution

### GitHub Releases (Recommended)

1. **Create your program folder structure:**
   ```
   games/
   └── pong/
       ├── manifest.json
       └── index.js
   ```

2. **Create a tar.gz or zip archive** containing the folder structure

3. **Create a GitHub Release** and attach the archive

4. **Users install via Package Manager:**
   - Enter your GitHub repo: `username/repo-name`
   - Package Manager fetches the latest release automatically

### Direct URL

For non-GitHub hosting, provide a direct link to a `.tar.gz` or `.zip` archive.

---

## Example Program

A complete example Pong game is available for reference:

**Repository:** [ASHIGARU-pong-test](https://github.com/Ashigaru-Software-Industries/ASHIGARU-pong-test)

### Installation

1. Open the Package Manager (`system > core > package-manager`)
2. Select "Install from GitHub"
3. Enter: `Ashigaru-Software-Industries/ASHIGARU-pong-test`
4. The game will be installed to `programs/games/pong/`

### Key Takeaways from the Example

- Folder structure: `games/pong/` preserves location in launcher
- Uses `useInput` with `isFocused` check
- Implements game loop with `setInterval` and cleanup
- Loads theme for consistent styling
- Shows footer with control hints

---

## Troubleshooting

### "No manifest.json found"
- Ensure your archive contains the proper folder structure
- The manifest must be at the program folder level, not the archive root

### "Validation failed: Missing required fields"
- Check that `id`, `name`, `version`, `description`, and `entry` are all present in manifest.json

### Program doesn't respond to input
- Verify you're checking `isFocused` before processing input
- Ensure `{ isActive: isFocused }` is passed to `useInput`

---

## Summary

1. Create a folder structure: `category/program-name/`
2. Add `manifest.json` with required fields
3. Create `index.js` exporting a React component
4. Handle `isFocused` and `onClose` props
5. Package as `.tar.gz` or `.zip`
6. Upload to GitHub Releases
7. Users install via Package Manager

For questions or issues, refer to the [example repository](https://github.com/Ashigaru-Software-Industries/ASHIGARU-pong-test).
