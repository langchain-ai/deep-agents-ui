"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { WebSocketStream } from "@/lib/stream/websocket";
import { SSEStream, sendSSEMessage, resumeSSEInterrupt, stopSSEGeneration } from "@/lib/stream/sse";
import type {
  Message,
  ToolCall,
  SubAgent,
  TodoItem,
  FileItem,
  InterruptData,
  StreamEvent,
  MessageStartEventData,
  MessageDeltaEventData,
  MessageEndEventData,
  ToolCallStartEventData,
  ToolCallResultEventData,
  SubAgentStartEventData,
  SubAgentEndEventData,
  TodoUpdateEventData,
  FileUpdateEventData,
  InterruptEventData,
  StateUpdateEventData,
  ErrorEventData,
} from "@/app/types/types";

// ============ 配置 ============
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/chat/stream";
const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || "http://localhost:8000/api/chat/stream";

// ============ 类型定义 ============
export type StreamTransport = "websocket" | "sse";

interface UseStreamOptions {
  /** 会话 ID */
  cid: string | null;
  /** 认证 token */
  token: string;
  /** 传输方式 */
  transport?: StreamTransport;
  /** WebSocket URL */
  wsUrl?: string;
  /** SSE URL */
  sseUrl?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 消息完成回调 */
  onMessageComplete?: (message: Message) => void;
  /** 流结束回调 */
  onDone?: () => void;
}

interface StreamState {
  /** 消息列表 */
  messages: Message[];
  /** 工具调用 Map */
  toolCalls: Map<string, ToolCall>;
  /** 子 Agent Map */
  subAgents: Map<string, SubAgent>;
  /** 任务列表 */
  todos: TodoItem[];
  /** 文件 Map */
  files: Record<string, FileItem>;
  /** 中断数据 */
  interrupt: InterruptData | null;
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误 */
  error: Error | null;
}

// ============ 初始状态 ============
const initialState: StreamState = {
  messages: [],
  toolCalls: new Map(),
  subAgents: new Map(),
  todos: [],
  files: {},
  interrupt: null,
  isConnected: false,
  isLoading: false,
  error: null,
};

