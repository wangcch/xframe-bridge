# XFrame Bridge

[![npm version](https://img.shields.io/npm/v/xframe-bridge.svg)](https://www.npmjs.com/package/xframe-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, type-safe bridge for iframe cross-window communication.

[中文文档](./README.zh-CN.md) | [LLM/Agent Reference](./llms.txt)

## Features

- 🔒 **Type-Safe** - Full TypeScript support with generics
- 🚀 **Promise-Based** - Async/await for request-response pattern
- 📡 **Event System** - One-way event emitter for notifications
- 📺 **Channel Support** - Namespace isolation for modular communication
- ⚡ **Lightweight** - Zero dependencies, ~2KB gzipped
- 🛡️ **Secure** - Origin validation and protocol identifier
- ⏱️ **Timeout Handling** - Configurable request timeouts
- 🔍 **Debug Mode** - Optional logging for development

## Installation

```bash
npm install xframe-bridge
```

## Quick Start

### Parent Window

```typescript
import { createParentBridge } from 'xframe-bridge';

const iframe = document.getElementById('myIframe') as HTMLIFrameElement;
const bridge = createParentBridge(iframe, {
  targetOrigin: 'https://child.example.com',
  timeout: 5000,
  debug: true
});

// Register request handler
bridge.on('getData', (params) => {
  return { result: 'Hello from parent!' };
});

// Send request
const response = await bridge.request('childMethod', { id: 1 });

// Emit event
bridge.emit('parentEvent', { message: 'Hello!' });

// Listen to events
bridge.listen('childEvent', (data) => {
  console.log('Event from child:', data);
});
```

### Child Window (Inside iframe)

```typescript
import { createChildBridge } from 'xframe-bridge';

const bridge = createChildBridge({
  targetOrigin: 'https://parent.example.com',
  timeout: 5000
});

// Register request handler
bridge.on('childMethod', (params) => {
  return { result: 'Hello from child!' };
});

// Send request
const response = await bridge.request('getData', { id: 1 });

// Emit event
bridge.emit('childEvent', { status: 'ready' });
```

## Channels

Use channels to isolate communication between different modules:

```typescript
const bridge = createParentBridge(iframe);

// Create isolated channels
const userChannel = bridge.channel('user');
const dataChannel = bridge.channel('data');

// Each channel communicates independently
await userChannel.request('login', { username: 'admin' });
await dataChannel.request('fetch', { table: 'users' });

// Events are also isolated
userChannel.listen('statusChanged', handler);
dataChannel.listen('updated', handler);
```

## API

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targetOrigin` | `string` | `'*'` | Target origin for security |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `debug` | `boolean` | `false` | Enable debug logging |

### Methods

| Method | Description |
|--------|-------------|
| `request(method, data?)` | Send request and wait for response |
| `on(method, handler)` | Register request handler |
| `emit(event, data?)` | Send one-way event |
| `listen(event, handler)` | Listen to events |
| `off(event, handler?)` | Remove event listener |
| `channel(name)` | Create named channel |
| `destroy()` | Destroy and cleanup |

## Security

Always specify `targetOrigin` in production:

```typescript
const bridge = createParentBridge(iframe, {
  targetOrigin: 'https://trusted-domain.com' // Never use '*' in production
});
```

## License

MIT
