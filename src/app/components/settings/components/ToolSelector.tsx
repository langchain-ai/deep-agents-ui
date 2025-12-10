"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Filter, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolOption } from "@/app/types/types";
import type { ToolConfig, SubAgentConfig } from "../types";
import { CATEGORY_ICONS } from "../constants";
import { ModelSelectDropdown } from "./ModelSelector";
import type { ModelOption } from "@/app/types/types";
import { TOOLS_REQUIRING_MODEL } from "../types";

interface ToolSelectorProps {
  tools: ToolOption[];
  toolsByCategory: Record<string, ToolOption[]>;
  toolConfigs: Record<string, ToolConfig>;
  onToggleTool: (toolId: string) => void;
  onSetToolModel?: (toolId: string, modelId: string) => void;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  models?: ModelOption[];
  modelsByProvider?: Record<string, ModelOption[]>;
  showModelSelector?: boolean;
  subAgents?: SubAgentConfig[];           // 用于显示工具使用者
  directTools?: string[];                  // orchestrator 直接使用的工具
}

export function ToolSelector({
  toolsByCategory,
  toolConfigs,
  onToggleTool,
  onSetToolModel,
  expandedCategories,
  onToggleCategory,
  models,
  modelsByProvider,
  showModelSelector = false,
  subAgents = [],
  directTools = [],
}: ToolSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const enabledCount = Object.values(toolConfigs).filter((t) => t.enabled).length;
  const totalCount = Object.keys(toolConfigs).length;

  // 获取所有分类
  const categories = useMemo(() => {
    return ["All", ...Object.keys(toolsByCategory).sort()];
  }, [toolsByCategory]);

  // 根据选择的分类过滤工具
  const filteredToolsByCategory = useMemo(() => {
    if (selectedCategory === "All") {
      return toolsByCategory;
    }
    return { [selectedCategory]: toolsByCategory[selectedCategory] || [] };
  }, [selectedCategory, toolsByCategory]);

  // 获取工具的使用者列表
  const getToolUsers = (toolId: string): string[] => {
    const users: string[] = [];
    
    // 检查是否是 orchestrator 直接工具
    if (directTools.includes(toolId)) {
      users.push("Orchestrator");
    }
    
    // 检查哪些 sub-agents 使用此工具
    subAgents.forEach((agent) => {
      if (agent.tools.includes(toolId)) {
        users.push(agent.name);
      }
    });
    
    return users;
  };

  // 批量启用/禁用分类下的所有工具
  const isCategoryFullyEnabled = (category: string) => {
    const categoryTools = toolsByCategory[category] || [];
    return (
      categoryTools.length > 0 &&
      categoryTools.every((t) => toolConfigs[t.id]?.enabled)
    );
  };

  const toggleCategoryTools = (category: string, enable: boolean) => {
    const categoryTools = toolsByCategory[category] || [];
    categoryTools.forEach((tool) => {
      const currentEnabled = toolConfigs[tool.id]?.enabled;
      if (currentEnabled !== enable) {
        onToggleTool(tool.id);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">Tools</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Select which tools the agent can use.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {enabledCount} / {totalCount} enabled
        </div>
      </div>

      {/* 分类过滤器 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filter by Category:</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(filteredToolsByCategory).map(([category, categoryTools]) => (
          <div
            key={category}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
              <button
                onClick={() => onToggleCategory(category)}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {CATEGORY_ICONS[category] || CATEGORY_ICONS.General}
                </div>
                <span className="font-medium text-foreground">{category}</span>
                <span className="text-xs text-muted-foreground">
                  (
                  {categoryTools.filter((t) => toolConfigs[t.id]?.enabled).length}/
                  {categoryTools.length})
                </span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs text-muted-foreground">Enable all</span>
                <input
                  type="checkbox"
                  checked={isCategoryFullyEnabled(category)}
                  onChange={(e) => toggleCategoryTools(category, e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            </div>

            {expandedCategories.has(category) && (
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {categoryTools.map((tool) => {
                  const config = toolConfigs[tool.id];
                  const isEnabled = config?.enabled ?? false;
                  const requiresModel = TOOLS_REQUIRING_MODEL.includes(tool.id);

                  return (
                    <div
                      key={tool.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        isEnabled
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => onToggleTool(tool.id)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {tool.name}
                          </div>
                          {tool.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {tool.description}
                            </p>
                          )}
                          {/* 显示工具使用者 */}
                          {(() => {
                            const users = getToolUsers(tool.id);
                            if (users.length === 0) return null;
                            return (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Used by: {users.join(", ")}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </label>

                      {/* 工具模型选择（如果需要且启用） */}
                      {showModelSelector &&
                        requiresModel &&
                        isEnabled &&
                        models &&
                        modelsByProvider && (
                          <div className="mt-3 border-t border-border pt-3">
                            <label className="block text-xs font-medium text-muted-foreground">
                              Model for this tool
                            </label>
                            <ModelSelectDropdown
                              models={models}
                              modelsByProvider={modelsByProvider}
                              selectedModelId={config?.modelId || ""}
                              onSelectModel={(modelId) =>
                                onSetToolModel?.(tool.id, modelId)
                              }
                              placeholder="Use default model"
                              className="mt-1.5"
                            />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

