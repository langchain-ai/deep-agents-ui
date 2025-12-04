"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SubAgent } from "@/app/types/types";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onClick: () => void;
  isExpanded?: boolean;
}

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({ subAgent, onClick, isExpanded = true }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-lg bg-gray-700 px-4 py-3 text-left transition-colors hover:bg-gray-600"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-600">
            <span className="text-[10px] font-bold uppercase text-white">
              {subAgent.subAgentName.charAt(0)}
            </span>
          </div>
          <span className="text-sm font-medium text-white">
            {subAgent.subAgentName}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="flex-shrink-0 text-gray-300" />
        ) : (
          <ChevronDown size={16} className="flex-shrink-0 text-gray-300" />
        )}
      </button>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
