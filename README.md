# ASHIGARU

![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg)

A modular Terminal User Interface (TUI) framework built with React and Ink. ASHIGARU provides a comprehensive desktop-like environment within the terminal, featuring a window manager, extensible program system, AI integration, and automatic updates.

## Overview

ASHIGARU is a terminal-based operating system interface that combines the power of modern web technologies with the efficiency of command-line interfaces. It features a complete window management system, multiple concurrent programs, customizable themes, and a modular architecture that allows for easy extension and customization.

## Key Features

### Core Functionality
- **Window Management System** - Run multiple programs simultaneously with focus management, minimize/maximize capabilities, and keyboard-driven navigation
- **Modular Program Architecture** - Extensible plugin system allowing custom programs to integrate seamlessly
- **Self-Updating System** - Built-in updater that checks GitHub releases and safely installs updates with automatic backup and rollback
- **Theme System** - Four built-in themes (Cyberpunk, Mono, Matrix, Amber) with customizable color schemes
- **Persistent Settings** - User preferences and configurations saved across sessions
- **AI Integration** - Native support for Google Gemini AI with extensible provider architecture

### Technical Features
- Built with React 19 and TypeScript for type-safe, component-based development
- Ink-based rendering for efficient terminal UI updates
- Hot-reload development mode for rapid iteration
- Comprehensive error handling and state management
- Session persistence and recovery

## Prerequisites

### System Requirements
- Node.js version 16.0.0 or higher
- npm version 7.0.0 or higher
- Terminal with Unicode support
- Minimum 80x24 terminal size recommended

### Optional Requirements
- Google Gemini API key for AI features
- Git for development and contributions

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

Required environment variables:
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key for Google Gemini integration

### Building

Compile TypeScript source to JavaScript:

```bash
npm run build
```

This generates the compiled application in the `dist/` directory.

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

### Keyboard Controls

