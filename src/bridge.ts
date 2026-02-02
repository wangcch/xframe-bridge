import type { Message, BridgeOptions, RequestHandler, EventHandler, IBridge } from './types';
import { MessageType as MT } from './types';

/** Protocol identifier to prevent message pollution */
const PROTOCOL_ID = '__XFRAME_BRIDGE__';

/**
 * XFrameBridge - A protocol-based bridge for iframe communication
 */
export class XFrameBridge implements IBridge {
  private target: Window;
  private targetOrigin: string;
  private timeout: number;
  private debug: boolean;
  private channelName?: string;
  private handlers: Map<string, RequestHandler>;
  private eventHandlers: Map<string, Set<EventHandler>>;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timer: number; channel?: string }>;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isRootBridge: boolean;
  private rootBridge?: XFrameBridge;

  constructor(target: Window, options: BridgeOptions = {}, channelName?: string, rootBridge?: XFrameBridge) {
    this.target = target;
    this.targetOrigin = options.targetOrigin || '*';
    this.timeout = options.timeout || 30000;
    this.debug = options.debug || false;
    this.channelName = channelName;
    this.isRootBridge = !rootBridge;
    this.rootBridge = rootBridge;

    if (this.isRootBridge) {
      this.handlers = new Map();
      this.eventHandlers = new Map();
      this.pendingRequests = new Map();
      this.messageHandler = this.handleMessage.bind(this);
      window.addEventListener('message', this.messageHandler);
    } else {
      this.handlers = rootBridge!.handlers;
      this.eventHandlers = rootBridge!.eventHandlers;
      this.pendingRequests = rootBridge!.pendingRequests;
    }

    this.log('Bridge initialized', {
      targetOrigin: this.targetOrigin,
      channel: this.channelName,
      isRoot: this.isRootBridge,
    });
  }

  /**
   * Send a request and wait for response
   */
  async request<T = any, R = any>(method: string, data?: T): Promise<R> {
    const id = this.generateId();
    const message: Message<T> = {
      __protocol__: PROTOCOL_ID,
      id,
      type: MT.REQUEST,
      method,
      channel: this.channelName,
      data,
      timestamp: Date.now(),
    };

    return new Promise<R>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timer,
        channel: this.channelName,
      });
      this.postMessage(message);
      this.log('Request sent', message);
    });
  }

  /**
   * Register a request handler
   */
  on<T = any>(method: string, handler: RequestHandler<T>): void {
    const key = this.getHandlerKey(method);
    this.handlers.set(key, handler);
    this.log('Handler registered', { method, channel: this.channelName });
  }

  /**
   * Emit an event (one-way communication)
   */
  emit<T = any>(event: string, data?: T): void {
    const message: Message<T> = {
      __protocol__: PROTOCOL_ID,
      id: this.generateId(),
      type: MT.EVENT,
      method: event,
      channel: this.channelName,
      data,
      timestamp: Date.now(),
    };

    this.postMessage(message);
    this.log('Event emitted', message);
  }

  /**
   * Listen to events
   */
  listen<T = any>(event: string, handler: EventHandler<T>): void {
    const key = this.getHandlerKey(event);
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(handler);
    this.log('Event listener added', { event, channel: this.channelName });
  }

  /**
   * Remove event listener
   */
  off<T = any>(event: string, handler?: EventHandler<T>): void {
    const key = this.getHandlerKey(event);
    if (!handler) {
      this.eventHandlers.delete(key);
      this.log('All event listeners removed', {
        event,
        channel: this.channelName,
      });
    } else {
      const handlers = this.eventHandlers.get(key);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(key);
        }
      }
      this.log('Event listener removed', { event, channel: this.channelName });
    }
  }

  /**
   * Destroy the bridge and cleanup
   */
  destroy(): void {
    if (this.isRootBridge) {
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }

      for (const [_id, request] of this.pendingRequests) {
        clearTimeout(request.timer);
        request.reject(new Error('Bridge destroyed'));
      }

      this.pendingRequests.clear();
      this.handlers.clear();
      this.eventHandlers.clear();
      this.log('Bridge destroyed (root)');
    } else {
      const channelPrefix = `${this.channelName}:`;

      for (const key of [...this.handlers.keys()]) {
        if (key.startsWith(channelPrefix)) {
          this.handlers.delete(key);
        }
      }

      for (const key of [...this.eventHandlers.keys()]) {
        if (key.startsWith(channelPrefix)) {
          this.eventHandlers.delete(key);
        }
      }

      for (const [id, request] of [...this.pendingRequests.entries()]) {
        if (request.channel === this.channelName) {
          clearTimeout(request.timer);
          request.reject(new Error('Channel destroyed'));
          this.pendingRequests.delete(id);
        }
      }

      this.log('Bridge destroyed (channel)', { channel: this.channelName });
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      return;
    }

    const message = event.data as Message;
    if (!this.isValidMessage(message)) {
      return;
    }

    this.log('Message received', message);

    switch (message.type) {
      case MT.REQUEST:
        await this.handleRequest(message);
        break;
      case MT.RESPONSE:
      case MT.ERROR:
        this.handleResponse(message);
        break;
      case MT.EVENT:
        this.handleEvent(message);
        break;
    }
  }

  /**
   * Handle request message
   */
  private async handleRequest(message: Message): Promise<void> {
    const key = this.getHandlerKey(message.method!, message.channel);
    const handler = this.handlers.get(key);

    if (!handler) {
      this.sendError(message.id, `No handler for method: ${message.method}`, message.channel);
      return;
    }

    try {
      const result = await handler(message.data);
      this.sendResponse(message.id, result, message.channel);
    } catch (error) {
      this.sendError(message.id, error instanceof Error ? error.message : String(error), message.channel);
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(message: Message): void {
    const pending = this.pendingRequests.get(message.id);

    if (!pending) {
      return;
    }

    if (pending.channel !== message.channel) {
      this.log('Response channel mismatch', {
        expected: pending.channel,
        received: message.channel,
      });
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(message.id);

    if (message.type === MT.ERROR) {
      pending.reject(new Error(message.error || 'Unknown error'));
    } else {
      pending.resolve(message.data);
    }
  }

  /**
   * Handle event message
   */
  private handleEvent(message: Message): void {
    const key = this.getHandlerKey(message.method!, message.channel);
    const handlers = this.eventHandlers.get(key);

    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of handlers) {
      try {
        handler(message.data);
      } catch (error) {
        this.log('Event handler error', error);
      }
    }
  }

  /**
   * Send response message
   */
  private sendResponse(id: string, data: any, channel?: string): void {
    const message: Message = {
      __protocol__: PROTOCOL_ID,
      id,
      type: MT.RESPONSE,
      channel,
      data,
      timestamp: Date.now(),
    };
    this.postMessage(message);
    this.log('Response sent', message);
  }

  /**
   * Send error message
   */
  private sendError(id: string, error: string, channel?: string): void {
    const message: Message = {
      __protocol__: PROTOCOL_ID,
      id,
      type: MT.ERROR,
      channel,
      error,
      timestamp: Date.now(),
    };
    this.postMessage(message);
    this.log('Error sent', message);
  }

  /**
   * Post message to target window
   */
  private postMessage(message: Message): void {
    this.target.postMessage(message, this.targetOrigin);
  }

  /**
   * Validate message structure
   */
  private isValidMessage(message: any): message is Message {
    return (
      message &&
      typeof message === 'object' &&
      message.__protocol__ === PROTOCOL_ID &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number'
    );
  }

  /**
   * Create a channel-specific bridge instance
   */
  channel(name: string): XFrameBridge {
    const root = this.isRootBridge ? this : this.rootBridge!;
    return new XFrameBridge(
      this.target,
      {
        targetOrigin: this.targetOrigin,
        timeout: this.timeout,
        debug: this.debug,
      },
      name,
      root
    );
  }

  /**
   * Get handler key with channel prefix
   */
  private getHandlerKey(method: string, channel?: string): string {
    const ch = channel !== undefined ? channel : this.channelName;
    return ch ? `${ch}:${method}` : method;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      const prefix = this.channelName ? `[XFrameBridge:${this.channelName}]` : '[XFrameBridge]';
      console.log(`${prefix} ${message}`, data || '');
    }
  }
}

/**
 * Create a bridge instance for parent window
 */
export function createParentBridge(iframe: HTMLIFrameElement, options?: BridgeOptions): XFrameBridge {
  if (!iframe.contentWindow) {
    throw new Error('Iframe contentWindow is not available');
  }
  return new XFrameBridge(iframe.contentWindow, options);
}

/**
 * Create a bridge instance for child window
 */
export function createChildBridge(options?: BridgeOptions): XFrameBridge {
  if (!window.parent || window.parent === window) {
    throw new Error('Not in an iframe context');
  }
  return new XFrameBridge(window.parent, options);
}
