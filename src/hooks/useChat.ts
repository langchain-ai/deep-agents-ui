"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useQueryState } from "nuqs";
import { useStream, type StreamTransport } from "./useStream";
import { apiClient } from "@/lib/api/client";
import type {
  Message,
  TodoItem,
  FileItem,
  Conversation,
  ConversationDetailResponse,
  InterruptData,
  PaginatedResponse,
} from "@/types";

// ============ 类型定义 ============

export interface UseChatOptions {
  onHistoryRevalidate?: () => void;
  transport?: StreamTransport;
  token?: string | null;
  isAuthenticated?: boolean;
  autoLoadLatest?: boolean;
  messageLoadDelay?: number;
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

const DEFAULT_MESSAGE_LOAD_DELAY = 180;  // 每条消息的延迟时间（毫秒）- 180ms 让用户能看到平滑的加载过程
const BATCH_SIZE = 1;  // 每次加载 1 条消息，实现逐条加载效果
const PROGRESSIVE_LOAD_THRESHOLD = 3;  // 超过 3 条消息才启用渐进式加载

// ============ Hook ============

export function useChat(options: UseChatOptions = {}) {
  const { 
    onHistoryRevalidate, 
    transport = "websocket",
    token = null,
    isAuthenticated = false,
    autoLoadLatest = true,
    messageLoadDelay = DEFAULT_MESSAGE_LOAD_DELAY,
  } = options;

  // URL 参数
  const [urlCid, setUrlCid] = useQueryState("cid");
  
  // 本地状态
  const [activeCid, setActiveCid] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Refs
  const hasAutoLoadedRef = useRef(false);
  const loadCancelledRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  
  // 实际使用的 cid
  const cid = urlCid || activeCid;

  // Stream hook - 始终启用（如果已认证且有 token）
  // 不再依赖 cid，支持预连接
  const stream = useStream({
    cid,
    token: token || "",
    transport,
    enabled: isAuthenticated && !!token,
    onDone: onHistoryRevalidate,
    onError: (error) => {
      console.error("[useChat] Stream error:", error);
    },
  });

  // 转换文件格式
  const convertFilesToStrings = useCallback((files: Record<string, FileItem | string>): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [path, file] of Object.entries(files)) {
      result[path] = typeof file === 'string' ? file : file.content;
    }
    return result;
  }, []);

  // 渐进加载消息 - 逐条显示历史消息
  const loadMessagesProgressively = useCallback(async (
    messages: Message[],
    todos: TodoItem[],
    files: Record<string, FileItem | string>
  ) => {
    const filesAsStrings = convertFilesToStrings(files);
    
    if (messages.length === 0) {
      stream.setInitialState({ messages: [], todos, files: filesAsStrings });
      return;
    }

    // 如果消息较少，直接加载（不需要渐进式）
    if (messages.length <= PROGRESSIVE_LOAD_THRESHOLD) {
      stream.setInitialState({ messages, todos, files: filesAsStrings });
      return;
    }

    setIsLoadingHistory(true);
    loadCancelledRef.current = false;

    // 先清空消息，设置 todos 和 files
    stream.setInitialState({ messages: [], todos, files: filesAsStrings });

    // 逐条加载消息
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      if (loadCancelledRef.current) {
        // 如果用户取消，直接加载所有剩余消息
        stream.setInitialState({ messages, todos, files: filesAsStrings });
        break;
      }

      const batch = messages.slice(0, i + BATCH_SIZE);
      stream.setInitialState({ messages: batch, todos, files: filesAsStrings });

      // 最后一条消息不需要延迟
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, messageLoadDelay));
      }
    }

    setIsLoadingHistory(false);
  }, [stream, messageLoadDelay, convertFilesToStrings]);

  // 取消渐进加载
  const cancelProgressiveLoad = useCallback(() => {
    loadCancelledRef.current = true;
    setIsLoadingHistory(false);
  }, []);

  // 自动加载最近会话
  useEffect(() => {
    if (!autoLoadLatest || !isAuthenticated || urlCid || hasAutoLoadedRef.current) {
      return;
    }

    // 立即标记为已加载，防止 React Strict Mode 双重调用
    hasAutoLoadedRef.current = true;

    const loadLatestConversation = async () => {
      try {
        const response = await apiClient.get<PaginatedResponse<Conversation>>(
          "/conversations",
          { offset: "0", limit: "1" }
        );

        if (response.items.length > 0) {
          const latestConversation = response.items[0];
          console.log("[useChat] Auto-loading latest conversation:", latestConversation.cid);
          setUrlCid(latestConversation.cid);
        }
      } catch (error) {
        console.error("[useChat] Failed to load latest conversation:", error);
      }
    };

    loadLatestConversation();
  }, [autoLoadLatest, isAuthenticated, urlCid, setUrlCid]);

  // 跟踪当前正在加载的 cid，避免重复加载
  const loadingCidRef = useRef<string | null>(null);

  // 加载会话历史
  useEffect(() => {
    if (!urlCid || !isAuthenticated) return;
    
    // 如果已经在加载这个 cid，跳过
    if (loadingCidRef.current === urlCid) {
      return;
    }

    loadingCidRef.current = urlCid;
    cancelProgressiveLoad();

    const loadConversation = async () => {
      try {
        // 绑定到会话
        stream.connectToCid(urlCid);
        
        const data = await apiClient.get<ConversationDetailResponse>(
          `/conversations/${urlCid}`
        );

        // 确保还是同一个 cid（可能在加载过程中切换了）
        if (loadingCidRef.current !== urlCid) {
          return;
        }

        await loadMessagesProgressively(
          data.messages || [],
          data.todos || [],
          data.files || {}
        );
      } catch (error) {
        console.error("Failed to load conversation:", error);
        if ((error as { status?: number }).status === 404) {
          setUrlCid(null);
        }
      } finally {
        // 加载完成后清除标记
        if (loadingCidRef.current === urlCid) {
          loadingCidRef.current = null;
        }
      }
    };

    loadConversation();
  }, [urlCid, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // 创建新会话
  const createConversation = useCallback(async (title?: string): Promise<string> => {
    if (isCreating) {
      throw new Error("Already creating conversation");
    }

    console.log("[useChat] Creating new conversation...");
    setIsCreating(true);
    
    try {
      const response = await apiClient.post<{ cid: string; conversation: Conversation }>(
        "/conversations",
        { title }
      );
      
      const newCid = response.cid;
      console.log("[useChat] Created conversation:", newCid);
      
      // 只重置会话状态，保留 WebSocket 连接
      stream.resetConversation();
      
      // 更新状态
      await setUrlCid(newCid);
      setActiveCid(newCid);
      
      // 连接到新会话
      stream.connectToCid(newCid);
      
      onHistoryRevalidate?.();
      
      return newCid;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, setUrlCid, stream, onHistoryRevalidate]);

  // 发送消息（优化版：自动创建会话并发送）
  const sendMessage = useCallback(
    async (content: string) => {
      let currentCid = cid;

      // 如果没有会话，先创建
      if (!currentCid) {
        console.log("[useChat] No cid, creating new conversation...");
        try {
          // 保存待发送的消息
          pendingMessageRef.current = content;
          
          // 创建会话（会自动连接 WebSocket）
          currentCid = await createConversation();
          console.log("[useChat] Conversation created:", currentCid);
          
          // 等待 WebSocket 完全就绪（已连接且服务端已确认）
          const maxWait = 5000;
          const checkInterval = 100;
          let waited = 0;
          
          // 轮询检查 isReady 状态（使用 checkIsReady 方法获取最新状态）
          while (waited < maxWait) {
            if (stream.checkIsReady()) {
              console.log("[useChat] WebSocket is ready");
              break;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
          }
          
          // 如果等待超时，仍然尝试发送（消息会被加入队列）
          if (!stream.checkIsReady()) {
            console.warn("[useChat] WebSocket not fully ready after timeout, attempting to send anyway");
          }
          
          pendingMessageRef.current = null;
        } catch (error) {
          console.error("Failed to create conversation:", error);
          pendingMessageRef.current = null;
          throw error;
        }
      }

      // 发送消息
      console.log("[useChat] Sending message to cid:", currentCid);
      try {
        await stream.sendMessage(content);
        onHistoryRevalidate?.();
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [cid, createConversation, stream, onHistoryRevalidate]
  );

  // 切换会话 - 立即更新 UI，异步加载历史
  // 切换会话 - 只更新 URL，历史加载由 useEffect 处理
  const switchConversation = useCallback(
    (newCid: string) => {
      console.log("[useChat] Switching to conversation:", newCid);
      
      // 取消当前加载
      cancelProgressiveLoad();
      loadingCidRef.current = null; // 允许新的加载
      
      // 重置会话状态（清空消息等）
      stream.resetConversation();
      
      // 更新 URL（这会触发 useEffect 加载历史）
      setUrlCid(newCid);
      setActiveCid(newCid);
    },
    [stream, setUrlCid, cancelProgressiveLoad]
  );

  // 删除会话
  const deleteConversation = useCallback(
    async (targetCid: string) => {
      try {
        await apiClient.delete(`/conversations/${targetCid}`);

        if (targetCid === cid) {
          await setUrlCid(null);
          setActiveCid(null);
          stream.reset();
        }

        onHistoryRevalidate?.();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        throw error;
      }
    },
    [cid, setUrlCid, stream, onHistoryRevalidate]
  );

  // 开始新对话 - 立即创建会话并连接 WebSocket
  const startNewChat = useCallback(async () => {
    console.log("[useChat] Starting new chat - creating conversation immediately");
    cancelProgressiveLoad();
    hasAutoLoadedRef.current = true;
    
    try {
      // 调用 API 创建新会话
      const newCid = await createConversation();
      console.log("[useChat] New chat created with cid:", newCid);
    } catch (error) {
      console.error("[useChat] Failed to create new chat:", error);
      // 如果创建失败，回退到空白状态
      stream.resetConversation();
      await setUrlCid(null);
      setActiveCid(null);
    }
  }, [createConversation, setUrlCid, stream, cancelProgressiveLoad]);

  // 停止生成
  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  // 恢复中断
  const resumeInterrupt = useCallback(
    async (value: unknown) => {
      await stream.resumeInterrupt(value as { action: 'approve' | 'reject' | 'modify'; reason?: string | null; modifiedArgs?: Record<string, unknown> | null });
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  // 重新连接
  const reconnect = useCallback(() => {
    stream.reconnect();
  }, [stream]);

  // 文件格式转换
  const filesAsStrings = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [path, file] of Object.entries(stream.files)) {
      result[path] = file.content;
    }
    return result;
  }, [stream.files]);

  // 更新文件（保存到后端）
  const setFiles = useCallback(async (newFiles: Record<string, string>) => {
    if (!cid) {
      console.warn("[useChat] Cannot save files without a conversation");
      return;
    }

    try {
      await apiClient.updateConversationFiles(cid, newFiles);
      // 文件更新成功后，WebSocket 会推送更新
    } catch (error) {
      console.error("[useChat] Failed to save files:", error);
      throw error;
    }
  }, [cid]);

  // 返回值
  return {
    // 状态
    messages: stream.messages,
    todos: stream.todos,
    files: filesAsStrings,
    interrupt: stream.interrupt,
    isLoading: stream.isLoading || isCreating,
    isLoadingHistory,
    isConnected: stream.isConnected,
    connectionState: stream.connectionState,
    error: stream.error,

    // 兼容旧 API
    email: undefined,
    ui: undefined,
    isThreadLoading: false,

    // 方法
    sendMessage,
    stopStream,
    resumeInterrupt,
    reconnect,
    cancelProgressiveLoad,
    setFiles,

    // 会话管理
    createConversation,
    switchConversation,
    deleteConversation,
    startNewChat,

    // 当前会话 ID
    cid,
    setCid: async (newCid: string | null) => {
      if (newCid) {
        await setUrlCid(newCid);
        setActiveCid(newCid);
      } else {
        await setUrlCid(null);
        setActiveCid(null);
        stream.reset();
      }
    },
  };
}

export type ChatContextType = ReturnType<typeof useChat>;