#### Global Shortcuts
- `Ctrl+L` - Open program launcher menu
- `` ` `` (backtick) - Toggle window list
- `M` - Minimize focused window
- `X` - Close focused window
- `Q` - Quit ASHIGARU
- `Tab` - Cycle focus between windows
- `Esc` - Cancel/close current dialog or menu

#### Window Management
- Click or use arrow keys to select windows
- Windows can be dragged and repositioned
- Multiple windows can run simultaneously

## Available Programs

ASHIGARU includes a comprehensive suite of built-in programs organized into system and utility categories.

### System Programs

**Settings**
Configure application preferences including theme selection, animation settings, sound options, and wallpaper customization. Settings persist across sessions.

**System Info**
Display comprehensive system information including hostname, operating system, architecture, CPU details, memory usage, and uptime statistics.

**Processes**
View and manage running system processes with real-time updates. Displays process ID, CPU usage, memory consumption, and command information.

**Network**
Monitor network interfaces and active connections. Shows interface status, IP addresses, and network statistics.

**System Updater**
Check for and install ASHIGARU updates from GitHub releases. Features automatic backup creation, safe installation with rollback capability, and progress tracking. Updates preserve user configuration and API keys.

### Utility Programs

**Terminal**
Interactive shell terminal with full command execution capabilities. Supports standard shell commands and process management.

**File Browser**
Navigate the filesystem with keyboard-driven interface. View directory contents, file permissions, sizes, and modification dates.

**Editor**
Vim-like code editor with syntax highlighting support. Features multiple editing modes, file operations, and syntax highlighting for various programming languages.

**NeoRin AI**
AI-powered assistant using Google Gemini. Provides conversational AI capabilities with session management and context retention. Features a specialized system prompt for technical and strategic analysis.

**Browser**
Text-based web browser for viewing web content in the terminal. Supports basic HTML rendering and navigation.

**Clock**
Digital clock and timer utility with customizable display options.

**Notes**
Quick note-taking application with persistent storage. Create, edit, and manage text notes.

## Development

### Project Structure

The codebase is organized into clear functional modules:

**Source Directory (`src/`)**
- `components/` - Reusable UI components (Button, Panel, Input, Desktop, MenuBar, StatusBar)
- `core/` - Core application logic (App, Shell, WindowManager, ProgramLoader, SettingsContext)
- `core/ai/` - AI integration layer with provider architecture
- `theme/` - Theme definitions, color schemes, and border styles
- `types/` - TypeScript type definitions and interfaces
- `index.tsx` - Application entry point

**Programs Directory (`programs/`)**
- `system/` - System-level programs (settings, updater, processes, network, system-info)
- `utility/` - User-facing utility programs (terminal, editor, browser, notes, clock, file-browser, neorin-ai)

**Build Output (`dist/`)**
Generated directory containing compiled JavaScript. This directory is created by the TypeScript compiler and should not be edited directly.

**Assets**
- `wallpapers/` - ASCII art wallpapers for desktop backgrounds

### Creating Custom Programs

Programs are modular JavaScript/TypeScript components that integrate with the ASHIGARU environment.

#### Program Structure

Each program requires two files:
1. `manifest.json` - Program metadata and configuration
2. `index.js` - Program implementation (React component)

#### Manifest Format

```json
{
  "id": "program-id",
  "name": "Display Name",
  "version": "1.0.0",
  "description": "Program description",
  "author": "Author Name",
  "icon": "X",
  "category": "utility",
  "entry": "index.js"
}
```

#### Program Props

Programs receive the following props from the WindowManager:

- `isFocused` (boolean) - Whether the program window has focus
- `onClose` (function) - Callback to close the program
- `onFocus` (function) - Callback to request focus
- `manifest` (object) - Program's manifest data
- `lockInput` (function) - Lock system input for exclusive use
- `unlockInput` (function) - Release input lock
- `settings` (object) - Global settings object
- `setTheme` (function) - Update global theme
- `setWallpaper` (function) - Change wallpaper
- `updateSettings` (function) - Update any settings
- `availableWallpapers` (array) - List of available wallpapers
- `getWallpaperContent` (function) - Retrieve wallpaper content

### Dependencies

#### Core Dependencies
- React 19.2.3 - UI component framework
- Ink 6.6.0 - React renderer for terminal interfaces
- TypeScript 5.7.2 - Type-safe JavaScript superset

#### UI Components
- @inkjs/ui 2.0.0 - Enhanced Ink components
- ink-select-input 6.2.0 - Selection menus
- ink-text-input 6.0.0 - Text input fields
- ink-spinner 5.0.0 - Loading indicators
- ink-table 3.1.0 - Table displays
- ink-markdown 1.0.4 - Markdown rendering
- ink-syntax-highlight 2.0.2 - Code syntax highlighting
- ink-divider 4.1.1 - Visual dividers
- ink-scroll-view 0.3.3 - Scrollable containers

#### AI Integration
- @ai-sdk/google 3.0.1 - Google AI provider
- ai 6.0.3 - AI SDK core

#### Utilities
- dotenv 17.2.3 - Environment variable management
- zod 4.2.1 - Schema validation

## Updating

ASHIGARU includes a built-in update system that simplifies version management.

### Using the System Updater

1. Launch ASHIGARU and open the System Updater from the system programs menu
2. The updater automatically checks GitHub releases for newer versions
3. If an update is available, review the release notes and press Enter to install
4. The updater creates a backup, downloads the new version, installs dependencies, and rebuilds the application
5. Restart ASHIGARU to use the new version

### Update Process

The updater performs the following steps automatically:
1. Checks current version against latest GitHub release
2. Downloads release tarball from GitHub
3. Creates timestamped backup in `~/.ashigaru-backups/`
4. Extracts new version while preserving `.env` configuration
5. Runs `npm install --legacy-peer-deps` to install dependencies
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
Warm amber and orange tones reminiscent of vintage CRT monitors. Provides comfortable viewing with reduced blue light.

### Theme Configuration

Themes can be changed through the Settings program or by editing the settings file directly at `~/.cypher-tui-settings.json`.

## Architecture

### Component Hierarchy

ASHIGARU uses a hierarchical component architecture:

1. **App** - Root component managing global state and settings
2. **Shell** - Desktop environment controller
3. **WindowManager** - Manages program windows and focus
4. **Desktop** - Renders wallpaper and window containers
5. **Programs** - Individual program instances

### State Management

Application state is managed through React Context:
- `SettingsContext` - Global settings and theme configuration
- `AIContext` - AI provider management and session state

Settings persist to `~/.cypher-tui-settings.json` and are loaded on startup.

### Program Loading

The `ProgramLoader` scans the `programs/` directory at startup, reads manifest files, and dynamically imports program modules. Programs are loaded on-demand when launched by the user.

## Contributing

Contributions to ASHIGARU are welcome. When contributing, please:

1. Fork the repository
2. Create a feature branch from `main`
3. Make changes with clear, descriptive commits
4. Ensure TypeScript compilation succeeds without errors
5. Test changes in both development and production modes
6. Submit a pull request with a clear description of changes

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions, please use the GitHub issue tracker at [github.com/savannah-i-g/ASHIGARU/issues](https://github.com/savannah-i-g/ASHIGARU/issues).
