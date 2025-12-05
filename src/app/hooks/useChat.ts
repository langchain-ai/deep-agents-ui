"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { v4 as uuidv4 } from "uuid";
import { useStream, type StreamTransport } from "./useStream";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type {
  Message,
  TodoItem,
  FileItem,
  Conversation,
  ConversationDetailResponse,
  InterruptData,
} from "@/app/types/types";

// ============ 配置 ============
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/chat/stream";
const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || "http://localhost:8000/api/chat/stream";

// ============ 类型定义 ============
export interface UseChatOptions {
  /** 历史记录重新验证回调 */
  onHistoryRevalidate?: () => void;
  /** 传输方式 */
  transport?: StreamTransport;
}

export interface ChatState {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, FileItem>;
  interrupt: InterruptData | null;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
}

// ============ Hook ============
export function useChat(options: UseChatOptions = {}) {
  const { onHistoryRevalidate, transport = "websocket" } = options;

  // 认证状态
  const { token, isAuthenticated } = useAuth();

  // URL 参数管理：使用 cid 替代 threadId
  const [cid, setCid] = useQueryState("cid");

  // 使用自定义 stream hook
  const stream = useStream({
    cid,
    token: token || "",
    transport,
    wsUrl: WS_URL,
    sseUrl: SSE_URL,
    enabled: isAuthenticated && !!cid && !!token,
    onDone: onHistoryRevalidate,
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  // 加载会话历史
  useEffect(() => {
    if (!cid || !isAuthenticated) return;

    const loadConversation = async () => {
      try {
        const data = await apiClient.get<ConversationDetailResponse>(
          `/api/conversations/${cid}`
        );

        // 设置初始状态
        stream.setInitialState({
          messages: data.messages,
          todos: data.todos,
          files: data.files,
        });
      } catch (error) {
        console.error("Failed to load conversation:", error);
      }
    };

    loadConversation();
  }, [cid, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // 创建新会话
  const createConversation = useCallback(async (): Promise<string> => {
    try {
      const response = await apiClient.post<{ cid: string; conversation: Conversation }>(
        "/api/conversations"
      );
      await setCid(response.cid);
      onHistoryRevalidate?.();
      return response.cid;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      throw error;
    }
  }, [setCid, onHistoryRevalidate]);

  // 发送消息
  const sendMessage = useCallback(
    async (content: string) => {
      let currentCid = cid;

      // 如果没有会话，先创建一个
      if (!currentCid) {
        try {
          currentCid = await createConversation();
        } catch (error) {
          console.error("Failed to create conversation:", error);
          return;
        }
      }

      // 发送消息
      await stream.sendMessage(content);
      onHistoryRevalidate?.();
    },
    [cid, createConversation, stream, onHistoryRevalidate]
  );

  // 更新文件
  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!cid) return;

      try {
        await apiClient.put(`/api/conversations/${cid}/files`, { files });
      } catch (error) {
        console.error("Failed to update files:", error);
      }
    },
    [cid]
  );

  // 停止生成
  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  // 恢复中断
  const resumeInterrupt = useCallback(
    async (value: unknown) => {
      await stream.resumeInterrupt(value);
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  // 继续流（用于工具调用后继续）
  const continueStream = useCallback(async () => {
    if (!cid) return;

    try {
      await apiClient.post(`/api/conversations/${cid}/continue`);
      onHistoryRevalidate?.();
    } catch (error) {
      console.error("Failed to continue stream:", error);
    }
  }, [cid, onHistoryRevalidate]);

  // 标记会话为已解决
  const markCurrentThreadAsResolved = useCallback(async () => {
    if (!cid) return;

    try {
      await apiClient.post(`/api/conversations/${cid}/resolve`);
      onHistoryRevalidate?.();
    } catch (error) {
      console.error("Failed to mark thread as resolved:", error);
    }
  }, [cid, onHistoryRevalidate]);

  // 切换会话
  const switchConversation = useCallback(
    async (newCid: string) => {
      // 重置流状态
      stream.reset();
      // 更新 URL
      await setCid(newCid);
    },
    [stream, setCid]
  );

  // 删除会话
  const deleteConversation = useCallback(
    async (targetCid: string) => {
      try {
        await apiClient.delete(`/api/conversations/${targetCid}`);

        // 如果删除的是当前会话，清除 cid
        if (targetCid === cid) {
          await setCid(null);
          stream.reset();
        }

        onHistoryRevalidate?.();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        throw error;
      }
    },
    [cid, setCid, stream, onHistoryRevalidate]
  );

  // 获取消息元数据（兼容旧 API）
  const getMessagesMetadata = useCallback(
    (message: Message) => {
      return {
        messageId: message.id,
        firstSeenState: undefined,
        branch: undefined,
        branchOptions: undefined,
        streamMetadata: message.metadata,
      };
    },
    []
  );

  // 转换文件格式为 Record<string, string>（兼容旧 API）
  const filesAsStrings = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [path, file] of Object.entries(stream.files)) {
      result[path] = file.content;
    }
    return result;
  }, [stream.files]);

  // 返回值
  return {
    // 状态
    messages: stream.messages,
    todos: stream.todos,
    files: filesAsStrings,
    interrupt: stream.interrupt,
    isLoading: stream.isLoading,
    isConnected: stream.isConnected,
    error: stream.error,

    // 兼容旧 API
    email: undefined,
    ui: undefined,
    isThreadLoading: false,

    // 方法
    sendMessage,
    setFiles,
    stopStream,
    resumeInterrupt,
    continueStream,
    markCurrentThreadAsResolved,
    getMessagesMetadata,

    // 新方法
    createConversation,
    switchConversation,
    deleteConversation,

    // 当前会话 ID
    cid,
    setCid,
  };
}

export type ChatContextType = ReturnType<typeof useChat>;
