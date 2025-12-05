"use client";

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type { Conversation, PaginatedResponse, ConversationDetailResponse } from "@/app/types/types";

// ============ 配置 ============
const PAGE_SIZE = 20;

// ============ 类型定义 ============
export interface ConversationItem {
  cid: string;
  title: string;
  updatedAt: Date;
  status: Conversation["status"];
  description?: string;
  messageCount?: number;
}

interface UseConversationsOptions {
  /** 状态过滤 */
  status?: Conversation["status"];
  /** 每页数量 */
  limit?: number;
}

// ============ Hook: 会话列表（分页） ============
export function useConversations(options: UseConversationsOptions = {}) {
  const { isAuthenticated, token } = useAuth();
  const { status, limit = PAGE_SIZE } = options;

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    (pageIndex, previousPageData: ConversationItem[] | null) => {
      // 未认证时不请求
      if (!isAuthenticated || !token) return null;

      // 如果上一页没有数据，说明已经到底了
      if (previousPageData && previousPageData.length === 0) return null;

      return {
        key: "conversations",
        pageIndex,
        limit,
        status,
      };
    },
    async ({ pageIndex, limit, status }) => {
      const params: Record<string, string> = {
        offset: String(pageIndex * limit),
        limit: String(limit),
      };
      if (status) params.status = status;

      const response = await apiClient.get<PaginatedResponse<Conversation>>(
        "/api/conversations",
        params
      );

      // 转换为 ConversationItem 格式
      return response.items.map(
        (conv): ConversationItem => ({
          cid: conv.cid,
          title: conv.title || "Untitled Conversation",
          updatedAt: new Date(conv.updatedAt),
          status: conv.status,
          description: conv.lastMessage,
          messageCount: conv.messageCount,
        })
      );
    },
    {
      revalidateFirstPage: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // 扁平化数据
  const conversations = data ? data.flat() : [];

  // 是否还有更多
  const hasMore = data ? data[data.length - 1]?.length === limit : false;

  // 加载更多
  const loadMore = () => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  };

  return {
    conversations,
    isLoading,
    isValidating,
    error,
    hasMore,
    loadMore,
    mutate,
  };
}

// ============ Hook: 单个会话详情 ============
export function useConversation(cid: string | null) {
  const { isAuthenticated, token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    cid && isAuthenticated && token ? `/api/conversations/${cid}` : null,
    () => apiClient.get<ConversationDetailResponse>(`/api/conversations/${cid}`),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    conversation: data,
    isLoading,
    error,
    mutate,
  };
}

// ============ Hook: 创建会话 ============
export function useCreateConversation() {
  const createConversation = async (title?: string): Promise<Conversation> => {
    const response = await apiClient.post<{ conversation: Conversation }>(
      "/api/conversations",
      { title }
    );
    return response.conversation;
  };

  return { createConversation };
}

// ============ Hook: 删除会话 ============
export function useDeleteConversation() {
  const deleteConversation = async (cid: string): Promise<void> => {
    await apiClient.delete(`/api/conversations/${cid}`);
  };

  return { deleteConversation };
}

// ============ Hook: 更新会话 ============
export function useUpdateConversation() {
  const updateConversation = async (
    cid: string,
    data: Partial<Pick<Conversation, "title" | "status">>
  ): Promise<Conversation> => {
    const response = await apiClient.patch<{ conversation: Conversation }>(
      `/api/conversations/${cid}`,
      data
    );
    return response.conversation;
  };

  return { updateConversation };
}

// ============ 兼容旧 API 的类型 ============
export interface ThreadItem {
  id: string;
  updatedAt: Date;
  status: Conversation["status"];
  title: string;
  description: string;
}

// ============ 兼容旧 API 的 Hook ============
/**
 * 兼容旧的 useThreads API
 * @deprecated 请使用 useConversations
 */
export function useThreads(options: { status?: Conversation["status"]; limit?: number } = {}) {
  const result = useConversations(options);

  // 转换为旧格式
  const threads: ThreadItem[] = result.conversations.map((conv) => ({
    id: conv.cid,
    updatedAt: conv.updatedAt,
    status: conv.status,
    title: conv.title,
    description: conv.description || "",
  }));

  return {
    data: [threads],
    isLoading: result.isLoading,
    isValidating: result.isValidating,
    error: result.error,
    size: 1,
    setSize: () => {},
    mutate: result.mutate,
  };
}

