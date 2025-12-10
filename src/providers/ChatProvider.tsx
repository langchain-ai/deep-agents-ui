"use client";

import { ReactNode, createContext, useContext } from "react";
import { useChat, type ChatContextType } from "@/hooks/useChat";
import type { StreamTransport } from "@/hooks/useStream";
import { useAuth } from "@/providers/AuthProvider";

// ============ 类型定义 ============
interface ChatProviderProps {
  children: ReactNode;
  /** 历史记录重新验证回调 */
  onHistoryRevalidate?: () => void;
  /** 传输方式 */
  transport?: StreamTransport;
}

// ============ Context ============
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ============ Provider ============
export function ChatProvider({
  children,
  onHistoryRevalidate,
  transport = "websocket",
}: ChatProviderProps) {
  // 从 AuthProvider 获取认证状态
  const { token, isAuthenticated } = useAuth();

  const chat = useChat({
    onHistoryRevalidate,
    transport,
    token,
    isAuthenticated,
  });

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

// ============ Hook ============
export function useChatContext(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

// 重新导出类型
export type { ChatContextType };
