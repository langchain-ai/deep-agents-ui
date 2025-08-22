"use client";

import React, { useEffect, useMemo } from "react";
import { User, Bot } from "lucide-react";
import { SubAgentIndicator } from "../SubAgentIndicator/SubAgentIndicator";
import { ToolCallBox } from "../ToolCallBox/ToolCallBox";
import { MarkdownContent } from "../MarkdownContent/MarkdownContent";
import type { SubAgent, ToolCall } from "../../types/types";
import { Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "../../utils/utils";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  toolCalls: ToolCall[];
  showAvatar: boolean;
  onSelectSubAgent: (subAgent: SubAgent | null) => void;
  selectedSubAgent: SubAgent | null;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({ message, toolCalls, showAvatar, onSelectSubAgent, selectedSubAgent }) => {
    const isUser = message.type === "human";
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
          return {
            id: toolCall.id,
            name: toolCall.name,
            subAgentName: String(toolCall.args["subagent_type"] || ""),
            input: toolCall.args,
            output: toolCall.result ? { result: toolCall.result } : undefined,
            status: toolCall.status,
          } as SubAgent;
        });
    }, [toolCalls]);

    const subAgentsString = useMemo(() => {
      return JSON.stringify(subAgents);
    }, [subAgents]);

    useEffect(() => {
      if (subAgents.some((subAgent) => subAgent.id === selectedSubAgent?.id)) {
        onSelectSubAgent(
          subAgents.find((subAgent) => subAgent.id === selectedSubAgent?.id)!,
        );
      }
    }, [selectedSubAgent, onSelectSubAgent, subAgentsString, subAgents]);

    return (
      <div
        className={cn(
          "flex w-full max-w-full overflow-x-hidden",
          isUser ? "flex-row-reverse" : "",
        )}
        style={{ gap: "0.5rem" }}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            !showAvatar
              ? "bg-transparent"
              : isUser
                ? "bg-[var(--color-user-message)]"
                : "bg-[var(--color-avatar-bg)]",
          )}
          style={{ marginTop: "1rem" }}
        >
          {showAvatar &&
            (isUser ? (
              <User className="h-4 w-4 text-white" />
            ) : (
              <Bot className="h-4 w-4 text-[var(--color-secondary)]" />
            ))}
        </div>
        <div className="max-w-[70%] min-w-0 flex-shrink-0">
          {hasContent && (
            <div
              className={cn(
                "w-fit max-w-full overflow-hidden rounded-lg break-words",
                isUser
                  ? "ml-auto bg-[var(--color-user-message)] text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
              )}
              style={{ padding: "0.5rem", marginTop: "1rem" }}
            >
              {isUser ? (
                <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap">
                  {messageContent}
                </p>
              ) : (
                <MarkdownContent content={messageContent} />
              )}
            </div>
          )}
          {hasToolCalls && (
            <div
              className="flex w-fit max-w-full flex-col"
              style={{ marginTop: "1rem" }}
            >
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
                  />
                );
              })}
            </div>
          )}
          {!isUser && subAgents.length > 0 && (
            <div
              className="flex w-fit max-w-full flex-col"
              style={{ gap: "1rem" }}
            >
              {subAgents.map((subAgent) => (
                <SubAgentIndicator
                  key={subAgent.id}
                  subAgent={subAgent}
                  onClick={() => onSelectSubAgent(subAgent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";
