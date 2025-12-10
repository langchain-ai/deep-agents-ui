"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { ArrowUp, Square, RefreshCw } from "lucide-react";
import { ChatMessage } from "@/app/components/ChatMessage";
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
  Message,
} from "@/app/types/types";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";

// 兼容 LangGraph 和自定义消息格式
type MessageLike = Message | {
  id?: string;
  type?: string;
  role?: string;
  content: string | Array<{ type?: string; text?: string }> | null;
  tool_calls?: Array<{
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }>;
  additional_kwargs?: {
    tool_calls?: Array<{
      id?: string;
      function?: { name?: string; arguments?: unknown };
    }>;
  };
  tool_call_id?: string;
};

export const ChatInterface = React.memo(() => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useStickToBottom();

  const {
    messages,
    isLoading,
    isLoadingHistory,
    isConnected,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
    error,
    reconnect,
    cid,
    cancelProgressiveLoad,
  } = useChatContext();

  // 检查是否可以提交
  // 如果没有 cid，允许发送（发送时会自动创建会话）
  // 如果有 cid 但没有连接，禁止发送
  const submitDisabled = isLoading || (!!cid && !isConnected);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || submitDisabled) return;
      sendMessage(messageText);
      setInput("");
    },
    [input, isLoading, sendMessage, setInput, submitDisabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitDisabled) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, submitDisabled]
  );

  // 处理消息，提取工具调用
  const processedMessages = useMemo(() => {
    const messageMap = new Map<
      string,
      { message: MessageLike; toolCalls: ToolCall[] }
    >();

    messages.forEach((message: MessageLike) => {
      const messageId = message.id || `msg-${Math.random()}`;
      const messageType = (message as { type?: string }).type || (message as { role?: string }).role;

      if (messageType === "ai" || messageType === "assistant") {
        // 优先使用消息中已有的 toolCalls（来自后端的完整数据）
        const msgWithToolCalls = message as Message;
        if (msgWithToolCalls.toolCalls && Array.isArray(msgWithToolCalls.toolCalls) && msgWithToolCalls.toolCalls.length > 0) {
          // 直接使用后端提供的 toolCalls，它们已经包含完整信息
          messageMap.set(messageId, {
            message,
            toolCalls: msgWithToolCalls.toolCalls.map(tc => ({
              ...tc,
              // 如果有中断状态，覆盖
              status: interrupt && tc.status === "pending" ? "interrupted" : tc.status,
            })),
          });
          return;
        }

        // 兼容旧格式：从其他字段提取工具调用
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];

        // 提取工具调用
        const additionalKwargs = (message as { additional_kwargs?: { tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }> } }).additional_kwargs;
        const lgMessage = message as MessageLike;
        if (
          additionalKwargs?.tool_calls &&
          Array.isArray(additionalKwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...additionalKwargs.tool_calls);
        } else if (lgMessage.tool_calls && Array.isArray(lgMessage.tool_calls)) {
          toolCallsInMessage.push(
            ...lgMessage.tool_calls.filter(
              (toolCall: { name?: string }) => toolCall.name !== ""
            )
          );
        } else if (lgMessage.content && Array.isArray(lgMessage.content)) {
          const toolUseBlocks = (lgMessage.content as Array<{ type?: string }>).filter(
            (block) => block.type === "tool_use"
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }

        const toolCallsWithStatus = toolCallsInMessage.map(
          (toolCall) => {
            const name =
              toolCall.function?.name ||
              toolCall.name ||
              toolCall.type ||
              "unknown";
            const args =
              toolCall.function?.arguments ||
              toolCall.args ||
              toolCall.input ||
              {};
            return {
              id: toolCall.id || `tool-${Math.random()}`,
              name,
              args: args as Record<string, unknown>,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );

        messageMap.set(messageId, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (messageType === "tool") {
        const toolCallId = (message as { tool_call_id?: string }).tool_call_id;
        if (!toolCallId) {
          return;
        }
        for (const [, data] of messageMap.entries()) {
          const toolCallIndex = data.toolCalls.findIndex(
            (tc: ToolCall) => tc.id === toolCallId
          );
          if (toolCallIndex === -1) {
            continue;
          }
          data.toolCalls[toolCallIndex] = {
            ...data.toolCalls[toolCallIndex],
            status: "completed" as const,
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      } else if (messageType === "human" || messageType === "user") {
        messageMap.set(messageId, {
          message,
          toolCalls: [],
        });
      }
    });

    const processedArray = Array.from(messageMap.values());
    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      const prevType = prevMessage
        ? (prevMessage as { type?: string }).type || (prevMessage as { role?: string }).role
        : null;
      const currentType =
        (data.message as { type?: string }).type || (data.message as { role?: string }).role;
      return {
        ...data,
        showAvatar: currentType !== prevType,
      };
    });
  }, [messages, interrupt]);

  // 检测是否需要显示 Assistant 思考动画
  // 条件：正在加载 && 最后一条消息是用户消息（或者最后一条 Assistant 消息没有内容）
  const showAssistantThinking = useMemo(() => {
    if (!isLoading) return false;
    if (processedMessages.length === 0) return false;
    
    const lastMessage = processedMessages[processedMessages.length - 1];
    const lastMessageType = (lastMessage.message as { type?: string }).type || 
                           (lastMessage.message as { role?: string }).role;
    
    // 如果最后一条是用户消息，显示思考动画
    if (lastMessageType === "human" || lastMessageType === "user") {
      return true;
    }
    
    // 如果最后一条是 Assistant 消息但没有内容，也显示思考动画
    if (lastMessageType === "ai" || lastMessageType === "assistant") {
      const content = extractStringFromMessageContent(lastMessage.message);
      const hasToolCalls = lastMessage.toolCalls.length > 0;
      if (!content?.trim() && !hasToolCalls) {
        return true;
      }
    }
    
    return false;
  }, [isLoading, processedMessages]);

  // 解析中断数据中的 action requests 和 review configs
  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as Record<string, unknown>)["action_requests"];
    if (!actionRequests || !Array.isArray(actionRequests)) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as Record<string, unknown>)["review_configs"];
    if (!reviewConfigs || !Array.isArray(reviewConfigs)) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.actionName, rc])
    );
  }, [interrupt]);

  // 连接状态：只显示一个提示，优先显示错误
  // 只有当有 cid 且不在加载历史记录时才显示连接状态
  // 注意：新会话创建过程中不显示连接状态（isLoading 为 true）
  const showError = error && !isConnected && !!cid;
  // 只有当有 cid、没有连接、没有错误、没有在加载、且不在加载历史时才显示连接提示
  const showConnecting = !isConnected && !error && !isLoading && !isLoadingHistory && !!cid;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Error Banner with Retry Button */}
      {showError && (
        <div className="flex flex-shrink-0 items-center justify-between border-b border-destructive/20 bg-destructive/10 px-4 py-2">
          <p className="text-sm text-destructive">{error.message}</p>
          {reconnect && (
            <button
              onClick={reconnect}
              className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        ref={scrollRef}
      >
        <div
          className="mx-auto w-full max-w-[1000px] px-6 py-4"
          ref={contentRef}
        >
          {/* Connecting Status - 居中显示 */}
          {showConnecting && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Connecting to server...</p>
            </div>
          )}

          {/* Loading History - 居中显示 */}
          {isLoadingHistory && processedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading conversation history...</p>
              <button
                onClick={cancelProgressiveLoad}
                className="mt-3 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Skip
              </button>
            </div>
          )}

          {/* Empty State - 欢迎界面 */}
          {processedMessages.length === 0 && !showConnecting && !isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Start a conversation
              </h3>
              <p className="text-center text-sm text-muted-foreground">
                Type a message below to begin chatting with the AI assistant.
              </p>
            </div>
          )}

          {/* Messages List */}
          {processedMessages.length > 0 && (
            <div className="divide-y divide-border">
              {processedMessages.map((data, index) => {
                const isLastMessage = index === processedMessages.length - 1;
                const messageType = (data.message as { type?: string }).type || 
                                   (data.message as { role?: string }).role;
                const isAssistant = messageType === "ai" || messageType === "assistant";
                
                // 判断这条消息是否正在思考（最后一条 Assistant 消息且没有内容）
                const isThinkingMessage = isLastMessage && isAssistant && isLoading && 
                  !extractStringFromMessageContent(data.message)?.trim() && 
                  data.toolCalls.length === 0;
                
                return (
                  <ChatMessage
                    key={data.message.id || index}
                    message={data.message}
                    toolCalls={data.toolCalls}
                    isLoading={isLoading}
                    isThinking={isThinkingMessage}
                    actionRequestsMap={
                      isLastMessage ? actionRequestsMap : undefined
                    }
                    reviewConfigsMap={
                      isLastMessage ? reviewConfigsMap : undefined
                    }
                    onResumeInterrupt={resumeInterrupt}
                    animate={isLoadingHistory}
                  />
                );
              })}
              
              {/* 如果最后一条是用户消息且正在加载，显示 Assistant 思考占位符 */}
              {showAssistantThinking && (() => {
                const lastMessage = processedMessages[processedMessages.length - 1];
                const lastMessageType = (lastMessage?.message as { type?: string }).type || 
                                       (lastMessage?.message as { role?: string }).role;
                const isLastUser = lastMessageType === "human" || lastMessageType === "user";
                
                if (isLastUser) {
                  return (
                    <ChatMessage
                      key="thinking-placeholder"
                      message={{ id: "thinking", role: "assistant", content: "" }}
                      toolCalls={[]}
                      isLoading={true}
                      isThinking={true}
                    />
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom with proper spacing */}
      <div className="flex-shrink-0 border-t border-border bg-card p-4">
        <div className="mx-auto max-w-[1000px]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col rounded-2xl border border-border bg-background shadow-sm transition-colors focus-within:border-primary"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Running..." : "Write your message..."}
              className="min-h-[80px] flex-1 resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              rows={3}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Define Worthy Criteria
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Research User Queries
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Keyword Research Tools
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  more →
                </button>
              </div>
              {/* Send Button */}
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? stopStream : undefined}
                disabled={!isLoading && (submitDisabled || !input.trim())}
                style={{ backgroundColor: isLoading ? 'hsl(0, 84%, 60%)' : (!isLoading && (submitDisabled || !input.trim())) ? undefined : 'hsl(173, 58%, 35%)' }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isLoading
                    ? "text-white shadow-sm hover:opacity-90"
                    : "text-white shadow-sm hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                )}
              >
                {isLoading ? (
                  <>
                    <Square size={14} />
                    Stop
                  </>
                ) : (
                  <>
                    <ArrowUp size={16} />
                    Send
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
