# ASHIGARU

![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg)

A modular Terminal User Interface (TUI) framework built with React and Ink. ASHIGARU provides a comprehensive desktop-like environment within the terminal, featuring a window manager, extensible program system, AI integration, state persistence, and automatic updates.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Built-in Programs](#built-in-programs)
  - [System Programs](#system-programs)
  - [ASHIGARU Suite](#ashigaru-suite)
  - [Utility Programs](#utility-programs)
- [Keyboard Controls](#keyboard-controls)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Creating Custom Programs](#creating-custom-programs)
  - [State Persistence](#state-persistence)
- [Themes](#themes)
- [Architecture](#architecture)
- [Updating](#updating)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ASHIGARU is a terminal-based operating system interface that combines the power of modern web technologies with the efficiency of command-line interfaces. It features a complete window management system, multiple concurrent programs, customizable themes, and a modular architecture that allows for easy extension and customization.

---

## Key Features

### Core Functionality

- **Window Management System** - Run multiple programs simultaneously with focus management, minimize/maximize capabilities, and keyboard-driven navigation
- **State Persistence** - Automatic saving and restoration of program states across sessions
- **Modular Program Architecture** - Extensible plugin system allowing custom programs to integrate seamlessly
- **Self-Updating System** - Built-in updater that checks GitHub releases and safely installs updates with automatic backup and rollback
- **Theme System** - Four built-in themes (Cyberpunk, Mono, Matrix, Amber) with customizable color schemes
- **Package Manager** - Download and install programs from GitHub releases or direct URLs
- **AI Integration** - Native support for Google Gemini AI with extensible provider architecture

### Technical Features

- Built with React 19 and TypeScript for type-safe, component-based development
- Ink-based rendering for efficient terminal UI updates
- Hot-reload development mode for rapid iteration
- Comprehensive error handling and state management
- Session persistence and program state recovery
- Input locking system for text field protection

---

## Prerequisites

### System Requirements

- **Node.js** version 16.0.0 or higher
- **npm** version 7.0.0 or higher
- **Terminal** with Unicode support
- **Minimum terminal size**: 80x24 recommended

### Optional Requirements

- Google Gemini API key for AI features
- Git for development and contributions
- Audio player for sound effects (one of: `mpg123`, `ffplay`, `mpv`, `vlc`)

---

## Installation

### Standard Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/savannah-i-g/ASHIGARU.git
cd ASHIGARU
npm install --legacy-peer-deps
```

### Configuration

Copy the environment template and configure your API keys:

```bash
cp .env.example .env
```

Edit the `.env` file and add your API credentials. The Google Generative AI API key can be obtained from the [Google AI Studio](https://aistudio.google.com/app/apikey).

**Required environment variables:**
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key for Google Gemini integration

### Building

Compile TypeScript source to JavaScript:

```bash
npm run build
```

This generates the compiled application in the `dist/` directory.

---

## Usage

### Development Mode

Launch the application with hot-reload enabled for development:

```bash
npm run dev
```

Changes to source files will automatically reload the application.

### Production Mode

Run the compiled production build:

```bash
npm start
```

---

## Built-in Programs

ASHIGARU includes a comprehensive suite of built-in programs organized into system, suite, and utility categories.

### System Programs

#### Core

**Control Panel** - Comprehensive system configuration center with categorized settings:
- **Display**: Theme selection, wallpaper, and wallpaper color customization
- **Audio**: Enable/disable sound effects for UI feedback
- **System**: Animations, performance mode, and refresh rate settings
- **Date & Time**: Clock format preferences and timezone display
- **Shortcuts**: Reference guide for all keyboard shortcuts
- **About**: System information, version, and credits

**System Updater** - Check for and install ASHIGARU updates from GitHub releases. Features automatic backup creation, safe installation with rollback capability, and progress tracking.

**Package Manager** - Download and install programs from GitHub releases or direct URLs. Features automatic manifest validation, folder structure preservation, conflict detection, and update checking.

**Environment Manager** - View, edit, add, and delete environment variables. Export to .env format. Navigate with arrow keys and search/filter capabilities.

#### Monitoring

**System Info** - Display comprehensive system information including hostname, operating system, architecture, CPU details, memory usage, and uptime statistics.

**Processes** - View and manage running system processes with real-time updates. Displays process ID, CPU usage, memory consumption, and command information. Sort and terminate processes.

**Network** - Monitor network interfaces and active connections. Shows interface status, IP addresses, MAC addresses, and network statistics.

**System Health** - Aggregate health monitoring dashboard with health score (0-100), critical issue alerts, system metrics visualization, and quick-fix suggestions.

---

### ASHIGARU Suite

Office productivity applications with full state persistence support.

**Suite Docs** - Document editor with Markdown support. Features line-by-line editing, save to .txt or .md formats, word/character count, and automatic state persistence.

**Suite Sheets** - CSV spreadsheet viewer and editor. Navigate cells with arrow keys, edit values, add rows/columns dynamically, and save to CSV format.

**Suite Slides** - JSON-based presentation viewer. Display text slides with formatting control, navigate forward/backward, and support for speaker notes.

---

### Utility Programs

#### Tools

**Clock** - Digital clock and timer utility with three modes: Clock, Timer (custom minutes), and Stopwatch. Large block-digit display with theme support.

**File Browser** - Navigate the filesystem with keyboard-driven interface. View directory contents, create/rename/delete files and folders, and file size information.

**Data Formatter** - Format, validate, and convert between JSON/YAML/XML. Features syntax highlighting, file comparison/diff viewer, and export capabilities.

#### Productivity

**Terminal** - Interactive shell terminal with full command execution capabilities. Supports standard shell commands and process management.

**Editor** - Vim-like code editor with syntax highlighting support. Features multiple editing modes (normal/insert/command), file operations, and scrollable view.

**Notes** - Quick note-taking application with persistent storage. Create, edit, delete, and list notes with simple interface.

#### Internet

**NeoRin AI** - AI-powered assistant using Google Gemini. Provides conversational AI capabilities with session management, context retention, and specialized system prompt for technical analysis. Multiple model selection (Gemini 3 Pro/Flash, 2.5, 2.0, 1.5).

**Browser** - Text-based web browser for viewing web content in the terminal. Supports basic HTML rendering and navigation.

---

## Keyboard Controls

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Open program launcher menu |
| `` ` `` (backtick) | Toggle window list |
| `Ctrl+D` | Minimize focused window |
| `Ctrl+X` or `Ctrl+W` | Close focused window |
| `Ctrl+Q` | Quit ASHIGARU |
| `Tab` | Cycle focus between windows |
| `Esc` | Cancel/close current dialog or menu |

### Window Management

- Arrow keys to navigate menus and selections
- Click or use arrow keys to select windows
- Multiple windows can run simultaneously in tiled layout
- Minimized windows accessible via window list (backtick)

### Text Input Protection

When using text input fields (file paths, editing, search):
- Global shortcuts are automatically disabled to prevent accidental actions
- `Esc` always available to exit text input mode
- Input automatically unlocked when exiting text mode

---

## Development

### Project Structure

The codebase is organized into clear functional modules:

#### Source Directory (`src/`)

- `components/` - Reusable UI components (Button, Panel, Input, Desktop, MenuBar, StatusBar)
- `core/` - Core application logic:
  - `App.tsx` - Root component with intro screen
  - `Shell.tsx` - Desktop environment controller
  - `WindowManager.tsx` - Window and state management
  - `ProgramLoader.ts` - Dynamic program discovery
  - `SettingsContext.tsx` - Theme and settings management
  - `StateManager.ts` - Program state persistence
  - `ai/` - AI integration layer with provider architecture
- `theme/` - Theme definitions, color schemes, and border styles
- `types/` - TypeScript type definitions and interfaces
- `index.tsx` - Application entry point

#### Programs Directory (`programs/`)

- `system/` - System-level programs:
  - `core/` - Settings, Updater, Package Manager, Environment Manager
  - `monitoring/` - System Info, Processes, Network, System Health
- `utility/` - User-facing utility programs:
  - `productivity/` - Notes, Editor, Terminal, Suite (Docs, Sheets, Slides)
  - `tools/` - Clock, File Browser, Data Formatter
  - `internet/` - Browser, NeoRin AI

#### Build Output (`dist/`)

Generated directory containing compiled JavaScript. Created by TypeScript compiler - do not edit directly.

#### Assets

- `wallpapers/` - ASCII art wallpapers for desktop backgrounds
- `docs/` - Developer documentation including `PROGRAM_DEVELOPMENT.md`

---

### Creating Custom Programs

Programs are modular JavaScript/TypeScript components that integrate with the ASHIGARU environment.

#### Program Structure

Each program requires:
1. **`manifest.json`** - Program metadata and configuration
2. **`index.js`** - Program implementation (React component)

#### Minimal Example

**`manifest.json`:**
```json
{
  "id": "my-program",
  "name": "My Program",
  "version": "1.0.0",
  "description": "A simple example program",
  "author": "Your Name",
  "icon": "P",
  "category": "utility",
  "entry": "index.js"
}
```

**`index.js`:**
```javascript
import React from 'react';
import { Box, Text, useInput } from 'ink';

const MyProgram = ({ isFocused, onClose }) => {
    useInput((input, key) => {
        if (!isFocused) return;
        if (key.escape) onClose();
    }, { isActive: isFocused });

    return (
        <Box borderStyle="single" flexGrow={1}>
            <Text>Hello from My Program!</Text>
        </Box>
    );
};

export default MyProgram;
```

#### Complete Documentation

For comprehensive program development documentation including:
- Complete API reference
- State persistence system
- Available Ink components
- Best practices and patterns
- Packaging and distribution

See **[docs/PROGRAM_DEVELOPMENT.md](docs/PROGRAM_DEVELOPMENT.md)**

---

### State Persistence

ASHIGARU v1.2.0 introduces automatic state persistence for programs. This allows programs to save and restore their state across sessions.

#### How It Works

- **On minimize**: Program state is saved to `~/.ashigaru-state/{program-id}.json`
- **On reopen**: Saved state is automatically restored
- **On proper close**: State is cleared (fresh start next time)

#### Using State Persistence

Programs receive three optional props:

```javascript
const MyProgram = ({ savedState, saveState, clearState, onClose }) => {
    const [data, setData] = React.useState('');

    // Restore state on mount
    React.useEffect(() => {
        if (savedState?.data) {
            setData(savedState.data);
        }
    }, []);

    // Save state on changes
    React.useEffect(() => {
        saveState?.({ data });
    }, [data]);

    // Clear state on close
    const handleClose = () => {
        clearState?.();
        onClose();
    };

    // ...
};
```

**Benefits:**
- Prevents data loss from accidental minimization
- Survives application crashes
- Opt-in per program (backward compatible)
- Human-readable JSON storage

For complete state persistence documentation, see **[docs/PROGRAM_DEVELOPMENT.md#state-persistence](docs/PROGRAM_DEVELOPMENT.md#state-persistence)**

---

## Themes

ASHIGARU includes four built-in themes, each with distinct color schemes designed for different preferences and terminal capabilities.

### Available Themes

**Cyberpunk** (Default)
High-contrast cyan and magenta color scheme with vibrant accent colors. Designed for modern terminals with full color support.

**Mono**
Monochromatic theme using shades of white and gray. Ideal for minimal aesthetics or terminals with limited color support.

**Matrix**
Green-on-black color scheme inspired by classic terminal displays. Features varying shades of green for visual hierarchy.

**Amber**
Warm amber and orange tones reminiscent of vintage CRT monitors. Provides comfortable viewing with reduced blue light. Uses double-line borders.

### Theme Configuration

Themes can be changed through the **Settings** program or by editing `~/.cypher-tui-settings.json` directly.

---

## Architecture

### Component Hierarchy

ASHIGARU uses a hierarchical component architecture:

1. **App** - Root component managing global state and settings
2. **Shell** - Desktop environment controller with launcher and window list
3. **WindowManager** - Manages program windows, focus, and state persistence
4. **Desktop** - Renders wallpaper and window containers
5. **Programs** - Individual program instances in tiled layout

### State Management

Application state is managed through React Context:

- **SettingsContext** - Global settings, theme configuration, and wallpaper management
- **WindowManagerContext** - Window instances, focus state, input locking, and state persistence
- **AIContext** - AI provider management and session state (optional)

Settings persist to `~/.cypher-tui-settings.json` and are loaded on startup.

Program states persist to `~/.ashigaru-state/{program-id}.json` on minimize.

### Program Loading

The **ProgramLoader** scans the `programs/` directory at startup, reads manifest files, and dynamically imports program modules. Programs support unlimited nesting depth (e.g., `programs/a/b/c/program-name/`). Programs are loaded on-demand when launched by the user.

---

## Updating

ASHIGARU includes a built-in update system that simplifies version management.

### Using the System Updater

1. Launch ASHIGARU and open the **System Updater** from the system programs menu
2. The updater automatically checks GitHub releases for newer versions
3. If an update is available, review the release notes and press Enter to install
4. The updater creates a backup, downloads the new version, installs dependencies, and rebuilds
5. Restart ASHIGARU to use the new version

### Update Process

The updater performs these steps automatically:

1. Checks current version against latest GitHub release
2. Downloads release tarball from GitHub
3. Creates timestamped backup in `~/.ashigaru-backups/`
4. Extracts new version while preserving `.env` configuration
5. Runs `npm install --legacy-peer-deps`
6. Executes `npm run build` to compile TypeScript
7. Cleans up temporary files and old backups

### Rollback

If an update fails, the System Updater offers automatic rollback to the previous working version using the created backup.

### Manual Updates

Alternatively, update manually using Git:

```bash
git pull origin main
npm install --legacy-peer-deps
npm run build
```

---

## Contributing

Contributions to ASHIGARU are welcome. When contributing, please:

1. Fork the repository
2. Create a feature branch from `main`
3. Make changes with clear, descriptive commits
4. Ensure TypeScript compilation succeeds: `npm run build`
5. Test changes in both development (`npm run dev`) and production (`npm start`) modes
6. Update documentation if adding new features or APIs
7. Submit a pull request with a clear description of changes

### Development Guidelines

- Follow existing code style and patterns
- Add TypeScript types for new code
- Document new APIs in `docs/PROGRAM_DEVELOPMENT.md`
- Test programs with all four themes
- Ensure programs handle focus and input correctly
- Implement state persistence for stateful programs

---

## License

MIT License - see LICENSE file for details.

---

## Support

For issues, feature requests, or questions:

- **GitHub Issues**: [github.com/savannah-i-g/ASHIGARU/issues](https://github.com/savannah-i-g/ASHIGARU/issues)
- **Documentation**: [docs/PROGRAM_DEVELOPMENT.md](docs/PROGRAM_DEVELOPMENT.md)

---

## Changelog

### v1.2.2 (Latest)

**Major Features:**
- **Control Panel** - Complete redesign of Settings as a full-featured Control Panel with categorized sidebar navigation
- **Sound System** - Optional audio feedback for window open/close events using `cli-sound`
- **Updated Keyboard Shortcuts** - All window controls now use Ctrl+key format for consistency

**New Settings:**
- Clock format (12h/24h)
- Performance mode toggle
- Refresh rate configuration for monitoring programs

**Dependencies:**
- Added: cli-sound (for optional audio feedback)

**Note:** For sound effects to work, install an audio player:
```bash
sudo apt install mpg123   # Recommended for Linux
```

### v1.2.0

**Major Features:**
- State Persistence system for automatic save/restore of program states
- ASHIGARU/Suite: Office productivity programs (Docs, Sheets, Slides)
- New System Core Programs: Environment Manager, Data Formatter, System Health Dashboard

**Improvements:**
- Input locking system to prevent accidental minimize during text entry
- Dedicated ESC handlers for all programs
- Enhanced documentation with complete API reference

**Dependencies:**
- Added: systeminformation, js-yaml, fast-xml-parser, diff

### v1.1.0

**Features:**
- Enhanced Launcher with file explorer navigation
- Package Manager for GitHub/URL program installs
- Dynamic version display in header
- Comprehensive README with GitHub standards

### v1.0.0

**Initial Release:**
- Window management system
- Theme system (4 themes)
- Built-in system and utility programs
- AI integration (Google Gemini)
- Self-updating system
