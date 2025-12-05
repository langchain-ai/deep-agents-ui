/**
 * SSE (Server-Sent Events) 流式连接管理
 * 作为 WebSocket 的备选方案，用于单向服务端推送
 */

import type { StreamEvent } from '@/app/types/types';
import { apiClient } from '@/lib/api/client';

type EventHandler = (event: StreamEvent) => void;

interface SSEStreamOptions {
  /** SSE URL */
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
  onDisconnect?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
}

/**
 * SSE 流式连接类
 */
export class SSEStream {
  private eventSource: EventSource | null = null;
  private options: SSEStreamOptions;
  private isManualClose = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SSEStreamOptions) {
    this.options = {
      autoReconnect: true,
      reconnectDelay: 3000,
      ...options,
    };
  }

  /**
   * 建立 SSE 连接
   */
  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.warn('SSE is already connected');
      return;
    }

    const { url, token, cid } = this.options;
    // SSE 通过 URL 参数传递认证信息（或使用 cookie）
    const sseUrl = `${url}?cid=${encodeURIComponent(cid)}&token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(sseUrl);
      this.isManualClose = false;
      this.setupEventHandlers();
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Failed to create EventSource'));
    }
  }

  /**
   * 设置 SSE 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.options.onConnect?.();

      // 发送连接成功事件
      this.options.onEvent({
        type: 'connected',
        data: { cid: this.options.cid },
        timestamp: Date.now(),
      });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);
        if (!streamEvent.timestamp) {
          streamEvent.timestamp = Date.now();
        }
        this.options.onEvent(streamEvent);
      } catch (e) {
        console.error('Failed to parse SSE message:', e, event.data);
      }
    };

    this.eventSource.onerror = () => {
      console.error('SSE error');
      this.options.onError?.(new Error('SSE connection error'));
      this.options.onDisconnect?.();

      // 自动重连
      if (!this.isManualClose && this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    // 监听自定义事件类型
    const eventTypes = [
      'message_start',
      'message_delta',
      'message_end',
      'tool_call_start',
      'tool_call_result',
      'subagent_start',
      'subagent_end',
      'todo_update',
      'file_update',
      'interrupt',
      'state_update',
      'error',
      'done',
    ];

    eventTypes.forEach((eventType) => {
      this.eventSource?.addEventListener(eventType, (event: Event) => {
        const messageEvent = event as MessageEvent;
        try {
          const data = JSON.parse(messageEvent.data);
          this.options.onEvent({
            type: eventType as StreamEvent['type'],
            data,
            timestamp: Date.now(),
          });
        } catch (e) {
          console.error(`Failed to parse SSE ${eventType} event:`, e);
        }
      });
    });
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('SSE reconnecting...');
      this.connect();
    }, this.options.reconnectDelay);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

/**
 * SSE 发送消息需要通过单独的 HTTP 请求
 */
export async function sendSSEMessage(
  cid: string,
  content: string,
  attachments?: Array<{
    type: 'file' | 'image';
    url?: string;
    content?: string;
    name?: string;
  }>
): Promise<{ messageId: string }> {
  return apiClient.post<{ messageId: string }>(`/api/conversations/${cid}/messages`, {
    content,
    attachments,
  });
}

/**
 * SSE 恢复中断
 */
export async function resumeSSEInterrupt(
  cid: string,
  interruptId: string,
  decision: unknown
): Promise<void> {
  return apiClient.post(`/api/conversations/${cid}/interrupt/resume`, {
    interruptId,
    decision,
  });
}

/**
 * SSE 停止生成
 */
export async function stopSSEGeneration(cid: string): Promise<void> {
  return apiClient.post(`/api/conversations/${cid}/stop`);
}

/**
 * 创建 SSE 流式连接
 */
export function createSSEStream(options: SSEStreamOptions): SSEStream {
  return new SSEStream(options);
}