// ============ Hook ============
export function useStream(options: UseStreamOptions) {
  const {
    cid,
    token,
    transport = "websocket",
    wsUrl = WS_URL,
    sseUrl = SSE_URL,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onMessageComplete,
    onDone,
  } = options;

  const [state, setState] = useState<StreamState>(initialState);

  // 使用 ref 存储流式连接和当前消息内容
  const streamRef = useRef<WebSocketStream | SSEStream | null>(null);
  const currentMessageRef = useRef<{ id: string; content: string } | null>(null);

  // 处理流式事件
  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "connected":
          setState((prev) => ({ ...prev, isConnected: true, error: null }));
          onConnect?.();
          break;

        case "message_start": {
          const data = event.data as MessageStartEventData;
          currentMessageRef.current = { id: data.messageId, content: "" };
          setState((prev) => ({
            ...prev,
            isLoading: true,
            messages: [
              ...prev.messages,
              {
                id: data.messageId,
                cid: cid!,
                role: data.role,
                content: "",
                createdAt: new Date(),
              },
            ],
          }));
          break;
        }

        case "message_delta": {
          const data = event.data as MessageDeltaEventData;
          if (currentMessageRef.current?.id === data.messageId) {
            currentMessageRef.current.content += data.delta;
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === data.messageId
                  ? { ...msg, content: currentMessageRef.current!.content }
                  : msg
              ),
            }));
          }
          break;
        }

        case "message_end": {
          const data = event.data as MessageEndEventData;
          const finalContent = data.content || currentMessageRef.current?.content || "";
          setState((prev) => {
            const updatedMessages = prev.messages.map((msg) =>
              msg.id === data.messageId ? { ...msg, content: finalContent } : msg
            );
            const completedMessage = updatedMessages.find((m) => m.id === data.messageId);
            if (completedMessage) {
              onMessageComplete?.(completedMessage);
            }
            return { ...prev, messages: updatedMessages };
          });
          currentMessageRef.current = null;
          break;
        }

        case "tool_call_start": {
          const data = event.data as ToolCallStartEventData;
          setState((prev) => {
            const newToolCalls = new Map(prev.toolCalls);
            newToolCalls.set(data.toolCallId, {
              id: data.toolCallId,
              name: data.toolName,
              args: data.args || {},
              status: "running",
              startedAt: new Date(),
            });
            return { ...prev, toolCalls: newToolCalls };
          });
          break;
        }

        case "tool_call_args_delta": {
          // 工具调用参数增量更新（如果后端支持流式参数）
          // 这里可以根据需要实现
          break;
        }

        case "tool_call_result": {
          const data = event.data as ToolCallResultEventData;
          setState((prev) => {
            const newToolCalls = new Map(prev.toolCalls);
            const existing = newToolCalls.get(data.toolCallId);
            if (existing) {
              newToolCalls.set(data.toolCallId, {
                ...existing,
                result: data.result,
                status: data.error ? "error" : "completed",
                completedAt: new Date(),
              });
            }
            return { ...prev, toolCalls: newToolCalls };
          });
          break;
        }

        case "subagent_start": {
          const data = event.data as SubAgentStartEventData;
          setState((prev) => {
            const newSubAgents = new Map(prev.subAgents);
            newSubAgents.set(data.subAgentId, {
              id: data.subAgentId,
              name: data.subAgentName,
              subAgentName: data.subAgentName,
              input: data.input,
              status: "running",
            });
            return { ...prev, subAgents: newSubAgents };
          });
          break;
        }

        case "subagent_update": {
          // 子 Agent 更新事件（可选）
          break;
        }

        case "subagent_end": {
          const data = event.data as SubAgentEndEventData;
          setState((prev) => {
            const newSubAgents = new Map(prev.subAgents);
            const existing = newSubAgents.get(data.subAgentId);
            if (existing) {
              newSubAgents.set(data.subAgentId, {
                ...existing,
                output: data.output,
                status: data.error ? "error" : "completed",
              });
            }
            return { ...prev, subAgents: newSubAgents };
          });
          break;
        }

        case "todo_update": {
          const data = event.data as TodoUpdateEventData;
          setState((prev) => ({
            ...prev,
            todos: data.todos,
          }));
          break;
        }

        case "file_update": {
          const data = event.data as FileUpdateEventData;
          setState((prev) => ({
            ...prev,
            files: {
              ...prev.files,
              [data.path]: {
                path: data.path,
                content: data.content,
                language: data.language,
                updatedAt: new Date(),
              },
            },
          }));
          break;
        }

        case "state_update": {
          // 完整状态更新（用于恢复会话等场景）
          const data = event.data as StateUpdateEventData;
          setState((prev) => ({
            ...prev,
            messages: data.messages || prev.messages,
            todos: data.todos || prev.todos,
            files: data.files
              ? Object.fromEntries(
                  Object.entries(data.files).map(([path, content]) => [
                    path,
                    { path, content, updatedAt: new Date() },
                  ])
                )
              : prev.files,
          }));
          break;
        }

        case "interrupt": {
          const data = event.data as InterruptEventData;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            interrupt: {
              id: data.interruptId,
              value: data.value,
              reason: data.reason,
              actionRequests: data.actionRequests,
              reviewConfigs: data.reviewConfigs,
            },
          }));
          break;
        }

        case "error": {
          const data = event.data as ErrorEventData;
          const error = new Error(data.message);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error,
          }));
          onError?.(error);
          break;
        }

        case "done":
          setState((prev) => ({
            ...prev,
            isLoading: false,
            interrupt: null,
          }));
          onDone?.();
          break;
      }
    },
    [cid, onConnect, onError, onMessageComplete, onDone]
  );

  // 连接管理
  useEffect(() => {
    if (!cid || !token || !enabled) {
      return;
    }

    // 创建连接
    if (transport === "websocket") {
      const wsStream = new WebSocketStream({
        url: wsUrl,
        token,
        cid,
        onEvent: handleStreamEvent,
        onConnect: () => {
          setState((prev) => ({ ...prev, isConnected: true, error: null }));
        },
        onDisconnect: () => {
          setState((prev) => ({ ...prev, isConnected: false }));
          onDisconnect?.();
        },
        onError: (error) => {
          setState((prev) => ({ ...prev, error }));
          onError?.(error);
        },
      });

      wsStream.connect();
      streamRef.current = wsStream;
    } else {
      const sseStream = new SSEStream({
        url: sseUrl,
        token,
        cid,
        onEvent: handleStreamEvent,
        onConnect: () => {
          setState((prev) => ({ ...prev, isConnected: true, error: null }));
        },
        onDisconnect: () => {
          setState((prev) => ({ ...prev, isConnected: false }));
          onDisconnect?.();
        },
        onError: (error) => {
          setState((prev) => ({ ...prev, error }));
          onError?.(error);
        },
      });

      sseStream.connect();
      streamRef.current = sseStream;
    }

    // 清理
    return () => {
      streamRef.current?.disconnect();
      streamRef.current = null;
    };
  }, [cid, token, transport, wsUrl, sseUrl, enabled, handleStreamEvent, onDisconnect, onError]);

  // 发送消息
  const sendMessage = useCallback(
    async (content: string) => {
      if (!cid) {
        console.error("No conversation ID");
        return;
      }

      // 乐观更新：立即添加用户消息
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        cid,
        role: "user",
        content,
        createdAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      // 发送消息
      if (transport === "websocket" && streamRef.current instanceof WebSocketStream) {
        const success = streamRef.current.sendMessage(content);
        if (!success) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: new Error("Failed to send message: WebSocket not connected"),
          }));
        }
      } else {
        // SSE 模式：通过 HTTP 发送
        try {
          await sendSSEMessage(cid, content);
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error("Failed to send message"),
          }));
        }
      }
    },
    [cid, transport]
  );

  // 恢复中断
  const resumeInterrupt = useCallback(
    async (decision: unknown) => {
      if (!cid || !state.interrupt?.id) {
        return;
      }

      const interruptId = state.interrupt.id;

      setState((prev) => ({ ...prev, interrupt: null, isLoading: true }));

      if (transport === "websocket" && streamRef.current instanceof WebSocketStream) {
        streamRef.current.resumeInterrupt(interruptId, decision);
      } else {
        try {
          await resumeSSEInterrupt(cid, interruptId, decision);
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error("Failed to resume interrupt"),
          }));
        }
      }
    },
    [cid, state.interrupt, transport]
  );

  // 停止生成
  const stop = useCallback(async () => {
    if (!cid) return;

    if (transport === "websocket" && streamRef.current instanceof WebSocketStream) {
      streamRef.current.stop();
    } else {
      try {
        await stopSSEGeneration(cid);
      } catch (error) {
        console.error("Failed to stop generation:", error);
      }
    }

    setState((prev) => ({ ...prev, isLoading: false }));
  }, [cid, transport]);

  // 重置状态
  const reset = useCallback(() => {
    setState(initialState);
    currentMessageRef.current = null;
  }, []);

  // 设置初始状态（用于恢复会话）
  const setInitialState = useCallback(
    (data: {
      messages?: Message[];
      todos?: TodoItem[];
      files?: Record<string, string>;
    }) => {
      setState((prev) => ({
        ...prev,
        messages: data.messages || [],
        todos: data.todos || [],
        files: data.files
          ? Object.fromEntries(
              Object.entries(data.files).map(([path, content]) => [
                path,
                { path, content, updatedAt: new Date() },
              ])
            )
          : {},
      }));
    },
    []
  );

  // 返回值
  return useMemo(
    () => ({
      // 状态
      messages: state.messages,
      toolCalls: Array.from(state.toolCalls.values()),
      subAgents: Array.from(state.subAgents.values()),
      todos: state.todos,
      files: state.files,
      interrupt: state.interrupt,
      isConnected: state.isConnected,
      isLoading: state.isLoading,
      error: state.error,

      // 方法
      sendMessage,
      resumeInterrupt,
      stop,
      reset,
      setInitialState,
    }),
    [state, sendMessage, resumeInterrupt, stop, reset, setInitialState]
  );
}

export type UseStreamReturn = ReturnType<typeof useStream>;

