"use client";

import React from "react";
import { ChevronDown, ChevronUp, Bot, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import { cn } from "@/lib/utils";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onClick: () => void;
  isExpanded?: boolean;
}

// 根据状态返回对应的图标和颜色
const getStatusInfo = (status: SubAgent["status"]) => {
  switch (status) {
    case "running":
    case "active":
      return {
        icon: <Loader2 size={14} className="animate-spin" />,
        bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
        borderColor: "border-blue-500/30",
        textColor: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-500",
      };
    case "completed":
    case "success":
      return {
        icon: <CheckCircle size={14} />,
        bgColor: "bg-green-500/10 dark:bg-green-500/20",
        borderColor: "border-green-500/30",
        textColor: "text-green-600 dark:text-green-400",
        iconBg: "bg-green-500",
      };
    case "error":
      return {
        icon: <XCircle size={14} />,
        bgColor: "bg-red-500/10 dark:bg-red-500/20",
        borderColor: "border-red-500/30",
        textColor: "text-red-600 dark:text-red-400",
        iconBg: "bg-red-500",
      };
    default:
      return {
        icon: <Bot size={14} />,
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        textColor: "text-primary",
        iconBg: "bg-primary",
      };
  }
};

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({ subAgent, onClick, isExpanded = true }) => {
    const statusInfo = getStatusInfo(subAgent.status);
    
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-all",
          statusInfo.bgColor,
          statusInfo.borderColor,
          "hover:shadow-sm"
        )}
      >
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-white",
            statusInfo.iconBg
          )}>
            {statusInfo.icon}
          </div>
          {/* 名称和状态 */}
          <div className="flex flex-col">
            <span className={cn("text-sm font-medium", statusInfo.textColor)}>
              {subAgent.subAgentName}
            </span>
            <span className="text-xs text-muted-foreground">
              {subAgent.status === "running" || subAgent.status === "active" 
                ? "Running..." 
                : subAgent.status === "completed" || subAgent.status === "success"
                ? "Completed"
                : subAgent.status === "error"
                ? "Error"
                : "Pending"}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="flex-shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
