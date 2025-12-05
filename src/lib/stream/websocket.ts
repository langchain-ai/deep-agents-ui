/**
 * WebSocket 流式连接管理
 * 用于与 DeepAgents 后端进行实时双向通信
 */

import type { StreamEvent, StreamEventType } from '@/app/types/types';

type EventHandler = (event: StreamEvent) => void;

interface WebSocketStreamOptions {
  /** WebSocket URL */
  url: string;
  /** 认证 token */
  token: string;
  /** 会话 ID */
  cid: string;
  /** 事件处理回调 */
  onEvent: EventHandler;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: (code?: number, reason?: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
}

// 客户端发送的消息类型
export type ClientMessageType =
  | 'user_message'
  | 'resume_interrupt'
  | 'stop'
  | 'ping';

export interface ClientMessage<T = unknown> {
  type: ClientMessageType;
  data?: T;
  timestamp?: number;
}

export interface UserMessageData {
  content: string;
  attachments?: Array<{
    type: 'file' | 'image';
    url?: string;
    content?: string;
    name?: string;
  }>;
}

export interface ResumeInterruptData {
  interruptId: string;
  decision: unknown;
}

/**
 * WebSocket 流式连接类
 */
export class WebSocketStream {
  private ws: WebSocket | null = null;
  private options: WebSocketStreamOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private isManualClose = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WebSocketStreamOptions) {
    this.options = options;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  /**
   * 建立 WebSocket 连接
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket is already connected');
      return;
    }

    const { url, token, cid } = this.options;
    const wsUrl = `${url}?cid=${encodeURIComponent(cid)}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.isManualClose = false;
      this.setupEventHandlers();
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  /**
   * 设置 WebSocket 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.options.onConnect?.();
      this.startPingInterval();

      // 发送连接成功事件
      this.options.onEvent({
        type: 'connected',
        data: { cid: this.options.cid },
        timestamp: Date.now(),
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);
        // 确保有时间戳
        if (!streamEvent.timestamp) {
          streamEvent.timestamp = Date.now();
        }
        this.options.onEvent(streamEvent);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e, event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopPingInterval();
      this.options.onDisconnect?.(event.code, event.reason);

      // 非手动关闭时尝试重连
      if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.options.onError?.(new Error('WebSocket connection error'));
    };
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 启动心跳
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // 30秒心跳
  }

  /**
   * 停止心跳
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 发送消息
   */
  send<T>(message: ClientMessage<T>): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected, cannot send message');
      return false;
    }

    try {
      const payload = {
        ...message,
        timestamp: message.timestamp ?? Date.now(),
      };
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * 发送用户消息
   */
  sendMessage(content: string, attachments?: UserMessageData['attachments']): boolean {
    return this.send<UserMessageData>({
      type: 'user_message',
      data: { content, attachments },
    });
  }

  /**
   * 恢复中断
   */
  resumeInterrupt(interruptId: string, decision: unknown): boolean {
    return this.send<ResumeInterruptData>({
      type: 'resume_interrupt',
      data: { interruptId, decision },
    });
  }

  /**
   * 停止生成
   */
  stop(): boolean {
    return this.send({ type: 'stop' });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接状态详情
   */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * 更新会话 ID（需要重新连接）
   */
  updateCid(cid: string): void {
    this.options.cid = cid;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }

  /**
   * 更新 token（需要重新连接）
   */
  updateToken(token: string): void {
    this.options.token = token;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

/**
 * 创建 WebSocket 流式连接
 */
export function createWebSocketStream(options: WebSocketStreamOptions): WebSocketStream {
  return new WebSocketStream(options);
}

