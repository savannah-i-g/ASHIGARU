# ASHIGARU Multilingual API System - Implementation Plan

**Version:** 1.0
**Date:** 2026-01-02
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to enable ASHIGARU programs to be written in languages other than JavaScript/TypeScript, without requiring changes to the core runtime or packaged libraries. The solution uses a **language-agnostic bridge architecture** that communicates with external processes via standard input/output streams using a JSON-based protocol.

### Key Design Principles

1. **Zero Runtime Changes** - No modifications to existing ASHIGARU core, packaged libraries, or Node.js runtime
2. **Language Independence** - Support any language that can read/write JSON over stdin/stdout
3. **No Additional Dependencies** - External language programs are self-contained executables
4. **Transparent Integration** - External programs appear identical to native programs in the launcher and window manager
5. **Full API Compatibility** - Complete access to all ASHIGARU APIs (system, storage, notifications, IPC, windows, sound, AI)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Communication Protocol](#communication-protocol)
3. [Bridge Adapter System](#bridge-adapter-system)
4. [Program Structure](#program-structure)
5. [API Mapping](#api-mapping)
6. [Process Lifecycle Management](#process-lifecycle-management)
7. [Data Serialization & Type Safety](#data-serialization--type-safety)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Language SDK Specifications](#language-sdk-specifications)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)
12. [Performance Considerations](#performance-considerations)
13. [Security Considerations](#security-considerations)
14. [Example Implementations](#example-implementations)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    ASHIGARU Core                        │
│                  (Node.js/React/Ink)                    │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│  │  Native    │  │  Bridge    │  │   External     │   │
│  │  Programs  │  │  Adapter   │  │   Process      │   │
│  │  (JS/TS)   │  │  (JS)      │◄─┤   Manager      │   │
│  └────────────┘  └────────────┘  └────────────────┘   │
│                        ▲                  │            │
│                        │                  │            │
│                        │ JSON Protocol    │            │
│                        │ (stdin/stdout)   │            │
│                        │                  ▼            │
└────────────────────────┼─────────────────────────────────┘
                         │
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼─────┐                   ┌────▼─────┐
    │  Python  │                   │   Rust   │
    │  Program │                   │  Program │
    │ (Binary) │                   │ (Binary) │
    └──────────┘                   └──────────┘
```

### Component Responsibilities

#### 1. **Bridge Adapter** (New Component)
- JavaScript/TypeScript component that implements the `ProgramProps` interface
- Spawns and manages external language process
- Translates React component lifecycle to protocol messages
- Handles bidirectional JSON communication over stdin/stdout
- Maintains rendering state and buffer management
- Routes API calls to external process and handles responses

#### 2. **External Process Manager** (New Component)
- Manages lifecycle of spawned external processes
- Monitors process health and handles crashes
- Implements process pooling and cleanup
- Handles orphaned process detection
- Resource usage tracking per language program

#### 3. **Protocol Handler** (New Component)
- Defines JSON-based message protocol
- Validates incoming/outgoing messages
- Handles message serialization/deserialization
- Implements protocol versioning
- Error detection and recovery

#### 4. **Language SDKs** (Per Language)
- Self-contained library for each supported language
- Implements protocol client
- Provides idiomatic API wrappers
- Handles rendering buffer management
- No external dependencies beyond language standard library

---

## Communication Protocol

### Protocol Specification v1.0

The protocol uses **line-delimited JSON** over stdin/stdout. Each message is a single JSON object terminated by a newline character.

#### Message Structure

```typescript
interface ProtocolMessage {
    id: string;              // Unique message ID for request/response matching
    type: MessageType;       // Message type discriminator
    payload: unknown;        // Type-specific payload
    timestamp: number;       // Unix timestamp (milliseconds)
    correlationId?: string;  // For linking request/response pairs
}

type MessageType =
    | 'lifecycle'   // Lifecycle events (init, focus, close, etc.)
    | 'api_call'    // API method invocation
    | 'api_response'// API method response
    | 'render'      // Render update from external process
    | 'input'       // Keyboard/mouse input events
    | 'error';      // Error notifications
```

### Lifecycle Messages

#### 1. **Initialize** (ASHIGARU → External Process)

Sent when the program window is created.

```json
{
    "id": "msg-001",
    "type": "lifecycle",
    "timestamp": 1704067200000,
    "payload": {
        "action": "init",
        "props": {
            "isFocused": false,
            "manifest": {
                "id": "my-program",
                "name": "My Program",
                "version": "1.0.0",
                "description": "A Python program",
                "icon": "🐍",
                "category": "utility",
                "entry": "program.py"
            },
            "windowId": "window-5",
            "savedState": null,
            "settings": {
                "theme": "Cyberpunk",
                "animations": true,
                "sounds": true,
                "wallpaper": "CYPHER.txt",
                "wallpaperColor": "#00ffff"
            }
        }
    }
}
```

#### 2. **Focus Change** (ASHIGARU → External Process)

```json
{
    "id": "msg-002",
    "type": "lifecycle",
    "timestamp": 1704067201000,
    "payload": {
        "action": "focus",
        "isFocused": true
    }
}
```

#### 3. **Input Event** (ASHIGARU → External Process)

```json
{
    "id": "msg-003",
    "type": "input",
    "timestamp": 1704067202000,
    "payload": {
        "input": "a",
        "key": {
            "upArrow": false,
            "downArrow": false,
            "leftArrow": false,
            "rightArrow": false,
            "return": false,
            "escape": false,
            "ctrl": false,
            "shift": false,
            "tab": false,
            "backspace": false,
            "delete": false
        }
    }
}
```

#### 4. **Render Request** (External Process → ASHIGARU)

The external process sends rendering instructions as a virtual DOM structure.

```json
{
    "id": "msg-004",
    "type": "render",
    "timestamp": 1704067203000,
    "payload": {
        "tree": {
            "type": "Box",
            "props": {
                "flexDirection": "column",
                "borderStyle": "single",
                "borderColor": "#00ffff"
            },
            "children": [
                {
                    "type": "Text",
                    "props": {
                        "color": "#ffffff",
                        "bold": true
                    },
                    "children": ["Hello from Python!"]
                },
                {
                    "type": "Text",
                    "props": {},
                    "children": ["Press ESC to close"]
                }
            ]
        }
    }
}
```

#### 5. **Close Request** (ASHIGARU → External Process)

```json
{
    "id": "msg-005",
    "type": "lifecycle",
    "timestamp": 1704067204000,
    "payload": {
        "action": "close"
    }
}
```

### API Call Messages

#### 1. **API Call** (External Process → ASHIGARU)

```json
{
    "id": "msg-006",
    "type": "api_call",
    "timestamp": 1704067205000,
    "correlationId": "api-001",
    "payload": {
        "module": "storage",
        "method": "get",
        "args": ["user-preferences"]
    }
}
```

#### 2. **API Response** (ASHIGARU → External Process)

```json
{
    "id": "msg-007",
    "type": "api_response",
    "timestamp": 1704067206000,
    "correlationId": "api-001",
    "payload": {
        "success": true,
        "result": {
            "theme": "dark",
            "fontSize": 14
        },
        "error": null
    }
}
```

#### 3. **API Error Response**

```json
{
    "id": "msg-008",
    "type": "api_response",
    "timestamp": 1704067207000,
    "correlationId": "api-002",
    "payload": {
        "success": false,
        "result": null,
        "error": {
            "code": "STORAGE_ERROR",
            "message": "Failed to read key 'invalid-key'",
            "details": {}
        }
    }
}
```

### Error Messages

```json
{
    "id": "msg-009",
    "type": "error",
    "timestamp": 1704067208000,
    "payload": {
        "code": "PROTOCOL_ERROR",
        "message": "Invalid message format",
        "severity": "fatal",
        "recoverable": false
    }
}
```

### Protocol Rules

1. **Line Delimited** - Each message MUST be a single line terminated by `\n`
2. **JSON Valid** - Each line MUST be valid JSON
3. **Message IDs** - Must be unique within the session
4. **Correlation IDs** - API requests MUST include correlationId for matching responses
5. **Ordering** - Messages are processed in order received
6. **Timeout** - API calls timeout after 30 seconds by default
7. **Backpressure** - If process stdout buffer is full, messages are queued

---

## Bridge Adapter System

### Bridge Adapter Implementation

The Bridge Adapter is a JavaScript component that acts as a proxy between ASHIGARU's window manager and external language processes.

#### File Structure

```
programs/
└── _bridge/
    ├── manifest.json          # Special manifest for bridge programs
    ├── BridgeAdapter.js       # Main bridge component
    ├── ProtocolHandler.js     # Protocol message handling
    ├── ProcessManager.js      # Process lifecycle management
    ├── RenderEngine.js        # Virtual DOM to React translation
    └── APIRouter.js           # API call routing
```

#### BridgeAdapter.js

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { ProtocolHandler } from './ProtocolHandler.js';
import { ProcessManager } from './ProcessManager.js';
import { RenderEngine } from './RenderEngine.js';

/**
 * Bridge Adapter - Proxies between ASHIGARU and external language programs
 */
const BridgeAdapter = (props) => {
    const { manifest, isFocused, onClose, api, windowId, savedState } = props;

    // External process state
    const [processReady, setProcessReady] = useState(false);
    const [renderTree, setRenderTree] = useState(null);
    const [error, setError] = useState(null);

    // Refs
    const processRef = useRef(null);
    const protocolRef = useRef(null);
    const pendingCalls = useRef(new Map());

    // Initialize external process
    useEffect(() => {
        const initProcess = async () => {
            try {
                // Spawn external process
                const process = await ProcessManager.spawn(
                    manifest._externalConfig.executable,
                    manifest._externalConfig.args || []
                );

                processRef.current = process;

                // Initialize protocol handler
                const protocol = new ProtocolHandler(process.stdin, process.stdout);
                protocolRef.current = protocol;

                // Set up message handlers
                protocol.on('render', handleRender);
                protocol.on('api_call', handleAPICall);
                protocol.on('error', handleError);

                // Send initial lifecycle event
                await protocol.send({
                    type: 'lifecycle',
                    payload: {
                        action: 'init',
                        props: {
                            isFocused,
                            manifest,
                            windowId,
                            savedState,
                            settings: props.settings
                        }
                    }
                });

                setProcessReady(true);
            } catch (err) {
                setError(`Failed to initialize process: ${err.message}`);
            }
        };

        initProcess();

        // Cleanup
        return () => {
            if (processRef.current) {
                ProcessManager.kill(processRef.current);
            }
        };
    }, []);

    // Handle focus changes
    useEffect(() => {
        if (processReady && protocolRef.current) {
            protocolRef.current.send({
                type: 'lifecycle',
                payload: {
                    action: 'focus',
                    isFocused
                }
            });
        }
    }, [isFocused, processReady]);

    // Handle input
    useInput((input, key) => {
        if (!isFocused || !processReady) return;

        protocolRef.current.send({
            type: 'input',
            payload: { input, key }
        });
    }, { isActive: isFocused });

    // Handle render updates from external process
    const handleRender = (message) => {
        setRenderTree(message.payload.tree);
    };

    // Handle API calls from external process
    const handleAPICall = async (message) => {
        const { module, method, args } = message.payload;
        const correlationId = message.correlationId;

        try {
            // Route API call
            let result;

            if (module === 'storage') {
                result = await api.storage[method](...args);
            } else if (module === 'notifications') {
                result = api.notifications[method](...args);
            } else if (module === 'sound') {
                result = api.sound[method](...args);
            } else if (module === 'system') {
                result = api.system[method](...args);
            } else if (module === 'windows') {
                result = api.windows[method](...args);
            } else if (module === 'ai') {
                result = await api.ai[method](...args);
            } else if (module === 'ipc') {
                result = await api.ipc[method](...args);
            }

            // Send response
            await protocolRef.current.send({
                type: 'api_response',
                correlationId,
                payload: {
                    success: true,
                    result,
                    error: null
                }
            });
        } catch (err) {
            // Send error response
            await protocolRef.current.send({
                type: 'api_response',
                correlationId,
                payload: {
                    success: false,
                    result: null,
                    error: {
                        code: 'API_ERROR',
                        message: err.message,
                        details: {}
                    }
                }
            });
        }
    };

    // Handle errors from external process
    const handleError = (message) => {
        setError(message.payload.message);
        if (!message.payload.recoverable) {
            onClose();
        }
    };

    // Render error state
    if (error) {
        return (
            <Box borderStyle="single" borderColor="red" flexDirection="column">
                <Text color="red" bold>External Process Error</Text>
                <Text>{error}</Text>
                <Text dimColor>Press ESC to close</Text>
            </Box>
        );
    }

    // Render loading state
    if (!processReady || !renderTree) {
        return (
            <Box borderStyle="single" flexDirection="column">
                <Text>Loading external program...</Text>
            </Box>
        );
    }

    // Render external program's virtual DOM
    return <RenderEngine tree={renderTree} />;
};

export default BridgeAdapter;
```

#### RenderEngine.js

Translates virtual DOM from external process to React/Ink components.

```javascript
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

/**
 * Supported Ink components
 */
const COMPONENT_MAP = {
    Box,
    Text,
    TextInput,
    SelectInput,
    Spinner
};

/**
 * Render Engine - Converts virtual DOM to React elements
 */
export class RenderEngine {
    static render(tree) {
        if (!tree) return null;

        if (typeof tree === 'string') {
            return tree;
        }

        if (Array.isArray(tree)) {
            return tree.map((child, i) =>
                <React.Fragment key={i}>
                    {RenderEngine.render(child)}
                </React.Fragment>
            );
        }

        const { type, props = {}, children = [] } = tree;

        // Get component from map
        const Component = COMPONENT_MAP[type];
        if (!Component) {
            console.warn(`Unknown component type: ${type}`);
            return null;
        }

        // Render children recursively
        const renderedChildren = children.map((child, i) =>
            RenderEngine.render(child)
        );

        return React.createElement(
            Component,
            { ...props, key: props.key || Math.random() },
            ...renderedChildren
        );
    }
}

// Component wrapper
const RenderEngineComponent = ({ tree }) => {
    return RenderEngine.render(tree);
};

export default RenderEngineComponent;
```

---

## Program Structure

### Manifest Extensions for External Programs

External language programs use an extended manifest format:

```json
{
    "id": "python-example",
    "name": "Python Example",
    "version": "1.0.0",
    "description": "Example program written in Python",
    "author": "Developer",
    "icon": "🐍",
    "category": "utility",
    "entry": "bridge",
    "_external": {
        "language": "python",
        "executable": "./program",
        "args": [],
        "permissions": ["storage", "notifications", "sound"]
    }
}
```

#### New Fields

- `entry`: Set to `"bridge"` to indicate this uses the bridge adapter
- `_external`: Configuration for external process
  - `language`: Language identifier (for documentation)
  - `executable`: Path to executable binary (relative to program directory)
  - `args`: Optional command-line arguments
  - `permissions`: Array of API modules this program can access

### Directory Structure

```
programs/
└── utility/
    └── python-example/
        ├── manifest.json       # Extended manifest
        ├── program             # Compiled Python binary (PyInstaller)
        ├── src/                # Source code (optional, for reference)
        │   ├── main.py
        │   └── ashigaru_sdk.py
        └── README.md
```

### Compilation & Distribution

External programs MUST be distributed as **self-contained executables**:

1. **Python**: Use PyInstaller to create standalone binary
2. **Rust**: Compile with `cargo build --release` (static linking)
3. **Go**: Compile with `go build` (static binary)
4. **C/C++**: Static compilation with all dependencies included

This ensures **no installation or setup required** - the binary contains everything needed.

---

## API Mapping

### Complete API Surface

All ASHIGARU APIs are accessible via the protocol:

#### 1. System API

```json
// Get system stats
{
    "type": "api_call",
    "correlationId": "sys-001",
    "payload": {
        "module": "system",
        "method": "getStats",
        "args": []
    }
}

// Response
{
    "type": "api_response",
    "correlationId": "sys-001",
    "payload": {
        "success": true,
        "result": {
            "hostname": "my-machine",
            "platform": "linux",
            "uptime": 86400,
            "memoryPercent": 45
        }
    }
}
```

#### 2. Storage API

```json
// Set value
{
    "type": "api_call",
    "correlationId": "store-001",
    "payload": {
        "module": "storage",
        "method": "set",
        "args": ["preferences", {"theme": "dark"}]
    }
}

// Get value
{
    "type": "api_call",
    "correlationId": "store-002",
    "payload": {
        "module": "storage",
        "method": "get",
        "args": ["preferences"]
    }
}
```

#### 3. Notifications API

```json
{
    "type": "api_call",
    "correlationId": "notif-001",
    "payload": {
        "module": "notifications",
        "method": "success",
        "args": ["Operation completed!", "My App"]
    }
}
```

#### 4. Sound API

```json
{
    "type": "api_call",
    "correlationId": "sound-001",
    "payload": {
        "module": "sound",
        "method": "click",
        "args": []
    }
}
```

#### 5. Windows API

```json
{
    "type": "api_call",
    "correlationId": "win-001",
    "payload": {
        "module": "windows",
        "method": "list",
        "args": []
    }
}
```

#### 6. AI API

```json
{
    "type": "api_call",
    "correlationId": "ai-001",
    "payload": {
        "module": "ai",
        "method": "ask",
        "args": ["What is the capital of France?"]
    }
}
```

#### 7. IPC API

```json
// Publish
{
    "type": "api_call",
    "correlationId": "ipc-001",
    "payload": {
        "module": "ipc",
        "method": "publish",
        "args": ["my-channel", "event-type", {"data": "value"}]
    }
}

// Subscribe (special handling needed)
{
    "type": "api_call",
    "correlationId": "ipc-002",
    "payload": {
        "module": "ipc",
        "method": "subscribe",
        "args": ["my-channel"]
    }
}

// Subscription messages forwarded automatically
{
    "type": "ipc_message",
    "payload": {
        "channel": "my-channel",
        "type": "event-type",
        "payload": {"data": "value"},
        "sender": "window-3"
    }
}
```

---

## Process Lifecycle Management

### Process Manager Responsibilities

#### 1. **Process Spawning**

```javascript
class ProcessManager {
    static async spawn(executable, args) {
        const process = spawn(executable, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(executable)
        });

        // Track process
        this.processes.set(process.pid, {
            process,
            startTime: Date.now(),
            restarts: 0
        });

        // Monitor health
        this.monitorHealth(process);

        return process;
    }
}
```

#### 2. **Health Monitoring**

- **Heartbeat**: External process must send heartbeat every 30 seconds
- **Memory Tracking**: Monitor RSS and heap usage
- **CPU Tracking**: Monitor CPU usage
- **Crash Detection**: Detect unexpected exits
- **Restart Policy**: Automatic restart with exponential backoff (max 3 attempts)

#### 3. **Graceful Shutdown**

```javascript
static async kill(process, timeout = 5000) {
    // Send close lifecycle event
    await protocol.send({
        type: 'lifecycle',
        payload: { action: 'close' }
    });

    // Wait for graceful exit
    const exited = await this.waitForExit(process, timeout);

    if (!exited) {
        // Force kill
        process.kill('SIGKILL');
    }

    // Cleanup
    this.processes.delete(process.pid);
}
```

#### 4. **Orphan Detection**

- Track parent process ID
- Detect if ASHIGARU exits unexpectedly
- External process should exit if stdin is closed

#### 5. **Resource Limits**

```javascript
const RESOURCE_LIMITS = {
    maxMemoryMB: 512,      // Max memory per process
    maxCPUPercent: 50,     // Max CPU usage
    maxRestarts: 3,        // Max restart attempts
    heartbeatInterval: 30000  // Heartbeat frequency
};
```

---

## Data Serialization & Type Safety

### Serialization Rules

#### 1. **Supported Types**

- **Primitives**: `string`, `number`, `boolean`, `null`
- **Collections**: `array`, `object` (plain objects only)
- **Dates**: Serialized as ISO 8601 strings
- **Binary Data**: Base64 encoded strings
- **Functions**: **NOT SUPPORTED** (cannot be serialized)
- **Circular References**: **NOT SUPPORTED** (will cause errors)

#### 2. **Type Conversions**

| JavaScript Type | JSON Type | Notes |
|----------------|-----------|-------|
| `string` | `string` | Direct mapping |
| `number` | `number` | Includes NaN, Infinity as `null` |
| `boolean` | `boolean` | Direct mapping |
| `null` | `null` | Direct mapping |
| `undefined` | `null` | Converted to null |
| `Array` | `array` | Recursive serialization |
| `Object` | `object` | Plain objects only |
| `Date` | `string` | ISO 8601 format |
| `Buffer` | `string` | Base64 encoded |
| `Function` | **ERROR** | Cannot serialize |
| `Symbol` | **ERROR** | Cannot serialize |

#### 3. **Edge Cases**

**NaN and Infinity**:
```json
// JavaScript: NaN, Infinity, -Infinity
// JSON: null
{
    "value": null,
    "_special": "NaN"  // Metadata for reconstruction
}
```

**Circular References**:
```javascript
// Detect and reject
const seen = new WeakSet();
function serialize(obj) {
    if (seen.has(obj)) {
        throw new Error('Circular reference detected');
    }
    seen.add(obj);
    // ... serialize
}
```

**Large Arrays**:
```javascript
// Chunk large arrays to prevent memory issues
const MAX_ARRAY_SIZE = 10000;
if (array.length > MAX_ARRAY_SIZE) {
    // Send in chunks
}
```

**Unicode Handling**:
```javascript
// Ensure UTF-8 encoding
process.stdin.setEncoding('utf8');
process.stdout.setDefaultEncoding('utf8');
```

---

## Error Handling & Edge Cases

### Error Categories

#### 1. **Protocol Errors**

- **Invalid JSON**: Malformed JSON in message
- **Unknown Message Type**: Unsupported message type
- **Missing Fields**: Required fields missing
- **Version Mismatch**: Protocol version incompatible

**Handling**:
```json
{
    "type": "error",
    "payload": {
        "code": "PROTOCOL_ERROR",
        "message": "Invalid JSON: Unexpected token",
        "severity": "fatal",
        "recoverable": false
    }
}
```

#### 2. **Process Errors**

- **Spawn Failure**: Executable not found or not executable
- **Crash**: Process exits unexpectedly
- **Timeout**: No response to message
- **Hang**: Process stops responding

**Handling**:
- Display error message in window
- Attempt restart (up to 3 times)
- Log error details for debugging
- Provide fallback UI

#### 3. **API Errors**

- **Method Not Found**: Invalid API method
- **Invalid Arguments**: Wrong argument types
- **Permission Denied**: API module not in permissions
- **Operation Failed**: API operation failed

**Handling**:
```json
{
    "type": "api_response",
    "correlationId": "api-001",
    "payload": {
        "success": false,
        "result": null,
        "error": {
            "code": "METHOD_NOT_FOUND",
            "message": "Method 'invalidMethod' does not exist on module 'storage'",
            "details": {
                "module": "storage",
                "method": "invalidMethod"
            }
        }
    }
}
```

#### 4. **Render Errors**

- **Unknown Component**: Component type not supported
- **Invalid Props**: Component props invalid
- **Malformed Tree**: Virtual DOM structure invalid

**Handling**:
- Render error message in place of component
- Continue rendering remaining components
- Log warning for debugging

### Edge Case Handling

#### 1. **Concurrent API Calls**

```javascript
// Track pending calls with correlation IDs
const pendingCalls = new Map();

async function apiCall(module, method, args) {
    const correlationId = generateId();
    const promise = new Promise((resolve, reject) => {
        pendingCalls.set(correlationId, { resolve, reject });

        // Timeout
        setTimeout(() => {
            if (pendingCalls.has(correlationId)) {
                pendingCalls.delete(correlationId);
                reject(new Error('API call timeout'));
            }
        }, 30000);
    });

    // Send request
    await send({ type: 'api_call', correlationId, payload: { module, method, args } });

    return promise;
}

// On response
function handleAPIResponse(message) {
    const { correlationId, payload } = message;
    const pending = pendingCalls.get(correlationId);

    if (pending) {
        if (payload.success) {
            pending.resolve(payload.result);
        } else {
            pending.reject(new Error(payload.error.message));
        }
        pendingCalls.delete(correlationId);
    }
}
```

#### 2. **State Persistence**

External programs can use the `savedState` prop:

```json
// Initial state
{
    "type": "lifecycle",
    "payload": {
        "action": "init",
        "props": {
            "savedState": {
                "count": 42,
                "lastSaved": "2026-01-02T12:00:00Z"
            }
        }
    }
}

// Save state
{
    "type": "api_call",
    "correlationId": "state-001",
    "payload": {
        "module": "_internal",
        "method": "saveState",
        "args": [{"count": 43}]
    }
}
```

#### 3. **Input Locking**

```json
// Lock input
{
    "type": "api_call",
    "correlationId": "lock-001",
    "payload": {
        "module": "_internal",
        "method": "lockInput",
        "args": []
    }
}

// Unlock input
{
    "type": "api_call",
    "correlationId": "lock-002",
    "payload": {
        "module": "_internal",
        "method": "unlockInput",
        "args": []
    }
}
```

#### 4. **Terminal Resize**

```json
{
    "type": "lifecycle",
    "payload": {
        "action": "resize",
        "width": 120,
        "height": 40
    }
}
```

#### 5. **Memory Management**

- **Render Buffer Limit**: Max 1000 render updates per second
- **Message Queue Limit**: Max 10000 queued messages
- **Backpressure**: Pause sending if queue is full

---

## Language SDK Specifications

### SDK Requirements

Each language SDK must provide:

1. **Protocol Client**: Handle stdin/stdout communication
2. **Message Serialization**: JSON encoding/decoding
3. **API Wrappers**: Idiomatic interfaces for all ASHIGARU APIs
4. **Rendering DSL**: Build virtual DOM trees
5. **Event Handlers**: Process lifecycle and input events
6. **Type Safety**: Type definitions for all APIs (where supported)

### SDK Structure (Reference: Python)

```python
# ashigaru_sdk/__init__.py

from .program import Program
from .api import API
from .components import Box, Text, TextInput
from .types import Props, InputEvent, KeyPress

__all__ = [
    'Program',
    'API',
    'Box',
    'Text',
    'TextInput',
    'Props',
    'InputEvent',
    'KeyPress'
]
```

#### Core Program Class

```python
# ashigaru_sdk/program.py

import sys
import json
from typing import Any, Optional, Callable
from .protocol import ProtocolClient
from .api import API
from .components import Component

class Program:
    """Base class for ASHIGARU programs"""

    def __init__(self):
        self.protocol = ProtocolClient(sys.stdin, sys.stdout)
        self.api: Optional[API] = None
        self.props: Optional[Props] = None
        self.is_focused = False
        self._render_callback: Optional[Callable] = None

    def run(self):
        """Main program loop"""
        # Set up protocol handlers
        self.protocol.on('lifecycle', self._handle_lifecycle)
        self.protocol.on('input', self._handle_input)

        # Start protocol
        self.protocol.start()

    def _handle_lifecycle(self, message):
        action = message['payload']['action']

        if action == 'init':
            props_data = message['payload']['props']
            self.props = Props.from_dict(props_data)
            self.api = API(self.protocol, self.props.window_id)
            self.on_init(self.props)
            self.render()

        elif action == 'focus':
            self.is_focused = message['payload']['isFocused']
            self.on_focus(self.is_focused)
            self.render()

        elif action == 'close':
            self.on_close()
            sys.exit(0)

        elif action == 'resize':
            width = message['payload']['width']
            height = message['payload']['height']
            self.on_resize(width, height)
            self.render()

    def _handle_input(self, message):
        event = InputEvent.from_dict(message['payload'])
        self.on_input(event)

    def render(self):
        """Trigger re-render"""
        tree = self.build()
        if tree:
            self.protocol.send_render(tree.to_dict())

    # Lifecycle hooks (override in subclass)
    def on_init(self, props: Props):
        """Called when program initializes"""
        pass

    def on_focus(self, is_focused: bool):
        """Called when focus changes"""
        pass

    def on_input(self, event: InputEvent):
        """Called on keyboard input"""
        pass

    def on_close(self):
        """Called before program closes"""
        pass

    def on_resize(self, width: int, height: int):
        """Called when terminal resizes"""
        pass

    def build(self) -> Component:
        """Build the UI (override in subclass)"""
        raise NotImplementedError("Must implement build() method")
```

#### API Wrapper

```python
# ashigaru_sdk/api.py

from typing import Any, Dict, List, Optional
from .protocol import ProtocolClient

class StorageAPI:
    def __init__(self, protocol: ProtocolClient):
        self._protocol = protocol

    async def get(self, key: str) -> Optional[Any]:
        return await self._protocol.api_call('storage', 'get', [key])

    async def set(self, key: str, value: Any) -> None:
        await self._protocol.api_call('storage', 'set', [key, value])

    async def delete(self, key: str) -> None:
        await self._protocol.api_call('storage', 'delete', [key])

    async def list(self) -> List[str]:
        return await self._protocol.api_call('storage', 'list', [])

    async def clear(self) -> None:
        await self._protocol.api_call('storage', 'clear', [])

class NotificationsAPI:
    def __init__(self, protocol: ProtocolClient):
        self._protocol = protocol

    def success(self, message: str, title: Optional[str] = None):
        self._protocol.api_call('notifications', 'success', [message, title], wait=False)

    def error(self, message: str, title: Optional[str] = None):
        self._protocol.api_call('notifications', 'error', [message, title], wait=False)

    def warning(self, message: str, title: Optional[str] = None):
        self._protocol.api_call('notifications', 'warning', [message, title], wait=False)

    def info(self, message: str, title: Optional[str] = None):
        self._protocol.api_call('notifications', 'info', [message, title], wait=False)

class SoundAPI:
    def __init__(self, protocol: ProtocolClient):
        self._protocol = protocol

    def click(self):
        self._protocol.api_call('sound', 'click', [], wait=False)

    def success(self):
        self._protocol.api_call('sound', 'success', [], wait=False)

    def error(self):
        self._protocol.api_call('sound', 'error', [], wait=False)

class API:
    """Unified API for ASHIGARU programs"""

    def __init__(self, protocol: ProtocolClient, window_id: str):
        self._protocol = protocol
        self.window_id = window_id

        self.storage = StorageAPI(protocol)
        self.notifications = NotificationsAPI(protocol)
        self.sound = SoundAPI(protocol)
```

#### Component DSL

```python
# ashigaru_sdk/components.py

from typing import List, Optional, Any, Dict

class Component:
    """Base component class"""

    def __init__(self, component_type: str, props: Dict[str, Any] = None, children: List[Any] = None):
        self.type = component_type
        self.props = props or {}
        self.children = children or []

    def to_dict(self) -> Dict:
        return {
            'type': self.type,
            'props': self.props,
            'children': [
                child.to_dict() if isinstance(child, Component) else str(child)
                for child in self.children
            ]
        }

class Box(Component):
    """Box component (layout container)"""

    def __init__(self,
                 flex_direction: str = 'row',
                 border_style: Optional[str] = None,
                 border_color: Optional[str] = None,
                 padding: int = 0,
                 children: List[Any] = None):
        props = {
            'flexDirection': flex_direction
        }
        if border_style:
            props['borderStyle'] = border_style
        if border_color:
            props['borderColor'] = border_color
        if padding:
            props['padding'] = padding

        super().__init__('Box', props, children)

class Text(Component):
    """Text component"""

    def __init__(self,
                 text: str,
                 color: Optional[str] = None,
                 bold: bool = False,
                 italic: bool = False,
                 underline: bool = False,
                 dim_color: bool = False):
        props = {}
        if color:
            props['color'] = color
        if bold:
            props['bold'] = True
        if italic:
            props['italic'] = True
        if underline:
            props['underline'] = True
        if dim_color:
            props['dimColor'] = True

        super().__init__('Text', props, [text])
```

#### Example Program

```python
# program.py (compiled to binary with PyInstaller)

from ashigaru_sdk import Program, Box, Text, Props, InputEvent

class HelloWorld(Program):
    def __init__(self):
        super().__init__()
        self.counter = 0

    def on_init(self, props: Props):
        # Load saved state
        if props.saved_state:
            self.counter = props.saved_state.get('counter', 0)

    def on_input(self, event: InputEvent):
        if not self.is_focused:
            return

        if event.key.escape:
            self.api.storage.set('counter', self.counter)
            self.on_close()
            return

        if event.input == '+':
            self.counter += 1
            self.api.sound.click()
            self.render()

        if event.input == '-':
            self.counter = max(0, self.counter - 1)
            self.api.sound.click()
            self.render()

    def build(self):
        return Box(
            flex_direction='column',
            border_style='single',
            border_color='#00ffff',
            children=[
                Text('Hello from Python!', color='#00ffff', bold=True),
                Text(f'Counter: {self.counter}'),
                Text('Press +/- to change counter', dim_color=True),
                Text('Press ESC to close', dim_color=True)
            ]
        )

if __name__ == '__main__':
    app = HelloWorld()
    app.run()
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**
- [ ] Protocol specification document (v1.0)
- [ ] Bridge adapter core implementation
- [ ] Protocol handler with message validation
- [ ] Process manager with basic lifecycle
- [ ] Virtual DOM renderer for Box and Text components
- [ ] Basic error handling

**Testing:**
- Unit tests for protocol serialization/deserialization
- Integration test with mock external process
- Manual testing with simple echo program

### Phase 2: API Routing (Weeks 3-4)

**Deliverables:**
- [ ] API router for all ASHIGARU APIs
- [ ] API call validation and permissions
- [ ] Async API call handling with timeouts
- [ ] IPC subscription forwarding
- [ ] State persistence support

**Testing:**
- API routing tests for all modules
- Permission enforcement tests
- Concurrent API call stress tests
- State persistence round-trip tests

### Phase 3: Python SDK (Weeks 5-6)

**Deliverables:**
- [ ] Python SDK with full API coverage
- [ ] Component DSL (Box, Text, TextInput, SelectInput, Spinner)
- [ ] Type hints for all APIs
- [ ] Example programs (Hello World, Counter, API Demo)
- [ ] PyInstaller build scripts
- [ ] Documentation

**Testing:**
- SDK unit tests
- Example program integration tests
- Memory leak tests
- Performance benchmarks

### Phase 4: Rust SDK (Weeks 7-8)

**Deliverables:**
- [ ] Rust SDK with full API coverage
- [ ] Macro-based component DSL
- [ ] Type-safe API wrappers
- [ ] Example programs
- [ ] Static compilation scripts
- [ ] Documentation

**Testing:**
- SDK unit tests
- Integration tests
- Memory safety verification
- Performance benchmarks

### Phase 5: Additional Components (Week 9)

**Deliverables:**
- [ ] Extended component support (Divider, Table, Markdown, etc.)
- [ ] Component documentation
- [ ] Component examples

**Testing:**
- Rendering tests for all components
- Props validation tests

### Phase 6: Optimization & Hardening (Week 10)

**Deliverables:**
- [ ] Performance optimization (render batching, message queuing)
- [ ] Memory optimization (buffer limits, GC tuning)
- [ ] Enhanced error recovery (auto-restart, fallback UI)
- [ ] Monitoring and diagnostics
- [ ] Security audit

**Testing:**
- Load testing (100+ concurrent external programs)
- Stress testing (rapid render updates)
- Failure recovery testing
- Security testing

### Phase 7: Documentation & Examples (Week 11)

**Deliverables:**
- [ ] Complete protocol documentation
- [ ] SDK tutorials for Python and Rust
- [ ] Migration guide for converting JS programs
- [ ] Best practices guide
- [ ] Example program gallery

**Testing:**
- Documentation review
- Tutorial walkthrough
- Example program verification

### Phase 8: Release Preparation (Week 12)

**Deliverables:**
- [ ] Release candidate testing
- [ ] Performance baseline
- [ ] Breaking change analysis
- [ ] Migration path documentation
- [ ] Release notes
- [ ] Package Manager integration testing

**Testing:**
- End-to-end testing
- Backward compatibility testing
- Cross-platform testing (Linux, macOS)

---

## Testing Strategy

### Unit Tests

**Protocol Handler:**
```javascript
describe('ProtocolHandler', () => {
    it('should parse valid JSON messages', () => {
        const handler = new ProtocolHandler();
        const message = handler.parse('{"id":"1","type":"render","payload":{}}\n');
        expect(message.id).toBe('1');
        expect(message.type).toBe('render');
    });

    it('should reject invalid JSON', () => {
        const handler = new ProtocolHandler();
        expect(() => handler.parse('invalid json\n')).toThrow();
    });

    it('should handle concurrent messages', async () => {
        // Test correlation ID matching
    });
});
```

**API Router:**
```javascript
describe('APIRouter', () => {
    it('should route storage API calls', async () => {
        const router = new APIRouter(mockAPI);
        const result = await router.route('storage', 'get', ['key']);
        expect(result).toBeDefined();
    });

    it('should enforce permissions', async () => {
        const router = new APIRouter(mockAPI, ['storage']);
        await expect(
            router.route('notifications', 'success', ['test'])
        ).rejects.toThrow('Permission denied');
    });
});
```

### Integration Tests

**Bridge Adapter:**
```javascript
describe('BridgeAdapter Integration', () => {
    it('should spawn and communicate with external process', async () => {
        const adapter = new BridgeAdapter({
            manifest: mockManifest,
            api: mockAPI
        });

        await adapter.initialize();
        expect(adapter.isReady()).toBe(true);

        await adapter.sendInput({ input: 'a', key: {} });
        const rendered = await adapter.waitForRender();
        expect(rendered).toBeDefined();
    });
});
```

**SDK Tests (Python):**
```python
def test_api_call():
    protocol = MockProtocol()
    api = API(protocol, 'window-1')

    result = await api.storage.get('test-key')

    assert protocol.sent_messages[0]['type'] == 'api_call'
    assert protocol.sent_messages[0]['payload']['module'] == 'storage'
    assert protocol.sent_messages[0]['payload']['method'] == 'get'
```

### End-to-End Tests

```javascript
describe('External Program E2E', () => {
    it('should run complete program lifecycle', async () => {
        // 1. Load program
        const program = await loader.load('python-example');

        // 2. Open window
        const window = await windowManager.open(program);

        // 3. Send input
        await window.sendInput({ input: '+', key: {} });

        // 4. Verify render
        await wait(100);
        expect(window.getRenderedContent()).toContain('Counter: 1');

        // 5. Close window
        await window.close();

        // 6. Verify process terminated
        expect(window.isProcessAlive()).toBe(false);
    });
});
```

### Performance Tests

```javascript
describe('Performance', () => {
    it('should handle 60 FPS render updates', async () => {
        const start = Date.now();
        const renderCount = 600; // 10 seconds at 60 FPS

        for (let i = 0; i < renderCount; i++) {
            await adapter.sendRender(mockTree);
            await wait(16); // ~60 FPS
        }

        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(11000); // 10% margin
    });

    it('should handle 100 concurrent programs', async () => {
        const programs = await Promise.all(
            Array(100).fill(0).map(() => windowManager.open(program))
        );

        expect(programs.length).toBe(100);

        // Verify all responsive
        const results = await Promise.all(
            programs.map(p => p.sendInput({ input: 'a', key: {} }))
        );

        expect(results.every(r => r.success)).toBe(true);
    });
});
```

---

## Performance Considerations

### Bottlenecks

1. **JSON Parsing**: Parsing large render trees can be slow
   - **Solution**: Use streaming JSON parser, limit tree depth

2. **Process Spawn Time**: Spawning process adds latency
   - **Solution**: Process pooling, pre-warm processes

3. **IPC Overhead**: stdin/stdout communication slower than in-memory
   - **Solution**: Batch messages, compress large payloads

4. **Render Updates**: Frequent renders cause performance issues
   - **Solution**: Rate limiting, diffing, debouncing

### Optimizations

#### 1. **Message Batching**

```javascript
class ProtocolHandler {
    constructor() {
        this.messageQueue = [];
        this.batchInterval = 16; // 60 FPS

        setInterval(() => this.flushQueue(), this.batchInterval);
    }

    send(message) {
        this.messageQueue.push(message);

        if (this.messageQueue.length >= 10) {
            this.flushQueue();
        }
    }

    flushQueue() {
        if (this.messageQueue.length === 0) return;

        const batch = {
            type: 'batch',
            messages: this.messageQueue
        };

        this.writeToStdout(JSON.stringify(batch) + '\n');
        this.messageQueue = [];
    }
}
```

#### 2. **Virtual DOM Diffing**

Only send changed parts of the tree:

```javascript
class RenderDiffer {
    diff(oldTree, newTree) {
        const patches = [];
        this._diffRecursive(oldTree, newTree, [], patches);
        return patches;
    }

    _diffRecursive(oldNode, newNode, path, patches) {
        if (!oldNode && newNode) {
            patches.push({ type: 'add', path, node: newNode });
        } else if (oldNode && !newNode) {
            patches.push({ type: 'remove', path });
        } else if (this._changed(oldNode, newNode)) {
            patches.push({ type: 'replace', path, node: newNode });
        } else if (oldNode.children && newNode.children) {
            // Diff children
            const maxLen = Math.max(oldNode.children.length, newNode.children.length);
            for (let i = 0; i < maxLen; i++) {
                this._diffRecursive(
                    oldNode.children[i],
                    newNode.children[i],
                    [...path, i],
                    patches
                );
            }
        }
    }
}
```

#### 3. **Process Pooling**

```javascript
class ProcessPool {
    constructor(executable, poolSize = 5) {
        this.executable = executable;
        this.available = [];
        this.inUse = new Map();

        // Pre-spawn processes
        for (let i = 0; i < poolSize; i++) {
            this.available.push(this.spawn());
        }
    }

    async acquire() {
        if (this.available.length > 0) {
            return this.available.pop();
        }
        return this.spawn();
    }

    release(process) {
        this.inUse.delete(process.pid);

        if (this.available.length < this.poolSize) {
            this.available.push(process);
        } else {
            process.kill();
        }
    }
}
```

#### 4. **Compression**

For large payloads, use compression:

```javascript
// Only compress if payload > 1KB
if (JSON.stringify(payload).length > 1024) {
    const compressed = zlib.gzipSync(JSON.stringify(payload));
    message.payload = compressed.toString('base64');
    message._compressed = true;
}
```

### Benchmarks

Target performance metrics:

| Metric | Target | Notes |
|--------|--------|-------|
| Program Startup | < 500ms | Time to first render |
| Input Latency | < 16ms | Input to render update |
| Render FPS | 60 FPS | Sustained render rate |
| Memory per Program | < 50MB | RSS including SDK |
| Max Concurrent Programs | 100 | Without degradation |
| API Call Latency | < 10ms | Round-trip time |
| Message Throughput | 10000/sec | Messages per second |

---

## Security Considerations

### Threat Model

#### 1. **Malicious External Programs**

**Threats:**
- Resource exhaustion (CPU, memory, disk)
- File system access outside program directory
- Network access without permission
- Privilege escalation

**Mitigations:**
- Resource limits (cgroup integration)
- Sandboxing (seccomp, AppArmor, SELinux)
- Permission system for API access
- No shell access, direct binary execution only

#### 2. **Protocol Injection**

**Threats:**
- Inject malicious commands via crafted messages
- Escape JSON encoding
- Exploit parser vulnerabilities

**Mitigations:**
- Strict JSON schema validation
- Input sanitization
- Reject unknown message types
- Version checking

#### 3. **Data Exfiltration**

**Threats:**
- Access other programs' storage
- Read sensitive environment variables
- Intercept IPC messages

**Mitigations:**
- Storage isolation per program ID
- Environment variable whitelist
- IPC permission model
- No access to ASHIGARU internals

### Permission System

```json
{
    "id": "my-program",
    "_external": {
        "permissions": [
            "storage",           // Access to storage API
            "notifications",     // Show notifications
            "sound",             // Play sounds
            "windows",           // Window management
            "ipc:publish",       // Publish IPC messages
            "ipc:subscribe:*",   // Subscribe to IPC channels
            "ai"                 // AI access (if available)
        ]
    }
}
```

**Permission Enforcement:**

```javascript
class APIRouter {
    async route(module, method, args, permissions) {
        // Check permission
        if (!this.hasPermission(module, method, permissions)) {
            throw new Error(`Permission denied: ${module}.${method}`);
        }

        // Route call
        return this.executeAPICall(module, method, args);
    }

    hasPermission(module, method, permissions) {
        // Check exact match
        if (permissions.includes(module)) return true;

        // Check wildcard
        if (permissions.includes(`${module}:${method}`)) return true;

        return false;
    }
}
```

### Resource Limits

```javascript
const LIMITS = {
    maxMemoryMB: 512,          // Max RSS
    maxCPUPercent: 50,         // Max CPU usage
    maxOpenFiles: 100,         // Max file descriptors
    maxProcesses: 1,           // No child processes
    maxDiskWriteMB: 100,       // Max disk writes
    timeoutSeconds: 300,       // Max runtime before auto-kill
    maxMessageSize: 1048576,   // 1MB max message size
    maxMessagesPerSecond: 1000 // Rate limiting
};
```

---

## Example Implementations

### Example 1: Python Counter Program

**File: program.py**

```python
#!/usr/bin/env python3
from ashigaru_sdk import Program, Box, Text, Props, InputEvent

class Counter(Program):
    def __init__(self):
        super().__init__()
        self.count = 0

    def on_init(self, props: Props):
        # Restore saved state
        if props.saved_state and 'count' in props.saved_state:
            self.count = props.saved_state['count']
            self.api.notifications.info(f'Restored count: {self.count}')

    def on_input(self, event: InputEvent):
        if not self.is_focused:
            return

        if event.key.escape:
            # Save state before closing
            self.api.storage.set('count', self.count)
            return

        if event.input == '+':
            self.count += 1
            self.api.sound.click()
            self.render()

        if event.input == '-':
            self.count = max(0, self.count - 1)
            self.api.sound.click()
            self.render()

        if event.input == 'r':
            self.count = 0
            self.api.notifications.warning('Counter reset')
            self.render()

        if event.input == 's':
            self.api.storage.set('count', self.count)
            self.api.notifications.success(f'Saved count: {self.count}')

    def build(self):
        border_color = '#00ffff' if self.is_focused else '#333333'

        return Box(
            flex_direction='column',
            border_style='single',
            border_color=border_color,
            padding=1,
            children=[
                Text('Python Counter', color='#00ffff', bold=True),
                Text(''),
                Text(f'Count: {self.count}', color='#ffffff'),
                Text(''),
                Text('+/- to increment/decrement', dim_color=True),
                Text('R to reset, S to save', dim_color=True),
                Text('ESC to close', dim_color=True)
            ]
        )

if __name__ == '__main__':
    Counter().run()
```

**Compilation:**

```bash
# Install dependencies
pip install ashigaru-sdk

# Compile to standalone binary
pyinstaller --onefile --name program program.py
```

**manifest.json:**

```json
{
    "id": "python-counter",
    "name": "Python Counter",
    "version": "1.0.0",
    "description": "A simple counter program written in Python",
    "author": "Developer",
    "icon": "🐍",
    "category": "demo",
    "entry": "bridge",
    "_external": {
        "language": "python",
        "executable": "./program",
        "args": [],
        "permissions": ["storage", "notifications", "sound"]
    }
}
```

### Example 2: Rust System Monitor

**File: src/main.rs**

```rust
use ashigaru_sdk::{Program, Component, Box, Text, Props, InputEvent, API};
use std::time::Duration;

struct SystemMonitor {
    program: Program,
    cpu_percent: f32,
    memory_percent: f32,
}

impl SystemMonitor {
    fn new() -> Self {
        Self {
            program: Program::new(),
            cpu_percent: 0.0,
            memory_percent: 0.0,
        }
    }

    async fn update_stats(&mut self) {
        if let Some(api) = &self.program.api {
            match api.system.get_stats().await {
                Ok(stats) => {
                    self.cpu_percent = stats.cpu_percent.unwrap_or(0.0);
                    self.memory_percent = stats.memory_percent;
                    self.program.render();
                }
                Err(e) => {
                    eprintln!("Failed to get stats: {}", e);
                }
            }
        }
    }
}

impl ashigaru_sdk::ProgramTrait for SystemMonitor {
    fn on_init(&mut self, props: Props) {
        // Start update loop
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(2));
            loop {
                interval.tick().await;
                self.update_stats().await;
            }
        });
    }

    fn on_input(&mut self, event: InputEvent) {
        if !self.program.is_focused {
            return;
        }

        if event.key.escape {
            return;
        }

        if event.input == Some('r') {
            self.update_stats();
        }
    }

    fn build(&self) -> Component {
        let border_color = if self.program.is_focused {
            "#00ffff"
        } else {
            "#333333"
        };

        Box::new()
            .flex_direction("column")
            .border_style("single")
            .border_color(border_color)
            .padding(1)
            .children(vec![
                Text::new("System Monitor")
                    .color("#00ffff")
                    .bold(true)
                    .into(),
                Text::new("").into(),
                Text::new(format!("CPU: {:.1}%", self.cpu_percent))
                    .color("#ffffff")
                    .into(),
                Text::new(format!("Memory: {:.1}%", self.memory_percent))
                    .color("#ffffff")
                    .into(),
                Text::new("").into(),
                Text::new("Press R to refresh")
                    .dim_color(true)
                    .into(),
                Text::new("Press ESC to close")
                    .dim_color(true)
                    .into(),
            ])
            .into()
    }
}

#[tokio::main]
async fn main() {
    let mut monitor = SystemMonitor::new();
    monitor.program.run(&mut monitor).await;
}
```

**Compilation:**

```bash
# Add dependency
cargo add ashigaru-sdk

# Build static binary
cargo build --release

# Copy to program directory
cp target/release/system-monitor programs/utility/system-monitor/program
```

---

## Appendix A: Protocol Message Reference

### Complete Message Type Catalog

| Type | Direction | Description |
|------|-----------|-------------|
| `lifecycle/init` | ASHIGARU → External | Initialize program with props |
| `lifecycle/focus` | ASHIGARU → External | Focus state changed |
| `lifecycle/close` | ASHIGARU → External | Request program close |
| `lifecycle/resize` | ASHIGARU → External | Terminal resized |
| `input` | ASHIGARU → External | Keyboard input event |
| `render` | External → ASHIGARU | Render virtual DOM tree |
| `api_call` | External → ASHIGARU | Invoke ASHIGARU API |
| `api_response` | ASHIGARU → External | API call response |
| `error` | Both | Error notification |
| `heartbeat` | External → ASHIGARU | Health check ping |
| `ipc_message` | ASHIGARU → External | Forwarded IPC message |

---

## Appendix B: Supported Component Catalog

| Component | Description | Props |
|-----------|-------------|-------|
| `Box` | Layout container | flexDirection, borderStyle, borderColor, padding |
| `Text` | Text display | color, bold, italic, underline, dimColor |
| `TextInput` | Text input field | value, placeholder, focus, mask |
| `SelectInput` | Selection list | items, initialIndex, onSelect |
| `Spinner` | Loading spinner | type |
| `Divider` | Visual divider | title, width |
| `Table` | Data table | data, columns |
| `Markdown` | Markdown renderer | content |

---

## Appendix C: FAQ

**Q: Can I mix native JavaScript programs and external language programs?**
A: Yes, they coexist seamlessly. ASHIGARU treats them identically.

**Q: What languages are officially supported?**
A: Initially Python and Rust. Community can create SDKs for any language.

**Q: Do external programs have access to the file system?**
A: Yes, but recommended to use storage API for persistence. Direct file access is permitted but discouraged.

**Q: How do I debug my external program?**
A: Use stderr for logging. ASHIGARU captures and displays stderr in development mode.

**Q: Can external programs spawn child processes?**
A: Not by default. This requires explicit permission and is discouraged.

**Q: What happens if my program crashes?**
A: ASHIGARU detects the crash, logs the error, and offers to restart (up to 3 attempts).

**Q: How do I distribute my external program?**
A: Package the compiled binary with manifest.json. Users install via Package Manager.

**Q: Can I use third-party libraries in my program?**
A: Yes, but they must be statically linked into the binary (no dynamic dependencies).

**Q: What's the maximum message size?**
A: 1MB per message. Larger payloads should be chunked.

**Q: Can I use async/await in my program?**
A: Yes, API calls are async. Your language SDK handles this idiomatically.

---

## Appendix D: Implementation Checklist

### Core Bridge System
- [ ] Protocol message parser with validation
- [ ] Process spawner with stdio pipes
- [ ] Message router with correlation IDs
- [ ] Virtual DOM renderer for all components
- [ ] API router with permission checks
- [ ] Error handler with recovery
- [ ] Process health monitor
- [ ] Resource usage tracking

### Python SDK
- [ ] Protocol client implementation
- [ ] API wrappers (all modules)
- [ ] Component DSL (all components)
- [ ] Type hints
- [ ] Example programs (3+)
- [ ] Documentation
- [ ] PyInstaller build template
- [ ] Unit tests

### Rust SDK
- [ ] Protocol client implementation
- [ ] API wrappers (all modules)
- [ ] Macro-based component DSL
- [ ] Type safety
- [ ] Example programs (3+)
- [ ] Documentation
- [ ] Static build template
- [ ] Unit tests

### Documentation
- [ ] Protocol specification
- [ ] Bridge architecture guide
- [ ] Python SDK tutorial
- [ ] Rust SDK tutorial
- [ ] Migration guide
- [ ] Best practices
- [ ] API reference
- [ ] Example gallery

### Testing
- [ ] Protocol unit tests
- [ ] Bridge integration tests
- [ ] SDK unit tests
- [ ] End-to-end tests
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Cross-platform testing

---

## Appendix E: Future Enhancements

### Potential Future Features

1. **WebAssembly Support**: Run WASM modules directly in Node.js
2. **Hot Reload**: Reload external programs without restarting
3. **Debugging Protocol**: Remote debugging for external programs
4. **GPU Access**: Expose terminal graphics capabilities
5. **Async Rendering**: Background rendering with backpressure
6. **Shared Memory**: IPC via shared memory for performance
7. **Language Server Protocol**: IDE support for SDK development
8. **Program Marketplace**: Curated repository of external programs

---

## Summary

This comprehensive plan provides a complete roadmap for implementing a multilingual API system for ASHIGARU that:

✅ **Requires no changes** to the core runtime or packaged libraries
✅ **Supports any language** through a JSON-based protocol
✅ **Requires no installation** - programs are self-contained binaries
✅ **Provides full API access** - all ASHIGARU features available
✅ **Handles edge cases** - comprehensive error handling and type safety
✅ **Scales efficiently** - optimized for performance and resource usage
✅ **Maintains security** - permission system and sandboxing

The implementation is phased over 12 weeks with clear deliverables, testing criteria, and success metrics. The protocol is designed to be simple, extensible, and language-agnostic while providing a seamless developer experience through idiomatic SDKs.

---

**End of Document**
