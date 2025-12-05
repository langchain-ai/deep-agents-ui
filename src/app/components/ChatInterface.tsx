"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { ArrowUp, Square } from "lucide-react";
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
  content: string | Array<{ type?: string; text?: string }>;
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
    isConnected,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
    error,
  } = useChatContext();

  // 检查是否可以提交
  const submitDisabled = isLoading || !isConnected;

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
        } else if (Array.isArray(lgMessage.content)) {
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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && !isLoading && (
        <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <p className="text-sm text-yellow-600">Connecting to server...</p>
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
          {processedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
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
              <h3 className="mb-2 text-lg font-medium text-gray-700">
                Start a conversation
              </h3>
              <p className="text-center text-sm text-gray-400">
                Type a message below to begin chatting with the AI assistant.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {processedMessages.map((data, index) => {
                const isLastMessage = index === processedMessages.length - 1;
                return (
                  <ChatMessage
                    key={data.message.id || index}
                    message={data.message}
                    toolCalls={data.toolCalls}
                    isLoading={isLoading}
                    actionRequestsMap={
                      isLastMessage ? actionRequestsMap : undefined
                    }
                    reviewConfigsMap={
                      isLastMessage ? reviewConfigsMap : undefined
                    }
                    onResumeInterrupt={resumeInterrupt}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom with proper spacing */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-[1000px]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Running..." : "Write your message..."}
              className="min-h-[80px] flex-1 resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-relaxed text-gray-700 outline-none placeholder:text-gray-400"
              rows={3}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  Define Worthy Criteria
                </button>
                <button
                  type="button"
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  Research User Queries
                </button>
                <button
                  type="button"
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  Keyword Research Tools
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:text-teal-600"
                >
                  more →
                </button>
              </div>
              {/* Send Button */}
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? stopStream : undefined}
                disabled={!isLoading && (submitDisabled || !input.trim())}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isLoading
                    ? "bg-red-500 text-white shadow-sm hover:bg-red-600"
                    : "bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
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
