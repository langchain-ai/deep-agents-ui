"use client";

import React, { useState } from "react";
import { Brain, MessageSquare, FileText, Users, Wrench, Info, RotateCcw, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSettings } from "../SettingsContext";
import { ModelSelector } from "../components/ModelSelector";
import { toast } from "sonner";

export function MainAgentTab() {
  const {
    models,
    modelsByProvider,
    mainAgentConfig,
    setMainAgentConfig,
    subAgents,
    tools,
    toolConfigs,
    expandedProviders,
    toggleProvider,
    resetOrchestratorConfig,
    toggleSubAgentEnabled,
    permissions,
  } = useSettings();

  // 跟踪正在切换状态的 agent
  const [togglingAgents, setTogglingAgents] = useState<Set<string>>(new Set());

  // 获取所有子 Agent 列表
  const allSubAgents = subAgents;

  // 获取所有启用的工具（用于用户选择）
  const enabledTools = Object.entries(toolConfigs)
    .filter(([, config]) => config.enabled)
    .map(([id, config]) => ({ id, name: config.name }));

  // 获取所有可用工具（用于 Direct Tools 选择）
  const allTools = tools.map((tool) => ({ id: tool.id, name: tool.name, category: tool.category }));

  // 获取当前选择的模型信息
  const selectedModel = models.find((m) => m.id === mainAgentConfig.modelId);

  return (
    <div className="space-y-8">
      {/* 模型选择 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Orchestrator Model
            </h3>
            {mainAgentConfig.isModelOverridden && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                Admin Override
              </span>
            )}
          </div>
          {permissions.isAdmin && mainAgentConfig.isModelOverridden && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => resetOrchestratorConfig()}
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default
            </Button>
          )}
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          The primary model that coordinates tasks and routes to sub-agents.
        </p>

        {/* 当前选择的模型信息 */}
        {selectedModel && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium text-foreground">{selectedModel.name}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{selectedModel.provider}</span>
              {selectedModel.description && (
                <p className="mt-1 text-muted-foreground">{selectedModel.description}</p>
              )}
            </div>
          </div>
        )}

        <ModelSelector
          models={models}
          modelsByProvider={modelsByProvider}
          selectedModelId={mainAgentConfig.modelId}
          onSelectModel={(modelId) =>
            setMainAgentConfig((prev) => ({ ...prev, modelId }))
          }
          expandedProviders={expandedProviders}
          onToggleProvider={toggleProvider}
        />
      </section>

      <div className="border-t border-border" />

      {/* Direct Tools - Orchestrator 直接可用的工具（管理员配置） */}
      {permissions.isAdmin && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              <h3 className="text-base font-semibold text-foreground">
                Direct Tools
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {mainAgentConfig.directTools.length}
              </span>
              {mainAgentConfig.isToolsOverridden && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Admin Override
                </span>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Select tools that the orchestrator can use directly without delegating to sub-agents. (Optional)
          </p>

          {allTools.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No tools available. They will appear here once loaded from the server.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTools.map((tool) => {
                const isSelected = mainAgentConfig.directTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setMainAgentConfig((prev) => ({
                        ...prev,
                        directTools: isSelected
                          ? prev.directTools.filter((id) => id !== tool.id)
                          : [...prev.directTools, tool.id],
                      }));
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:border-amber-500/50 hover:bg-accent"
                    )}
                  >
                    {tool.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {permissions.isAdmin && <div className="border-t border-border" />}

      {/* 状态信息 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-foreground">
            Status
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              mainAgentConfig.hasSubagents ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <span className="text-sm text-foreground">
              Has Subagents: {mainAgentConfig.hasSubagents ? "Yes" : "No"}
            </span>
            {mainAgentConfig.hasSubagents && (
              <span className="text-xs text-muted-foreground">
                ({mainAgentConfig.enabledSubAgents.length} / {allSubAgents.length} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm text-foreground">
              Direct Tools: {mainAgentConfig.directTools.length} configured
            </span>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Sub-Agents 列表 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-foreground">
            Sub-Agents
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {mainAgentConfig.enabledSubAgents.length} / {allSubAgents.length}
          </span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Select which sub-agents the orchestrator can delegate tasks to.
        </p>

        {allSubAgents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No sub-agents available. They will appear here once loaded from the server.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {allSubAgents.map((agent) => {
              // 使用本地状态判断是否启用（可编辑）
              const isEnabled = mainAgentConfig.enabledSubAgents.includes(agent.name);
              const agentModel = models.find((m) => m.id === agent.modelId);
              const isToggling = togglingAgents.has(agent.name);
              
              const handleToggle = async () => {
                if (isToggling) return;
                
                setTogglingAgents((prev) => new Set(prev).add(agent.name));
                try {
                  await toggleSubAgentEnabled(agent.name, !isEnabled);
                  toast.success(`${agent.name} ${!isEnabled ? 'enabled' : 'disabled'}`);
                } catch {
                  toast.error(`Failed to toggle ${agent.name}`);
                } finally {
                  setTogglingAgents((prev) => {
                    const next = new Set(prev);
                    next.delete(agent.name);
                    return next;
                  });
                }
              };
              
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isEnabled
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  {/* 复选框 / Loading */}
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                      isEnabled
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : isEnabled ? (
                      <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 16 16" fill="none">
                        <path d="M12 5L6.5 10.5L4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {agent.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{agentModel?.name || agent.modelId || "Default model"}</span>
                      <span>·</span>
                      <span>{agent.toolCount || agent.tools.length} tools</span>
                    </div>
                    {agent.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                        {agent.description}
                      </div>
                    )}
                    {agent.category && (
                      <span className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {agent.category}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* 启用的工具 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          <h3 className="text-base font-semibold text-foreground">
            Enabled Tools
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {mainAgentConfig.enabledTools.length} / {enabledTools.length}
          </span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Select which tools the orchestrator can use directly.
        </p>

        {enabledTools.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No tools enabled. Go to the Tools tab to enable tools.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enabledTools.map((tool) => {
              const isEnabled = mainAgentConfig.enabledTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setMainAgentConfig((prev) => ({
                      ...prev,
                      enabledTools: isEnabled
                        ? prev.enabledTools.filter((id) => id !== tool.id)
                        : [...prev.enabledTools, tool.id],
                    }));
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isEnabled
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  {tool.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* 系统提示词 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          <h3 className="text-base font-semibold text-foreground">
            System Prompt
          </h3>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Define the orchestrator's role, personality, and behavior. Leave empty to use the default.
        </p>
        <textarea
          value={mainAgentConfig.systemPrompt}
          onChange={(e) =>
            setMainAgentConfig((prev) => ({
              ...prev,
              systemPrompt: e.target.value,
            }))
          }
          placeholder="You are a helpful AI assistant that coordinates tasks..."
          rows={6}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Supports Markdown formatting. Use **bold**, *italic*, `code`, and more.
        </p>
      </section>

      <div className="border-t border-border" />

      {/* 附加指令 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          <h3 className="text-base font-semibold text-foreground">
            Additional Instructions
          </h3>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Extra instructions that will be appended to every conversation.
        </p>
        <textarea
          value={mainAgentConfig.additionalInstructions}
          onChange={(e) =>
            setMainAgentConfig((prev) => ({
              ...prev,
              additionalInstructions: e.target.value,
            }))
          }
          placeholder="Always cite sources when providing information..."
          rows={4}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Supports Markdown formatting.
        </p>
      </section>
    </div>
  );
}
