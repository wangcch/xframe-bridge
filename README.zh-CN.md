# XFrame Bridge

一个轻量级、类型安全的 iframe 跨窗口通信库。

[English](./README.md) | [LLM/Agent 参考](./llms.txt)

## 特性

- 🔒 **类型安全** - 完整的 TypeScript 支持，支持泛型
- 🚀 **Promise 风格** - 基于 async/await 的请求响应模式
- 📡 **事件系统** - 单向事件通知机制
- 📺 **通道隔离** - 命名空间隔离，支持模块化通信
- ⚡ **轻量** - 零依赖，gzip 后约 2KB
- 🛡️ **安全** - 源验证和协议标识，防止消息污染
- ⏱️ **超时处理** - 可配置的请求超时
- 🔍 **调试模式** - 可选的开发日志

## 安装

```bash
npm install xframe-bridge
```

## 快速开始

### 父窗口

```typescript
import { createParentBridge } from 'xframe-bridge';

const iframe = document.getElementById('myIframe') as HTMLIFrameElement;
const bridge = createParentBridge(iframe, {
  targetOrigin: 'https://child.example.com',
  timeout: 5000,
  debug: true
});

// 注册请求处理器
bridge.on('getData', (params) => {
  return { result: 'Hello from parent!' };
});

// 发送请求
const response = await bridge.request('childMethod', { id: 1 });

// 发送事件
bridge.emit('parentEvent', { message: 'Hello!' });

// 监听事件
bridge.listen('childEvent', (data) => {
  console.log('收到子窗口事件:', data);
});
```

### 子窗口（iframe 内）

```typescript
import { createChildBridge } from 'xframe-bridge';

const bridge = createChildBridge({
  targetOrigin: 'https://parent.example.com',
  timeout: 5000
});

// 注册请求处理器
bridge.on('childMethod', (params) => {
  return { result: 'Hello from child!' };
});

// 发送请求
const response = await bridge.request('getData', { id: 1 });

// 发送事件
bridge.emit('childEvent', { status: 'ready' });
```

## Channel 通道

使用 channel 隔离不同模块的通信：

```typescript
const bridge = createParentBridge(iframe);

// 创建独立通道
const userChannel = bridge.channel('user');
const dataChannel = bridge.channel('data');

// 各通道独立通信
await userChannel.request('login', { username: 'admin' });
await dataChannel.request('fetch', { table: 'users' });

// 事件也是隔离的
userChannel.listen('statusChanged', handler);
dataChannel.listen('updated', handler);
```

## API

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `targetOrigin` | `string` | `'*'` | 目标源，生产环境务必指定 |
| `timeout` | `number` | `30000` | 请求超时时间（毫秒） |
| `debug` | `boolean` | `false` | 启用调试日志 |

### 方法

| 方法 | 说明 |
|------|------|
| `request(method, data?)` | 发送请求并等待响应 |
| `on(method, handler)` | 注册请求处理器 |
| `emit(event, data?)` | 发送单向事件 |
| `listen(event, handler)` | 监听事件 |
| `off(event, handler?)` | 移除事件监听 |
| `channel(name)` | 创建命名通道 |
| `destroy()` | 销毁并清理资源 |

## 安全

生产环境请始终指定 `targetOrigin`：

```typescript
const bridge = createParentBridge(iframe, {
  targetOrigin: 'https://trusted-domain.com' // 不要使用 '*'
});
```

## 协议

MIT
