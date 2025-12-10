"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  AlertCircle,
  Loader2,
  CircleCheckBigIcon,
  StopCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCall, ActionRequest, ReviewConfig } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { extractSubAgentContent } from "@/app/utils/utils";

interface ToolCallBoxProps {
  toolCall: ToolCall;
  uiComponent?: any;
  stream?: any;
  graphId?: string;
  actionRequest?: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume?: (value: any) => void;
  isLoading?: boolean;
}

export const ToolCallBox = React.memo<ToolCallBoxProps>(
  ({
    toolCall,
    uiComponent,
    stream,
    graphId,
    actionRequest,
    reviewConfig,
    onResume,
    isLoading,
  }) => {
    const [isExpanded, setIsExpanded] = useState(
      () => !!uiComponent || !!actionRequest
    );

    const { name, args, result, status } = useMemo(() => {
      return {
        name: toolCall.name || "Unknown Tool",
        args: toolCall.args || {},
        result: toolCall.result,
        status: toolCall.status || "completed",
      };
    }, [toolCall]);

    const statusIcon = useMemo(() => {
      switch (status) {
        case "completed":
        case "success":
          return <CircleCheckBigIcon size={14} className="text-green-500 dark:text-green-400" />;
        case "error":
          return (
            <AlertCircle
              size={14}
              className="text-destructive"
            />
          );
        case "pending":
          return (
            <Clock
              size={14}
              className="text-muted-foreground"
            />
          );
        case "running":
          return (
            <Loader2
              size={14}
              className="animate-spin text-blue-500 dark:text-blue-400"
            />
          );
        case "interrupted":
          return (
            <StopCircle
              size={14}
              className="text-orange-500 dark:text-orange-400"
            />
          );
        default:
          return (
            <Terminal
              size={14}
              className="text-muted-foreground"
            />
          );
      }
    }, [status]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // 检查是否有可显示的内容
    // result 可能是字符串、对象或其他类型
    const hasResult = (() => {
      if (result === undefined || result === null) return false;
      if (typeof result === 'string') return result.trim() !== '';
      if (typeof result === 'object') return Object.keys(result).length > 0;
      return true;
    })();
    const hasArgs = args && Object.keys(args).length > 0;
    // 即使没有内容，也允许点击展开（显示空状态）
    // 这样用户可以看到工具调用的详情
    const hasContent = hasResult || hasArgs || status === 'completed' || status === 'success';

    // Get status color for border accent
    const statusColor = useMemo(() => {
      switch (status) {
        case "completed":
        case "success":
          return "border-l-green-400 dark:border-l-green-500";
        case "error":
          return "border-l-red-400 dark:border-l-red-500";
        case "pending":
          return "border-l-muted-foreground";
        case "running":
          return "border-l-blue-400 dark:border-l-blue-500";
        case "interrupted":
          return "border-l-orange-400 dark:border-l-orange-500";
        default:
          return "border-l-border";
      }
    }, [status]);

    // 格式化结果为可显示的字符串，使用智能提取函数
    const formattedResult = useMemo(() => {
      if (!result) return null;
      return extractSubAgentContent(result);
    }, [result]);
    
    // 格式化参数为可显示的字符串
    const formattedArgs = useMemo(() => {
      if (!args || Object.keys(args).length === 0) return null;
      return extractSubAgentContent(args);
    }, [args]);

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border border-border border-l-[3px] transition-all duration-200",
          statusColor,
          isExpanded && hasContent ? "bg-card shadow-sm" : "bg-muted hover:bg-accent"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className={cn(
            "flex w-full items-center justify-between gap-2 border-none px-3 py-2.5 text-left shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default hover:bg-transparent"
          )}
          disabled={!hasContent}
        >
            <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className="text-sm font-medium text-foreground">
                {name}
              </span>
              {status === "pending" && (
                <span className="text-xs text-muted-foreground">Pending</span>
              )}
              {status === "running" && (
                <span className="text-xs text-blue-500 dark:text-blue-400">Running...</span>
              )}
              {(status === "completed" || status === "success") && (
                <span className="text-xs text-green-500 dark:text-green-400">Done</span>
              )}
              {status === "error" && (
                <span className="text-xs text-destructive">Error</span>
              )}
              {status === "interrupted" && (
                <span className="text-xs text-orange-500 dark:text-orange-400">Interrupted</span>
              )}
              {/* 显示执行时间 */}
              {toolCall.durationMs && (
                <span className="text-xs text-muted-foreground">
                  ({toolCall.durationMs}ms)
                </span>
              )}
            </div>
            {hasContent &&
              (isExpanded ? (
                <ChevronUp
                  size={14}
                  className="shrink-0 text-muted-foreground"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="shrink-0 text-muted-foreground"
                />
              ))}
          </div>
        </Button>

        {isExpanded && hasContent && (
          <div className="border-t border-border px-4 pb-4">
            {uiComponent && stream && graphId ? (
              <div className="mt-4">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  message={uiComponent}
                  namespace={graphId}
                  meta={{ status, args, result: result ?? "No Result Yet" }}
                />
              </div>
            ) : actionRequest && onResume ? (
              <div className="mt-4">
                <ToolApprovalInterrupt
                  actionRequest={actionRequest}
                  reviewConfig={reviewConfig}
                  onResume={onResume}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <>
                {/* 参数显示 - 使用智能格式化 */}
                {formattedArgs && (
                  <div className="mt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
                      Input
                    </h4>
                    <div className="rounded-md border border-border bg-card/50 p-3">
                      <MarkdownContent content={formattedArgs} className="text-sm" />
                    </div>
                  </div>
                )}
                {/* 结果显示 */}
                {formattedResult && (
                  <div className="mt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400"></span>
                      Output
                    </h4>
                    <div className="max-h-[500px] overflow-y-auto rounded-md border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 p-3">
                      <MarkdownContent content={formattedResult} className="text-sm" />
                    </div>
                  </div>
                )}
                {/* 显示错误信息 */}
                {toolCall.error && (
                  <div className="mt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400"></span>
                      Error
                    </h4>
                    <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {toolCall.error}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

ToolCallBox.displayName = "ToolCallBox";
