/**
 * Message types for iframe communication
 */
export enum MessageType {
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
  EVENT = 'EVENT',
  ERROR = 'ERROR',
}

/**
 * Message structure for communication
 */
export interface Message<T = any> {
  __protocol__: string;
  id: string;
  type: MessageType;
  method?: string;
  channel?: string;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Bridge configuration options
 */
export interface BridgeOptions {
  targetOrigin?: string;
  timeout?: number;
  debug?: boolean;
}

/**
 * Request handler function type
 */
export type RequestHandler<T = any, R = any> = (data: T) => Promise<R> | R;

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Bridge interface
 */
export interface IBridge {
  request<T = any, R = any>(method: string, data?: T): Promise<R>;
  on<T = any>(method: string, handler: RequestHandler<T>): void;
  off<T = any>(event: string, handler?: EventHandler<T>): void;
  emit<T = any>(event: string, data?: T): void;
  listen<T = any>(event: string, handler: EventHandler<T>): void;
  channel(name: string): IBridge;
  destroy(): void;
}
