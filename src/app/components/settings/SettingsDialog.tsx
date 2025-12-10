"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Check,
  Settings2,
  Bot,
  Users,
  Wrench,
  Palette,
  Download,
  Upload,
  X,
  Database,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

import { SettingsProvider, useSettings } from "./SettingsContext";
import { MainAgentTab, SubAgentsTab, ToolsTab, AppearanceTab, ContextTab, AccountTab } from "./tabs";
import type { TabType } from "./types";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;  // 可选，如果不传则从 AuthContext 获取
}

// Tab 配置
const TABS: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "main-agent", label: "Orchestrator", icon: <Bot className="h-4 w-4" /> },
  { id: "sub-agents", label: "Sub-Agents", icon: <Users className="h-4 w-4" /> },
  { id: "tools", label: "Tools", icon: <Wrench className="h-4 w-4" /> },
  { id: "context", label: "Context", icon: <Database className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "account", label: "Account", icon: <UserCog className="h-4 w-4" /> },
];

// 内部设置内容组件
function SettingsContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const {
    mainAgentConfig,
    subAgents,
    toolConfigs,
    userModelSettings,
    theme,
    isLoading,
    isSaving,
    error,
    permissions,
    saveSettings,
  } = useSettings();

  // 根据权限过滤可见的 tabs
  const visibleTabs = TABS.filter((tab) => {
    switch (tab.id) {
      case "main-agent":
        return permissions.canConfigureMainAgent !== false;
      case "sub-agents":
        return permissions.canConfigureSubAgents !== false;
      case "tools":
        return permissions.canConfigureTools !== false;
      case "context":
        return true; // 所有用户都可以管理自己的 Context
      case "appearance":
        return permissions.canChangeAppearance !== false;
      case "account":
        return true; // 所有用户都可以管理自己的账户
      default:
        return true;
    }
  });

  const [activeTab, setActiveTab] = useState<TabType>(
    visibleTabs[0]?.id || "main-agent"
  );
  
  // 当权限变化导致 visibleTabs 变化时，确保 activeTab 仍然有效
  // 这解决了首次登录时 isAdmin 延迟更新的问题
  useEffect(() => {
    const visibleTabIds = visibleTabs.map(tab => tab.id);
    // 如果当前 activeTab 不在可见列表中，切换到第一个可见 tab
    if (!visibleTabIds.includes(activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "context");
    }
  }, [visibleTabs, activeTab]);

  // 导出配置
  const exportConfig = useCallback(() => {
    const enabledToolIds = Object.entries(toolConfigs)
      .filter(([, config]) => config.enabled)
      .map(([id]) => id);

    // 收集 sub-agent 模型配置
    const subagentModels: Record<string, string> = {};
    subAgents.forEach((agent) => {
      if (agent.modelId && agent.modelId !== agent.defaultModelId) {
        subagentModels[agent.name] = agent.modelId;
      }
    });

    const config = {
      orchestratorModel: mainAgentConfig.modelId,
      defaultSubagentModel: userModelSettings.defaultSubagentModel,
      subagentModels,
      enabledTools: enabledToolIds,
      theme,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seenos-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Configuration exported successfully");
  }, [mainAgentConfig, subAgents, userModelSettings, toolConfigs, theme]);

  // 导入配置
  const importConfig = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);
        // TODO: 应用导入的配置
        console.log("Imported config:", config);
        toast.success("Configuration imported successfully");
      } catch {
        toast.error("Failed to import configuration");
      }
    };
    input.click();
  }, []);

  // 保存设置
  const handleSave = useCallback(async () => {
    try {
      await saveSettings();
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }, [saveSettings]);

  return (
    <>
      <DialogHeader className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Settings
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Configure your agent models, tools, and preferences.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {permissions.canImportExport !== false && (
              <>
                <Button variant="outline" size="sm" onClick={importConfig} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={exportConfig} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-md"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar Tabs */}
        <div className="w-52 flex-shrink-0 border-r border-border bg-muted/50 p-4">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "border border-primary/30 bg-background text-foreground shadow-sm"
                    : "border border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <span
                  style={activeTab === tab.id ? { backgroundColor: 'hsl(173, 58%, 35%)' } : undefined}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    activeTab === tab.id
                      ? "text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-6 p-6">
                    {/* Error Message */}
                    {error && (
                      <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                          <X className="h-3 w-3 text-destructive" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">Failed to load settings</p>
                          <p className="mt-1 text-sm text-destructive/80">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Tab Content */}
                    {activeTab === "main-agent" && <MainAgentTab />}
                    {activeTab === "sub-agents" && <SubAgentsTab />}
                    {activeTab === "tools" && <ToolsTab />}
                    {activeTab === "context" && <ContextTab />}
                    {activeTab === "appearance" && <AppearanceTab />}
                    {activeTab === "account" && <AccountTab />}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer */}
              <div className="flex flex-shrink-0 justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// 主导出组件
export function SettingsDialog({ open, onOpenChange, isAdmin: isAdminProp }: SettingsDialogProps) {
  // 优先从 AuthContext 获取 isAdmin，确保状态同步
  // 这样可以解决首次登录时 isAdmin 未正确传递的问题
  const { user } = useAuth();
  const isAdmin = isAdminProp ?? user?.isAdmin ?? false;
  
  // 根据 isAdmin 构建权限
  // 非管理员只能查看和更改外观，不能修改核心配置
  const permissions = {
    canConfigureMainAgent: isAdmin,      // 只有管理员可以配置主代理
    canConfigureSubAgents: isAdmin,      // 只有管理员可以配置子代理
    canConfigureTools: isAdmin,          // 只有管理员可以配置工具
    canChangeAppearance: true,           // 所有用户都可以更改外观
    canImportExport: isAdmin,            // 只有管理员可以导入/导出
    isAdmin,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl flex h-[85vh] flex-col gap-0 overflow-hidden p-0" showCloseButton={false}>
        <SettingsProvider permissions={permissions}>
          <SettingsContent onOpenChange={onOpenChange} />
        </SettingsProvider>
      </DialogContent>
    </Dialog>
  );
}
