# ASHIGARU

A modular Terminal User Interface (TUI) framework built with React and Ink.

## Features

- Modern TUI framework built with React and Ink
- Modular architecture for easy extensibility
- AI integration support (Google Gemini)
- TypeScript support

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd TUI_Test
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:
- `GOOGLE_GENERATIVE_AI_API_KEY`: Get your key at https://aistudio.google.com/app/apikey

## Usage

### Development Mode

Run the application with hot reload:
```bash
npm run dev
```

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Run the compiled application:
```bash
npm start
```

## Project Structure

```
.
├── src/
│   ├── components/     # UI components
│   ├── core/          # Core functionality and AI providers
│   ├── theme/         # Theme configuration (colors, borders)
│   ├── types/         # TypeScript type definitions
│   └── index.tsx      # Application entry point
├── programs/          # Program modules
├── dist/             # Compiled output (generated)
└── wallpapers/       # Visual assets
```

## Technologies

- **React** - UI component framework
- **Ink** - React renderer for CLIs
- **TypeScript** - Type-safe JavaScript
- **AI SDK** - AI integration (@ai-sdk/google)
- Various Ink UI components for enhanced terminal interfaces

## License

MIT
