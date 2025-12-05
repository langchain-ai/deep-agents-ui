"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Bot, User } from "lucide-react";
import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import type {
  SubAgent,
  ToolCall,
  ActionRequest,
  ReviewConfig,
  Message,
} from "@/app/types/types";
import {
  extractSubAgentContent,
  extractStringFromMessageContent,
} from "@/app/utils/utils";
import { cn } from "@/lib/utils";

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
  additional_kwargs?: Record<string, unknown>;
  tool_call_id?: string;
};

interface ChatMessageProps {
  message: MessageLike;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: unknown[];
  stream?: unknown;
  onResumeInterrupt?: (value: unknown) => void;
  graphId?: string;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    toolCalls,
    isLoading,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    graphId,
  }) => {
    // 兼容 type 和 role 两种格式
    const messageType = (message as { type?: string }).type || (message as { role?: string }).role;
    const isUser = messageType === "human" || messageType === "user";
    const messageContent = extractStringFromMessageContent(message);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;
    const subAgents = useMemo(() => {
      return toolCalls
        .filter((toolCall: ToolCall) => {
          return (
            toolCall.name === "task" &&
            toolCall.args["subagent_type"] &&
            toolCall.args["subagent_type"] !== "" &&
            toolCall.args["subagent_type"] !== null
          );
        })
        .map((toolCall: ToolCall) => {
          const subagentType = (toolCall.args as Record<string, unknown>)[
            "subagent_type"
          ] as string;
          return {
            id: toolCall.id,
            name: toolCall.name,
            subAgentName: subagentType,
            input: toolCall.args,
            output: toolCall.result ? { result: toolCall.result } : undefined,
            status: toolCall.status,
          } as SubAgent;
        });
    }, [toolCalls]);

    const [expandedSubAgents, setExpandedSubAgents] = useState<
      Record<string, boolean>
    >({});
    const isSubAgentExpanded = useCallback(
      (id: string) => expandedSubAgents[id] ?? true,
      [expandedSubAgents]
    );
    const toggleSubAgent = useCallback((id: string) => {
      setExpandedSubAgents((prev) => ({
        ...prev,
        [id]: prev[id] === undefined ? false : !prev[id],
      }));
    }, []);

    return (
      <div
        className={cn(
          "flex w-full max-w-full gap-3 overflow-x-hidden py-3",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isUser ? "bg-gray-800" : "bg-gradient-to-br from-teal-400 to-teal-600"
            )}
          >
            {isUser ? (
              <User size={16} className="text-white" />
            ) : (
              <Bot size={16} className="text-white" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            "min-w-0 flex-1",
            isUser ? "max-w-[70%]" : "max-w-full"
          )}
        >
          {/* Role Label */}
          <div className={cn("mb-1 text-xs font-medium", isUser ? "text-right text-gray-500" : "text-gray-500")}>
            {isUser ? "You" : "Assistant"}
          </div>

          {hasContent && (
            <div className={cn("relative flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "overflow-hidden break-words text-sm font-normal leading-[160%]",
                  isUser
                    ? "rounded-2xl rounded-tr-sm bg-gray-800 px-4 py-3 text-white"
                    : "rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3"
                )}
              >
                {isUser ? (
                  <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {messageContent}
                  </p>
                ) : hasContent ? (
                  <MarkdownContent content={messageContent} />
                ) : null}
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {hasToolCalls && (
            <div className="mt-3 flex w-full flex-col gap-2">
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                const toolCallGenUiComponent = ui?.find(
                  (u: unknown) => (u as { metadata?: { tool_call_id?: string } })?.metadata?.tool_call_id === toolCall.id
                );
                const actionRequest = actionRequestsMap?.get(toolCall.name);
                const reviewConfig = reviewConfigsMap?.get(toolCall.name);
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
                    uiComponent={toolCallGenUiComponent}
                    stream={stream}
                    graphId={graphId}
                    actionRequest={actionRequest}
                    reviewConfig={reviewConfig}
                    onResume={onResumeInterrupt}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          )}

          {/* SubAgents */}
          {!isUser && subAgents.length > 0 && (
            <div className="mt-3 flex w-full max-w-full flex-col gap-2">
              {subAgents.map((subAgent) => (
                <div
                  key={subAgent.id}
                  className="flex w-full flex-col"
                >
                  <SubAgentIndicator
                    subAgent={subAgent}
                    onClick={() => toggleSubAgent(subAgent.id)}
                    isExpanded={isSubAgentExpanded(subAgent.id)}
                  />
                  {isSubAgentExpanded(subAgent.id) && (
                    <div className="ml-4 mt-2 w-[calc(100%-1rem)] rounded-lg border-l-2 border-teal-400 bg-gray-50 p-4">
                      <div className="mb-3">
                        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                          INPUT
                        </h4>
                        <div className="text-sm text-gray-700">
                          <MarkdownContent
                            content={extractSubAgentContent(subAgent.input)}
                          />
                        </div>
                      </div>
                      {subAgent.output && (
                        <div className="border-t border-gray-200 pt-3">
                          <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                            OUTPUT
                          </h4>
                          <div className="text-sm text-gray-700">
                            <MarkdownContent
                              content={extractSubAgentContent(subAgent.output)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
