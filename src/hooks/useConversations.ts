"use client";

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { apiClient } from "@/lib/api/client";
import type { Conversation, PaginatedResponse, ConversationDetailResponse } from "@/types";

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
  /** 是否已认证 */
  isAuthenticated?: boolean;
  /** 认证 token */
  token?: string | null;
}

// ============ Hook: 会话列表（分页） ============
export function useConversations(options: UseConversationsOptions = {}) {
  const { status, limit = PAGE_SIZE, isAuthenticated = false, token = null } = options;

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
        "/conversations",
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
      revalidateFirstPage: false,  // 禁用自动重新验证第一页，防止重复请求
      revalidateOnFocus: false,    // 禁用焦点时重新验证
      revalidateOnReconnect: false, // 禁用重连时重新验证
      dedupingInterval: 5000,      // 5秒内相同请求去重
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
export function useConversation(cid: string | null, options: { isAuthenticated?: boolean; token?: string | null } = {}) {
  const { isAuthenticated = false, token = null } = options;

  const { data, error, isLoading, mutate } = useSWR(
    cid && isAuthenticated && token ? `/conversations/${cid}` : null,
    () => apiClient.get<ConversationDetailResponse>(`/conversations/${cid}`),
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
      "/conversations",
      { title }
    );
    return response.conversation;
  };

  return { createConversation };
}

// ============ Hook: 删除会话 ============
export function useDeleteConversation() {
  const deleteConversation = async (cid: string): Promise<void> => {
    await apiClient.delete(`/conversations/${cid}`);
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
      `/conversations/${cid}`,
      data
    );
    return response.conversation;
  };

  return { updateConversation };
}

