"use client";

import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Users,
  Wrench,
  Info,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettings } from "../SettingsContext";
import { ModelSelectDropdown } from "../components/ModelSelector";

export function SubAgentsTab() {
  const {
    models,
    modelsByProvider,
    subAgents,
    updateSubAgentModel,
    userModelSettings,
    setUserModelSettings,
    expandedSubAgents,
    toggleSubAgent,
  } = useSettings();

  // 按分类分组 sub-agents
  const subAgentsByCategory = subAgents.reduce(
    (acc, agent) => {
      const category = agent.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(agent);
      return acc;
    },
    {} as Record<string, typeof subAgents>
  );

  const categories = Object.keys(subAgentsByCategory).sort();

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Sub-Agent Configurations
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure models for each sub-agent. Changes will be saved when you click Save.
        </p>
      </div>

      {/* 默认 Sub-Agent 模型 */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Default Sub-Agent Model</span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          This model will be used for any sub-agent that doesn't have a specific model configured.
        </p>
        <div className="max-w-md">
          <ModelSelectDropdown
            models={models}
            modelsByProvider={modelsByProvider}
            selectedModelId={userModelSettings.defaultSubagentModel}
            onSelectModel={(modelId) => {
              setUserModelSettings((prev) => ({
                ...prev,
                defaultSubagentModel: modelId,
              }));
            }}
            placeholder="Select default model..."
          />
        </div>
      </div>

      {subAgents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 py-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="mb-2 text-muted-foreground">No sub-agents available</p>
          <p className="text-sm text-muted-foreground/80">
            Sub-agents will appear here once loaded from the server.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5">{category}</span>
                <span className="text-xs">({subAgentsByCategory[category].length})</span>
              </h4>
              <div className="space-y-3">
                {subAgentsByCategory[category].map((agent) => {
                  const isExpanded = expandedSubAgents.has(agent.id);
                  const agentModel = models.find((m) => m.id === agent.modelId);
                  const hasCustomModel = userModelSettings.subagentModels?.[agent.name];
                  
                  return (
                    <div
                      key={agent.id}
                      className="overflow-hidden rounded-xl border border-border bg-card"
                    >
                      {/* Header */}
                      <div
                        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-accent"
                        onClick={() => toggleSubAgent(agent.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-3 w-3 rounded-full",
                              agent.isActive
                                ? "bg-green-500 dark:bg-green-400"
                                : "bg-muted-foreground/30"
                            )}
                          />
                          <span className="font-medium text-foreground">{agent.name}</span>
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {agentModel?.name || agent.modelId || "Default"}
                          </span>
                          {hasCustomModel && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Custom
                            </span>
                          )}
                          {agent.tools.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Wrench className="h-3 w-3" />
                              {agent.tools.length} tools
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                          {/* Description */}
                          {agent.description && (
                            <div>
                              <p className="text-sm text-muted-foreground">{agent.description}</p>
                            </div>
                          )}

                          {/* Model Selection */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label className="block text-sm font-medium text-foreground">
                                Model
                              </label>
                              {hasCustomModel && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSubAgentModel(agent.name, agent.defaultModelId);
                                  }}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset to default
                                </Button>
                              )}
                            </div>
                            <ModelSelectDropdown
                              models={models}
                              modelsByProvider={modelsByProvider}
                              selectedModelId={agent.modelId}
                              onSelectModel={(modelId) =>
                                updateSubAgentModel(agent.name, modelId)
                              }
                            />
                            {agent.defaultModelId && (
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                Default: {models.find((m) => m.id === agent.defaultModelId)?.name || agent.defaultModelId}
                              </p>
                            )}
                          </div>

                          {/* Available Tools */}
                          {agent.tools.length > 0 && (
                            <div>
                              <label className="mb-2 block text-sm font-medium text-foreground">
                                Available Tools
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {agent.tools.map((toolName) => (
                                  <span
                                    key={toolName}
                                    className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                                  >
                                    {toolName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
