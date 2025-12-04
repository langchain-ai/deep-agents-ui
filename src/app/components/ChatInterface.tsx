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
} from "@/app/types/types";
import type { Assistant, Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useStickToBottom();

  const {
    stream,
    messages,
    ui,
    isLoading,
    isThreadLoading,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
  } = useChatContext();

  const submitDisabled = isLoading || !assistant;

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

  // TODO: can we make this part of the hook?
  const processedMessages = useMemo(() => {
    /*
     1. Loop through all messages
     2. For each AI message, add the AI message, and any tool calls to the messageMap
     3. For each tool message, find the corresponding tool call in the messageMap and update the status and output
    */
    const messageMap = new Map<
      string,
      { message: Message; toolCalls: ToolCall[] }
    >();
    messages.forEach((message: Message) => {
      if (message.type === "ai") {
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];
        if (
          message.additional_kwargs?.tool_calls &&
          Array.isArray(message.additional_kwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...message.additional_kwargs.tool_calls);
        } else if (message.tool_calls && Array.isArray(message.tool_calls)) {
          toolCallsInMessage.push(
            ...message.tool_calls.filter(
              (toolCall: { name?: string }) => toolCall.name !== ""
            )
          );
        } else if (Array.isArray(message.content)) {
          const toolUseBlocks = message.content.filter(
            (block: { type?: string }) => block.type === "tool_use"
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }
        const toolCallsWithStatus = toolCallsInMessage.map(
          (toolCall: {
            id?: string;
            function?: { name?: string; arguments?: unknown };
            name?: string;
            type?: string;
            args?: unknown;
            input?: unknown;
          }) => {
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
              args,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );
        messageMap.set(message.id!, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
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
      } else if (message.type === "human") {
        messageMap.set(message.id!, {
          message,
          toolCalls: [],
        });
      }
    });
    const processedArray = Array.from(messageMap.values());
    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      return {
        ...data,
        showAvatar: data.message.type !== prevMessage?.type,
      };
    });
  }, [messages, interrupt]);

  // Parse out any action requests or review configs from the interrupt
  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as any)["action_requests"];
    if (!actionRequests) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as any)["review_configs"];
    if (!reviewConfigs) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.actionName, rc])
    );
  }, [interrupt]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Messages Area - Scrollable */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        ref={scrollRef}
      >
        <div
          className="mx-auto w-full max-w-[1000px] px-6 py-4"
          ref={contentRef}
        >
          {isThreadLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500"></div>
                <p className="text-sm text-gray-400">Loading conversation...</p>
              </div>
            </div>
          ) : processedMessages.length === 0 ? (
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
              <h3 className="mb-2 text-lg font-medium text-gray-700">Start a conversation</h3>
              <p className="text-center text-sm text-gray-400">
                Type a message below to begin chatting with the AI assistant.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {processedMessages.map((data, index) => {
                const messageUi = ui?.filter(
                  (u: any) => u.metadata?.message_id === data.message.id
                );
                const isLastMessage = index === processedMessages.length - 1;
                return (
                  <ChatMessage
                    key={data.message.id}
                    message={data.message}
                    toolCalls={data.toolCalls}
                    isLoading={isLoading}
                    actionRequestsMap={
                      isLastMessage ? actionRequestsMap : undefined
                    }
                    reviewConfigsMap={
                      isLastMessage ? reviewConfigsMap : undefined
                    }
                    ui={messageUi}
                    stream={stream}
                    onResumeInterrupt={resumeInterrupt}
                    graphId={assistant?.graph_id}
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
