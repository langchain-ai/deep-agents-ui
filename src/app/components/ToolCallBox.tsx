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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCall, ActionRequest, ReviewConfig } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";

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
    const [expandedArgs, setExpandedArgs] = useState<Record<string, boolean>>(
      {}
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
          return <CircleCheckBigIcon size={14} className="text-emerald-500" />;
        case "error":
          return (
            <AlertCircle
              size={14}
              className="text-red-500"
            />
          );
        case "pending":
          return (
            <Loader2
              size={14}
              className="animate-spin text-blue-500"
            />
          );
        case "interrupted":
          return (
            <StopCircle
              size={14}
              className="text-orange-500"
            />
          );
        default:
          return (
            <Terminal
              size={14}
              className="text-gray-400"
            />
          );
      }
    }, [status]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    const toggleArgExpanded = useCallback((argKey: string) => {
      setExpandedArgs((prev) => ({
        ...prev,
        [argKey]: !prev[argKey],
      }));
    }, []);

    const hasContent = result || Object.keys(args).length > 0;

    // Get status color for border accent
    const statusColor = useMemo(() => {
      switch (status) {
        case "completed":
          return "border-l-emerald-400";
        case "error":
          return "border-l-red-400";
        case "pending":
          return "border-l-blue-400";
        case "interrupted":
          return "border-l-orange-400";
        default:
          return "border-l-gray-300";
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border border-gray-200 border-l-[3px] transition-all duration-200",
          statusColor,
          isExpanded && hasContent ? "bg-white shadow-sm" : "bg-gray-50 hover:bg-gray-100"
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
              <span className="text-sm font-medium text-gray-700">
                {name}
              </span>
              {status === "pending" && (
                <span className="text-xs text-blue-500">Running...</span>
              )}
              {status === "completed" && (
                <span className="text-xs text-emerald-500">Done</span>
              )}
              {status === "error" && (
                <span className="text-xs text-red-500">Error</span>
              )}
            </div>
            {hasContent &&
              (isExpanded ? (
                <ChevronUp
                  size={14}
                  className="shrink-0 text-gray-400"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="shrink-0 text-gray-400"
                />
              ))}
          </div>
        </Button>

        {isExpanded && hasContent && (
          <div className="border-t border-gray-100 px-4 pb-4">
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
                {Object.keys(args).length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                      Arguments
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(args).map(([key, value]) => (
                        <div
                          key={key}
                          className="overflow-hidden rounded-md border border-gray-200"
                        >
                          <button
                            onClick={() => toggleArgExpanded(key)}
                            className="flex w-full items-center justify-between bg-gray-50 p-2.5 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            <span className="font-mono text-blue-600">{key}</span>
                            {expandedArgs[key] ? (
                              <ChevronUp
                                size={12}
                                className="text-gray-400"
                              />
                            ) : (
                              <ChevronDown
                                size={12}
                                className="text-gray-400"
                              />
                            )}
                          </button>
                          {expandedArgs[key] && (
                            <div className="border-t border-gray-200 bg-white p-3">
                              <div className="m-0 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-gray-700">
                                {typeof value === "string"
                                  ? value
                                  : JSON.stringify(value, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result && (
                  <div className="mt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Result
                    </h4>
                    <div className="max-h-[300px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="m-0 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-gray-700">
                        {typeof result === "string"
                          ? result
                          : JSON.stringify(result, null, 2)}
                      </div>
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
