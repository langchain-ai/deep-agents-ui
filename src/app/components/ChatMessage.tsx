"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Bot, User, FileText, ChevronDown, ChevronUp, Coins } from "lucide-react";
import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import type {
  SubAgent,
  ToolCall,
  ActionRequest,
  ReviewConfig,
  Message,
  ContextSearchResult,
  TokenUsageSummary,
} from "@/app/types/types";
import {
  extractSubAgentContent,
  extractStringFromMessageContent,
} from "@/app/utils/utils";
import { cn } from "@/lib/utils";

// 思考中动画组件 - 动态跳动的三个点
const ThinkingIndicator = React.memo(() => {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
});
ThinkingIndicator.displayName = "ThinkingIndicator";

// Citations 组件 - 显示引用来源
const CitationsSection = React.memo<{ citations: ContextSearchResult[] }>(({ citations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 过滤掉无效的 citations（没有内容或相似度过低）
  const validCitations = citations?.filter(cite => 
    cite && 
    cite.content && 
    cite.content.trim() !== '' && 
    cite.similarity > 0  // 确保有有效的相似度分数
  ) || [];

  if (validCitations.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>Sources ({validCitations.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          {validCitations.map((cite, index) => (
            <div
              key={`${cite.contextId}-${cite.chunkIndex}`}
              className="rounded-md border border-border bg-background p-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  [{index + 1}] {cite.filename}
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {(cite.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {cite.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
CitationsSection.displayName = "CitationsSection";

// Token Usage 组件 - 显示 token 使用量
const TokenUsageDisplay = React.memo<{ usage: TokenUsageSummary }>(({ usage }) => {
  // 确保 usage 和 totalTokens 都存在
  if (!usage || typeof usage.totalTokens !== 'number' || usage.totalTokens === 0) return null;

  const totalTokens = usage.totalTokens ?? 0;
  const totalCost = usage.totalCost ?? 0;
  const callCount = usage.callCount ?? 1;

  return (
    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
      <Coins className="h-3 w-3" />
      <span>{totalTokens.toLocaleString()} tokens</span>
      {totalCost > 0 && (
        <>
          <span>•</span>
          <span>${totalCost.toFixed(4)}</span>
        </>
      )}
      {callCount > 1 && (
        <>
          <span>•</span>
          <span>{callCount} calls</span>
        </>
      )}
    </div>
  );
});
TokenUsageDisplay.displayName = "TokenUsageDisplay";

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
  additional_kwargs?: Record<string, unknown>;
  tool_call_id?: string;
};

interface ChatMessageProps {
  message: MessageLike;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  isThinking?: boolean;  // 是否正在等待 Assistant 响应
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: unknown[];
  stream?: unknown;
  onResumeInterrupt?: (value: unknown) => void;
  graphId?: string;
  /** 是否启用淡入动画（用于渐进加载历史消息） */
  animate?: boolean;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    toolCalls,
    isLoading,
    isThinking,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    graphId,
    animate = false,
  }) => {
    // 从 localStorage 读取 showTokenUsage 设置
    // 默认开启 token 显示
    const [showTokenUsage, setShowTokenUsage] = useState(true);
    
    useEffect(() => {
      // 从 localStorage 读取设置，如果没有设置则默认开启
      try {
        const settings = localStorage.getItem("userSettings");
        if (settings) {
          const parsed = JSON.parse(settings);
          // 只有明确设置为 false 时才关闭
          setShowTokenUsage(parsed.showTokenUsage !== false);
        }
      } catch {
        // 忽略解析错误，保持默认开启
      }
      
      // 监听 storage 变化（当设置在其他地方更新时）
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "userSettings" && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setShowTokenUsage(parsed.showTokenUsage !== false);
          } catch {
            // 忽略解析错误
          }
        }
      };
      
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }, []);
    
    // 兼容 type 和 role 两种格式
    const messageType = (message as { type?: string }).type || (message as { role?: string }).role;
    const isUser = messageType === "human" || messageType === "user";
    const messageContent = extractStringFromMessageContent(message);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;
    
    // 是否显示思考动画：非用户消息、没有内容、正在思考
    const showThinking = !isUser && !hasContent && !hasToolCalls && isThinking;
    
    // 提取子代理调用
    // 根据 FRONTEND_API_GUIDE.md: type='subagent' 或 name='task' 且有 targetSubagent/subagent_type
    const subAgents = useMemo(() => {
      return toolCalls
        .filter((toolCall: ToolCall) => {
          // 新格式：type='subagent' 且有 targetSubagent
          if (toolCall.type === "subagent" && toolCall.targetSubagent) {
            return true;
          }
          // 旧格式：name='task' 且有 subagent_type
          if (
            toolCall.name === "task" &&
            toolCall.args["subagent_type"] &&
            toolCall.args["subagent_type"] !== "" &&
            toolCall.args["subagent_type"] !== null
          ) {
            return true;
          }
          return false;
        })
        .map((toolCall: ToolCall) => {
          // 获取子代理名称
          const subAgentName = toolCall.targetSubagent || 
            (toolCall.args as Record<string, unknown>)["subagent_type"] as string;
          
          // 映射状态
          let status: SubAgent["status"] = "pending";
          if (toolCall.status === "running") status = "running";
          else if (toolCall.status === "completed" || toolCall.status === "success") status = "completed";
          else if (toolCall.status === "error") status = "error";
          
          return {
            id: toolCall.id,
            name: toolCall.name,
            subAgentName: subAgentName,
            input: toolCall.args,
            output: toolCall.result ? { result: toolCall.result } : undefined,
            status,
          } as SubAgent;
        });
    }, [toolCalls]);

    const [expandedSubAgents, setExpandedSubAgents] = useState<
      Record<string, boolean>
    >({});
    const isSubAgentExpanded = useCallback(
      (id: string) => expandedSubAgents[id] ?? false,  // 默认不展开
      [expandedSubAgents]
    );
    const toggleSubAgent = useCallback((id: string) => {
      setExpandedSubAgents((prev) => ({
        ...prev,
        [id]: prev[id] === undefined ? true : !prev[id],  // 点击时展开
      }));
    }, []);

    return (
      <div
        className={cn(
          "flex w-full max-w-full gap-3 overflow-x-hidden py-3",
          isUser ? "flex-row-reverse" : "flex-row",
          animate && "animate-message-fade-in"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isUser ? "bg-[#1a7f64] dark:bg-[#2dd4bf]" : "bg-gradient-to-br from-primary to-primary/80"
            )}
          >
            {isUser ? (
              <User size={16} className="text-white dark:text-gray-900" />
            ) : (
              <Bot size={16} className="text-primary-foreground" />
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
          <div className={cn("mb-1 text-xs font-medium text-muted-foreground", isUser && "text-right")}>
            {isUser ? "You" : "Assistant"}
          </div>

          {/* 思考中动画 - 当没有内容且正在加载时显示 */}
          {!isUser && !hasContent && !hasToolCalls && (isThinking || isLoading) && (
            <div className="relative flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-secondary/50 px-4 py-3 dark:bg-secondary/30">
                <ThinkingIndicator />
              </div>
            </div>
          )}

          {/* 用户消息直接显示 */}
          {isUser && hasContent && (
            <div className="relative flex justify-end">
              <div className="overflow-hidden break-words rounded-2xl rounded-tr-sm bg-[#1a7f64] px-4 py-3 text-sm font-normal leading-[160%] text-white shadow-sm dark:bg-[#2dd4bf] dark:text-gray-900">
                <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {messageContent}
                </p>
              </div>
            </div>
          )}

          {/* Assistant 消息：先显示工具和子代理，最后显示总结内容 */}
          {!isUser && (
            <>
              {/* SubAgents - 先显示子代理调用 */}
              {subAgents.length > 0 && (
                <div className="flex w-full max-w-full flex-col gap-3">
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
                        <div className="mt-2 space-y-3 rounded-lg border border-border bg-card/50 p-4">
                          {/* Input Section */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
                              Task Input
                            </h4>
                            <div className="rounded-md border border-border bg-muted/30 p-3">
                              <MarkdownContent
                                content={extractSubAgentContent(subAgent.input)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          {/* Output Section */}
                          {subAgent.output && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400"></span>
                                Result
                              </h4>
                              <div className="max-h-[500px] overflow-y-auto rounded-md border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 p-3">
                                <MarkdownContent
                                  content={extractSubAgentContent(subAgent.output)}
                                  className="text-sm"
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

              {/* Tool Calls - 排除子代理调用和内部工具（它们单独显示或不显示） */}
              {hasToolCalls && (
                <div className={cn("flex w-full flex-col gap-2", subAgents.length > 0 && "mt-3")}>
                  {toolCalls
                    .filter((toolCall: ToolCall) => {
                      // 排除子代理调用
                      if (toolCall.type === "subagent") return false;
                      if (toolCall.name === "task" && toolCall.args["subagent_type"]) return false;
                      // 排除 todos 相关的工具调用（显示在左侧 Tasks 面板，不在聊天中重复显示）
                      if (toolCall.name === "write_todos" || 
                          toolCall.name === "todo_write" || 
                          toolCall.name === "update_todos" ||
                          toolCall.name?.includes("todo")) return false;
                      return true;
                    })
                    .map((toolCall: ToolCall) => {
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

              {/* 消息内容（Summary）- 最后显示 */}
              {hasContent && (
                <div className={cn(
                  "relative flex flex-col justify-start",
                  (hasToolCalls || subAgents.length > 0) && "mt-3"
                )}>
                  <div className="overflow-hidden break-words rounded-2xl rounded-tl-sm bg-secondary/50 px-4 py-3 text-sm font-normal leading-[160%] text-foreground dark:bg-secondary/30">
                    <MarkdownContent content={messageContent} />
                  </div>
                  
                  {/* Citations - 显示引用来源 */}
                  {(message as Message).metadata?.citations && (
                    <CitationsSection citations={(message as Message).metadata!.citations!} />
                  )}
                  
                  {/* Token Usage - 显示 token 使用量（需要用户开启设置） */}
                  {showTokenUsage && (message as Message).metadata?.usage && (
                    <TokenUsageDisplay usage={(message as Message).metadata!.usage!} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
