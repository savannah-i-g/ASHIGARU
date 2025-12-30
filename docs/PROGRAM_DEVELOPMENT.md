# ASHIGARU Program Development Guide

A comprehensive guide for creating, packaging, and distributing programs for the ASHIGARU terminal interface.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Required Files](#required-files)
- [Manifest Format](#manifest-format)
- [Entry File Requirements](#entry-file-requirements)
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

| Prop | Type | Description |
|------|------|-------------|
| `isFocused` | boolean | `true` when this window has focus |
| `onClose` | function | Call to close the program window |

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

### 5. Avoid Blocking Operations

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

## Available Ink Components

ASHIGARU programs can use these Ink components:

| Component | Package | Description |
|-----------|---------|-------------|
| `Box` | `ink` | Flexbox container |
| `Text` | `ink` | Text display |
| `useInput` | `ink` | Keyboard input handling |
| `useApp` | `ink` | App control (exit, etc.) |
| `Badge` | `@inkjs/ui` | Styled badge/label |
| `Spinner` | `ink-spinner` | Loading animation |
| `TextInput` | `ink-text-input` | Text input field |
| `SelectInput` | `ink-select-input` | Selection list |

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
