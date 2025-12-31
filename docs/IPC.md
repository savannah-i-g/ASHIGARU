# ASHIGARU IPC System

Inter-Process Communication (IPC) enables programs to communicate with each other through message passing, service calls, and event broadcasting.

## Table of Contents

- [Overview](#overview)
- [Getting IPC Access](#getting-ipc-access)
- [Pub/Sub Messaging](#pubsub-messaging)
- [Direct Window Messaging](#direct-window-messaging)
- [Service Registry](#service-registry)
- [Request/Response Pattern](#requestresponse-pattern)
- [React Hooks](#react-hooks)
- [Diagnostics](#diagnostics)
- [Best Practices](#best-practices)
- [Complete Example](#complete-example)

---

## Overview

The IPC system provides four communication patterns:

| Pattern | Use Case |
|---------|----------|
| **Pub/Sub** | Broadcast messages to all subscribers on a channel |
| **Direct** | Send messages to a specific window by ID |
| **Services** | Register callable functions that other programs can invoke |
| **Request/Response** | Send a request and await a specific response |

Programs access IPC through the `ipc` prop passed automatically to every program component.

---

## Getting IPC Access

Every program receives the `ipc` prop from the window manager:

```javascript
const MyProgram = ({ ipc, windowId, isFocused }) => {
    // ipc: IPCContextType - Full IPC functionality
    // windowId: string - This window's unique ID

    if (!ipc) {
        return <Text>IPC not available</Text>;
    }

    // Use ipc methods...
};
```

---

## Pub/Sub Messaging

Publish messages to named channels that any program can subscribe to.

### Publishing Messages

```javascript
// Signature: ipc.publish(channel, type, payload)
ipc.publish('system.status', 'update', {
    cpu: 45,
    memory: 60,
    timestamp: Date.now()
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel` | string | Channel name (e.g., `'system.status'`, `'myapp.events'`) |
| `type` | string | Message type/event name |
| `payload` | unknown | Data to send (any serializable value) |

### Subscribing to Channels

```javascript
// Signature: ipc.subscribe(channel, handler) => IPCSubscription
const subscription = ipc.subscribe('system.status', (message) => {
    console.log('Received:', message.type, message.payload);
});

// Always unsubscribe when done
subscription.unsubscribe();
```

### Message Object Structure

Handlers receive a message object with:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique message ID |
| `channel` | string | Channel the message was published to |
| `type` | string | Message type |
| `payload` | unknown | Message data |
| `sender` | string | Window ID of the sender |
| `timestamp` | number | Unix timestamp when sent |
| `correlationId` | string? | Optional ID for request/response matching |
| `expectsResponse` | boolean? | Whether sender expects a response |

### Channel Wildcards

Subscribe to multiple channels using wildcards:

```javascript
// Subscribe to all channels starting with 'system.'
ipc.subscribe('system.*', (message) => {
    // Receives: system.status, system.error, system.notify, etc.
});

// Subscribe to ALL messages
ipc.subscribe('*', (message) => {
    // Receives every message in the system
});
```

---

## Direct Window Messaging

Send messages directly to a specific window by its ID.

### Sending Direct Messages

```javascript
// Signature: ipc.sendToWindow(targetWindowId, type, payload)
ipc.sendToWindow('window-5', 'command', {
    action: 'refresh',
    data: { force: true }
});
```

### Receiving Direct Messages

```javascript
// Signature: ipc.onDirectMessage(handler) => IPCSubscription
const subscription = ipc.onDirectMessage((message) => {
    console.log('From:', message.sender);
    console.log('Type:', message.type);
    console.log('Data:', message.payload);
});

// Cleanup
subscription.unsubscribe();
```

### Getting Window IDs

The current window ID is available via the `windowId` prop:

```javascript
const MyProgram = ({ ipc, windowId }) => {
    // windowId is e.g., 'window-3'

    // Share your window ID with others via pub/sub
    ipc.publish('myapp.register', 'window', { id: windowId });
};
```

---

## Service Registry

Register callable functions that other programs can invoke, similar to RPC.

### Registering a Service

```javascript
// Signature: ipc.registerService(name, methods)
ipc.registerService('calculator', {
    add: async (a, b) => a + b,
    multiply: async (a, b) => a * b,
    divide: async (a, b) => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
    }
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Service name (must be unique) |
| `methods` | Record<string, Function> | Object mapping method names to async functions |

### Calling a Service

```javascript
// Signature: ipc.callService(serviceName, methodName, ...args) => Promise<T>
try {
    const sum = await ipc.callService('calculator', 'add', 10, 5);
    console.log('Result:', sum); // 15
} catch (error) {
    console.error('Service call failed:', error.message);
}
```

### Unregistering a Service

```javascript
// Signature: ipc.unregisterService(name)
ipc.unregisterService('calculator');
```

**Important:** Always unregister services when your program closes to prevent stale service references.

### Discovering Services

```javascript
// Get list of all registered service names
const services = ipc.getServices();
// ['calculator', 'file-manager', 'ai-helper']

// Get methods available on a service
const methods = ipc.getServiceMethods('calculator');
// ['add', 'multiply', 'divide']
```

---

## Request/Response Pattern

Send a request and await a response, with built-in timeout handling.

### Sending a Request

```javascript
// Signature: ipc.request(channel, type, payload, timeout?) => Promise<T>
try {
    const response = await ipc.request(
        'data.fetch',        // channel
        'get-user',          // type
        { userId: 123 },     // payload
        5000                 // timeout in ms (default: 30000)
    );
    console.log('User:', response);
} catch (error) {
    console.error('Request failed:', error.message);
}
```

### Handling Requests and Sending Responses

```javascript
ipc.subscribe('data.fetch', (message) => {
    if (message.expectsResponse && message.type === 'get-user') {
        const userId = message.payload.userId;

        // Look up user...
        const user = { id: userId, name: 'John' };

        // Send response
        ipc.respond(message, user);
    }
});
```

**Important:** Only call `ipc.respond()` when `message.expectsResponse` is `true`.

---

## React Hooks

The IPC system provides convenience hooks for common patterns.

### useChannel

Subscribe to a channel with automatic cleanup:

```javascript
import { useChannel } from '@core/IPCContext';

const MyProgram = ({ ipc }) => {
    const [stats, setStats] = useState(null);

    useChannel('system.stats', (message) => {
        setStats(message.payload);
    });

    // Subscription is automatically cleaned up on unmount
};
```

### useService

Register a service with automatic cleanup:

```javascript
import { useService } from '@core/IPCContext';

const MyProgram = ({ windowId }) => {
    useService('my-service', {
        getData: async () => ({ value: 42 }),
        processItem: async (item) => item.toUpperCase()
    }, windowId);

    // Service is automatically unregistered on unmount
};
```

### useDirectMessages

Listen for direct messages with automatic cleanup:

```javascript
import { useDirectMessages } from '@core/IPCContext';

const MyProgram = ({ windowId }) => {
    useDirectMessages(windowId, (message) => {
        console.log('Received direct message:', message);
    });

    // Handler is automatically cleaned up on unmount
};
```

---

## Diagnostics

The IPC system provides methods for debugging and monitoring.

### Get Active Channels

```javascript
const channels = ipc.getChannels();
// [
//   { channel: 'system.status', subscribers: 3 },
//   { channel: 'myapp.events', subscribers: 1 }
// ]
```

### Get Message History

```javascript
const history = ipc.getMessageHistory();
// Returns last 100 messages for debugging
// [
//   { id: '...', channel: 'system.status', type: 'update', ... },
//   ...
// ]
```

### Get Registered Services

```javascript
const services = ipc.getServices();
// ['calculator', 'file-manager']

const methods = ipc.getServiceMethods('calculator');
// ['add', 'multiply', 'divide']
```

---

## Best Practices

### 1. Always Unsubscribe

Clean up subscriptions to prevent memory leaks:

```javascript
useEffect(() => {
    const sub = ipc.subscribe('channel', handler);
    return () => sub.unsubscribe();
}, []);
```

### 2. Use Meaningful Channel Names

Follow a namespace convention:

```javascript
// Good: Clear hierarchy
'system.status'
'myapp.users.updated'
'file-browser.selection'

// Bad: Ambiguous
'update'
'data'
'event'
```

### 3. Handle Missing IPC

Always check if IPC is available:

```javascript
if (!ipc) {
    console.warn('IPC not available');
    return;
}
ipc.publish('channel', 'type', data);
```

### 4. Use Timeout for Requests

Always specify a reasonable timeout:

```javascript
// Will reject after 5 seconds if no response
const data = await ipc.request('channel', 'type', payload, 5000);
```

### 5. Unregister Services on Close

Prevent stale service references:

```javascript
useEffect(() => {
    ipc.registerService('my-service', methods);
    return () => ipc.unregisterService('my-service');
}, []);
```

### 6. Validate Message Payloads

Don't trust incoming data blindly:

```javascript
ipc.subscribe('channel', (message) => {
    const { userId, action } = message.payload || {};
    if (typeof userId !== 'number') return;
    if (typeof action !== 'string') return;
    // Process validated data...
});
```

---

## Complete Example

A program that broadcasts its status and exposes a service:

```javascript
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

const StatusBroadcaster = ({ ipc, windowId, isFocused, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [receivedMessages, setReceivedMessages] = useState([]);

    // Register a service
    useEffect(() => {
        if (!ipc) return;

        ipc.registerService('status-service', {
            getStatus: async () => ({ status, windowId }),
            setStatus: async (newStatus) => {
                setStatus(newStatus);
                return { success: true };
            }
        });

        return () => ipc.unregisterService('status-service');
    }, [ipc, status, windowId]);

    // Broadcast status periodically
    useEffect(() => {
        if (!ipc) return;

        const interval = setInterval(() => {
            ipc.publish('app.status', 'heartbeat', {
                windowId,
                status,
                timestamp: Date.now()
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [ipc, status, windowId]);

    // Listen for direct messages
    useEffect(() => {
        if (!ipc) return;

        const sub = ipc.onDirectMessage((message) => {
            setReceivedMessages(prev => [
                { from: message.sender, type: message.type },
                ...prev.slice(0, 4)
            ]);
        });

        return () => sub.unsubscribe();
    }, [ipc]);

    useInput((input, key) => {
        if (!isFocused) return;
        if (key.escape) onClose();
        if (input === '1') setStatus('active');
        if (input === '2') setStatus('idle');
        if (input === '3') setStatus('busy');
    }, { isActive: isFocused });

    return (
        <Box flexDirection="column" borderStyle="single">
            <Text bold>Status Broadcaster</Text>
            <Text>Window ID: {windowId}</Text>
            <Text>Current Status: {status}</Text>
            <Text dimColor>Press 1/2/3 to change status</Text>
            <Text dimColor>Messages received: {receivedMessages.length}</Text>
        </Box>
    );
};

export default StatusBroadcaster;
```

---

## TypeScript Types

For TypeScript users, import types from the IPC module:

```typescript
import type {
    IPCMessage,
    IPCMessageHandler,
    IPCSubscription,
    IPCService,
    IPCContextType
} from '../types/ipc';
```

See [src/types/ipc.ts](file:///home/administrator/TUI_Test/src/types/ipc.ts) for complete type definitions.
