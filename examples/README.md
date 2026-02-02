# XFrame Bridge Examples

Interactive examples demonstrating iframe communication with XFrame Bridge.

## Examples

### 🎯 Basic Example
- **parent.html** - Parent window with embedded iframe
- **child.html** - Child iframe content
- Features: request-response, events, custom messages

### 🔀 Channel Example
- **channel-parent.html** - Multi-channel parent window
- **channel-child.html** - Multi-channel child iframe
- Features: isolated channels (user, data, default), namespace separation

### 🏠 Index
- **index.html** - Examples landing page

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/examples/` in your browser.

## Usage

### Parent Window
```javascript
import { createParentBridge } from 'xframe-bridge';

const bridge = createParentBridge(iframe, {
  targetOrigin: window.location.origin
});

// Request data
const result = await bridge.request('getData');

// Emit event
bridge.emit('parentEvent', { message: 'Hello' });

// Handle requests
bridge.on('getInfo', () => ({ status: 'ok' }));
```

### Child Window
```javascript
import { createChildBridge } from 'xframe-bridge';

const bridge = createChildBridge({
  targetOrigin: window.location.origin
});

// Handle requests
bridge.on('getData', () => ({ data: [1, 2, 3] }));

// Listen to events
bridge.listen('parentEvent', (data) => {
  console.log(data.message);
});
```

### Channel Communication
```javascript
// Parent - create channel
const userChannel = bridge.channel('user');
await userChannel.request('login', credentials);

// Child - handle channel requests
const userBridge = bridge.channel('user');
userBridge.on('login', (creds) => ({ success: true }));
```

## Features

✅ Request-response with Promise  
✅ Event emitter system  
✅ Multiple isolated channels  
✅ TypeScript support  
✅ Error handling & timeouts  
✅ Origin validation
