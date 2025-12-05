"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/providers/AuthProvider";
import type { UserSettings, ModelOption, ToolOption } from "@/app/types/types";
import { 
  Loader2, 
  Check, 
  Settings2, 
  Bot, 
  Wrench, 
  Palette, 
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Sparkles,
  Globe,
  Cpu,
  Zap,
  MessageSquare,
  FileText,
  Code,
  Search,
  Database,
  Image as ImageIcon,
  Terminal,
  Users,
  Brain,
  Cog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 提供商图标映射
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  OpenAI: <Sparkles className="h-4 w-4" />,
  Anthropic: <Bot className="h-4 w-4" />,
  Google: <Globe className="h-4 w-4" />,
  Meta: <Cpu className="h-4 w-4" />,
  Mistral: <Zap className="h-4 w-4" />,
  Cohere: <MessageSquare className="h-4 w-4" />,
  DeepSeek: <Brain className="h-4 w-4" />,
  Default: <Cpu className="h-4 w-4" />,
};

// 提供商颜色
const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Anthropic: "bg-orange-50 text-orange-700 border-orange-200",
  Google: "bg-blue-50 text-blue-700 border-blue-200",
  Meta: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Mistral: "bg-purple-50 text-purple-700 border-purple-200",
  Cohere: "bg-pink-50 text-pink-700 border-pink-200",
  DeepSeek: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Default: "bg-gray-50 text-gray-700 border-gray-200",
};

// 工具分类图标
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Search: <Search className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
  File: <FileText className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  Web: <Globe className="h-4 w-4" />,
  Image: <ImageIcon className="h-4 w-4" />,
  Terminal: <Terminal className="h-4 w-4" />,
  General: <Wrench className="h-4 w-4" />,
};

// Sub-Agent 配置类型
interface SubAgentConfig {
  id: string;
  name: string;
  modelId: string;
  systemPrompt: string;
  additionalInstructions: string;
  enabledTools: string[];
  isActive: boolean;
}

type TabType = "models" | "subagents" | "tools" | "prompts" | "appearance";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, getAvailableModels, getAvailableTools } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("models");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [mainAgentModel, setMainAgentModel] = useState(settings?.mainAgentModel || "");
  const [subAgentModel, setSubAgentModel] = useState(settings?.subAgentModel || "");
  const [enabledTools, setEnabledTools] = useState<string[]>(settings?.enabledTools || []);
  const [theme, setTheme] = useState<"light" | "dark">(settings?.theme || "light");

  // Sub-agents 配置
  const [subAgents, setSubAgents] = useState<SubAgentConfig[]>([]);
  
  // 主 Agent 提示词
  const [mainSystemPrompt, setMainSystemPrompt] = useState("");
  const [mainAdditionalInstructions, setMainAdditionalInstructions] = useState("");

  // Available options
  const [models, setModels] = useState<ModelOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);

  // Expanded states
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubAgents, setExpandedSubAgents] = useState<Set<string>>(new Set());

  // Load available models and tools
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([getAvailableModels(), getAvailableTools()])
        .then(([modelsData, toolsData]) => {
          setModels(modelsData);
          setTools(toolsData);
          
          // 默认展开第一个提供商
          if (modelsData.length > 0) {
            const firstProvider = modelsData[0].provider;
            setExpandedProviders(new Set([firstProvider]));
          }
          
          // 默认展开所有分类
          const categories = new Set(toolsData.map(t => t.category || "General"));
          setExpandedCategories(categories);
        })
        .catch((err) => {
          console.error("Failed to load options:", err);
          // 使用默认数据
          setModels(getDefaultModels());
          setTools(getDefaultTools());
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, getAvailableModels, getAvailableTools]);

  // Sync with settings
  useEffect(() => {
    if (settings) {
      setMainAgentModel(settings.mainAgentModel);
      setSubAgentModel(settings.subAgentModel);
      setEnabledTools(settings.enabledTools);
      setTheme(settings.theme);
    }
  }, [settings]);

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    return models.reduce((acc, model) => {
      const provider = model.provider || "Other";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, ModelOption[]>);
  }, [models]);

  // Group tools by category
  const toolsByCategory = useMemo(() => {
    return tools.reduce((acc, tool) => {
      const category = tool.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tool);
      return acc;
    }, {} as Record<string, ToolOption[]>);
  }, [tools]);

  // Toggle functions
  const toggleProvider = useCallback((provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const toggleSubAgent = useCallback((id: string) => {
    setExpandedSubAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Tool toggle
  const handleToolToggle = useCallback((toolId: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  }, []);

  // Category bulk toggle
  const toggleCategoryTools = useCallback((category: string, enable: boolean) => {
    const categoryToolIds = toolsByCategory[category]?.map(t => t.id) || [];
    setEnabledTools((prev) => {
      if (enable) {
        return [...new Set([...prev, ...categoryToolIds])];
      } else {
        return prev.filter(id => !categoryToolIds.includes(id));
      }
    });
  }, [toolsByCategory]);

  const isCategoryFullyEnabled = useCallback((category: string) => {
    const categoryTools = toolsByCategory[category] || [];
    return categoryTools.length > 0 && categoryTools.every(t => enabledTools.includes(t.id));
  }, [toolsByCategory, enabledTools]);

  // Sub-agent management
  const addSubAgent = useCallback(() => {
    const newAgent: SubAgentConfig = {
      id: `subagent-${Date.now()}`,
      name: `Sub-Agent ${subAgents.length + 1}`,
      modelId: subAgentModel || models[0]?.id || "",
      systemPrompt: "",
      additionalInstructions: "",
      enabledTools: [],
      isActive: true,
    };
    setSubAgents((prev) => [...prev, newAgent]);
    setExpandedSubAgents((prev) => new Set([...prev, newAgent.id]));
  }, [subAgents.length, subAgentModel, models]);

  const removeSubAgent = useCallback((id: string) => {
    setSubAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateSubAgent = useCallback((id: string, updates: Partial<SubAgentConfig>) => {
    setSubAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  // Export config
  const exportConfig = useCallback(() => {
    const config = {
      mainAgentModel,
      subAgentModel,
      enabledTools,
      theme,
      subAgents,
      mainSystemPrompt,
      mainAdditionalInstructions,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deepagents-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Configuration exported successfully");
  }, [mainAgentModel, subAgentModel, enabledTools, theme, subAgents, mainSystemPrompt, mainAdditionalInstructions]);

  // Import config
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
        
        if (config.mainAgentModel) setMainAgentModel(config.mainAgentModel);
        if (config.subAgentModel) setSubAgentModel(config.subAgentModel);
        if (config.enabledTools) setEnabledTools(config.enabledTools);
        if (config.theme) setTheme(config.theme);
        if (config.subAgents) setSubAgents(config.subAgents);
        if (config.mainSystemPrompt) setMainSystemPrompt(config.mainSystemPrompt);
        if (config.mainAdditionalInstructions) setMainAdditionalInstructions(config.mainAdditionalInstructions);
        
        toast.success("Configuration imported successfully");
      } catch {
        toast.error("Failed to import configuration");
      }
    };
    input.click();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSettings({
        mainAgentModel,
        subAgentModel,
        enabledTools,
        theme,
      });
      setSuccess(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [mainAgentModel, subAgentModel, enabledTools, theme, updateSettings]);

  const tabs = [
    { id: "models" as const, label: "Models", icon: <Bot className="h-4 w-4" /> },
    { id: "subagents" as const, label: "Sub-Agents", icon: <Users className="h-4 w-4" /> },
    { id: "tools" as const, label: "Tools", icon: <Wrench className="h-4 w-4" /> },
    { id: "prompts" as const, label: "Prompts", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "appearance" as const, label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
                <Settings2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Configure your agent models, tools, and preferences.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={importConfig}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportConfig}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-52 border-r border-gray-200 bg-gray-50/50 p-4 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-white text-teal-700 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md",
                    activeTab === tab.id ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-500"
                  )}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="text-sm text-gray-500">Loading settings...</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Error/Success Messages */}
                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    {/* Models Tab */}
                    {activeTab === "models" && (
                      <div className="space-y-6">
                        {/* Main Agent Model */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Brain className="h-5 w-5 text-teal-600" />
                            <h3 className="text-base font-semibold text-gray-900">Main Agent Model</h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            The primary model for reasoning and complex tasks.
                          </p>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                              <div key={provider} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <button
                                  onClick={() => toggleProvider(provider)}
                                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "flex items-center justify-center w-9 h-9 rounded-lg border",
                                      PROVIDER_COLORS[provider] || PROVIDER_COLORS.Default
                                    )}>
                                      {PROVIDER_ICONS[provider] || PROVIDER_ICONS.Default}
                                    </div>
                                    <div className="text-left">
                                      <span className="font-medium text-gray-900">{provider}</span>
                                      <span className="ml-2 text-xs text-gray-500">
                                        {providerModels.length} models
                                      </span>
                                    </div>
                                  </div>
                                  {expandedProviders.has(provider) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                
                                {expandedProviders.has(provider) && (
                                  <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2">
                                    {providerModels.map((model) => (
                                      <label
                                        key={model.id}
                                        className={cn(
                                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                          mainAgentModel === model.id
                                            ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                      >
                                        <input
                                          type="radio"
                                          name="mainAgentModel"
                                          value={model.id}
                                          checked={mainAgentModel === model.id}
                                          onChange={() => setMainAgentModel(model.id)}
                                          className="sr-only"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 text-sm">{model.name}</span>
                                            {mainAgentModel === model.id && (
                                              <Check className="h-4 w-4 text-teal-600" />
                                            )}
                                          </div>
                                          {model.contextWindow && (
                                            <span className="text-xs text-gray-500">
                                              {Math.round(model.contextWindow / 1000)}K context
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-gray-200" />

                        {/* Default Sub-Agent Model */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Cog className="h-5 w-5 text-blue-600" />
                            <h3 className="text-base font-semibold text-gray-900">Default Sub-Agent Model</h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            The default model for sub-agents. Can be overridden per sub-agent.
                          </p>
                          
                          <select
                            value={subAgentModel}
                            onChange={(e) => setSubAgentModel(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          >
                            <option value="">Select a model</option>
                            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                              <optgroup key={provider} label={provider}>
                                {providerModels.map((model) => (
                                  <option key={model.id} value={model.id}>
                                    {model.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Sub-Agents Tab */}
                    {activeTab === "subagents" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">Sub-Agent Configurations</h3>
                            <p className="text-sm text-gray-500">
                              Configure specialized sub-agents for different tasks.
                            </p>
                          </div>
                          <Button onClick={addSubAgent} size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700">
                            <Plus className="h-4 w-4" />
                            Add Sub-Agent
                          </Button>
                        </div>

                        {subAgents.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 mb-3">No sub-agents configured</p>
                            <Button onClick={addSubAgent} variant="outline" size="sm" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Add your first sub-agent
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {subAgents.map((agent) => (
                              <div key={agent.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                                <div
                                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                                  onClick={() => toggleSubAgent(agent.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-3 h-3 rounded-full",
                                      agent.isActive ? "bg-green-500" : "bg-gray-300"
                                    )} />
                                    <span className="font-medium text-gray-900">{agent.name}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {models.find(m => m.id === agent.modelId)?.name || "No model"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSubAgent(agent.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    {expandedSubAgents.has(agent.id) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>

                                {expandedSubAgents.has(agent.id) && (
                                  <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                          Name
                                        </label>
                                        <input
                                          type="text"
                                          value={agent.name}
                                          onChange={(e) => updateSubAgent(agent.id, { name: e.target.value })}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                          Model
                                        </label>
                                        <select
                                          value={agent.modelId}
                                          onChange={(e) => updateSubAgent(agent.id, { modelId: e.target.value })}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        >
                                          {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                                            <optgroup key={provider} label={provider}>
                                              {providerModels.map((model) => (
                                                <option key={model.id} value={model.id}>
                                                  {model.name}
                                                </option>
                                              ))}
                                            </optgroup>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        System Prompt
                                      </label>
                                      <textarea
                                        value={agent.systemPrompt}
                                        onChange={(e) => updateSubAgent(agent.id, { systemPrompt: e.target.value })}
                                        placeholder="Define the sub-agent's role and behavior..."
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Additional Instructions
                                      </label>
                                      <textarea
                                        value={agent.additionalInstructions}
                                        onChange={(e) => updateSubAgent(agent.id, { additionalInstructions: e.target.value })}
                                        placeholder="Any additional instructions or constraints..."
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`active-${agent.id}`}
                                        checked={agent.isActive}
                                        onChange={(e) => updateSubAgent(agent.id, { isActive: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                      />
                                      <label htmlFor={`active-${agent.id}`} className="text-sm text-gray-700">
                                        Active (can be invoked by main agent)
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tools Tab */}
                    {activeTab === "tools" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">Enabled Tools</h3>
                            <p className="text-sm text-gray-500">
                              Select which tools the agent can use.
                            </p>
                          </div>
                          <div className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                            {enabledTools.length} / {tools.length} enabled
                          </div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                            <div key={category} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50">
                                <button
                                  onClick={() => toggleCategory(category)}
                                  className="flex items-center gap-3"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
                                    {CATEGORY_ICONS[category] || CATEGORY_ICONS.General}
                                  </div>
                                  <span className="font-medium text-gray-900">{category}</span>
                                  <span className="text-xs text-gray-500">
                                    ({categoryTools.filter(t => enabledTools.includes(t.id)).length}/{categoryTools.length})
                                  </span>
                                  {expandedCategories.has(category) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <span className="text-xs text-gray-500">Enable all</span>
                                  <input
                                    type="checkbox"
                                    checked={isCategoryFullyEnabled(category)}
                                    onChange={(e) => toggleCategoryTools(category, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                </label>
                              </div>
                              
                              {expandedCategories.has(category) && (
                                <div className="p-3 grid grid-cols-2 gap-2">
                                  {categoryTools.map((tool) => (
                                    <label
                                      key={tool.id}
                                      className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                        enabledTools.includes(tool.id)
                                          ? "border-teal-500 bg-teal-50"
                                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={enabledTools.includes(tool.id)}
                                        onChange={() => handleToolToggle(tool.id)}
                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                                        {tool.description && (
                                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{tool.description}</p>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prompts Tab */}
                    {activeTab === "prompts" && (
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                            <h3 className="text-base font-semibold text-gray-900">Main Agent System Prompt</h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">
                            Define the main agent's role, personality, and behavior.
                          </p>
                          <textarea
                            value={mainSystemPrompt}
                            onChange={(e) => setMainSystemPrompt(e.target.value)}
                            placeholder="You are a helpful AI assistant that..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                          />
                        </div>

                        <div className="border-t border-gray-200" />

                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-orange-600" />
                            <h3 className="text-base font-semibold text-gray-900">Additional Instructions</h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">
                            Extra instructions that will be appended to every conversation.
                          </p>
                          <textarea
                            value={mainAdditionalInstructions}
                            onChange={(e) => setMainAdditionalInstructions(e.target.value)}
                            placeholder="Always cite sources when providing information..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Appearance Tab */}
                    {activeTab === "appearance" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-4">Theme</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <label
                              className={cn(
                                "relative flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all",
                                theme === "light"
                                  ? "border-teal-500 bg-teal-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <input
                                type="radio"
                                name="theme"
                                value="light"
                                checked={theme === "light"}
                                onChange={() => setTheme("light")}
                                className="sr-only"
                              />
                              <div className="w-24 h-16 rounded-lg bg-white border border-gray-200 shadow-sm mb-3 flex items-center justify-center">
                                <div className="w-16 h-2 rounded bg-gray-200" />
                              </div>
                              <span className="font-medium text-gray-900">Light</span>
                              {theme === "light" && (
                                <div className="absolute top-3 right-3">
                                  <Check className="h-5 w-5 text-teal-600" />
                                </div>
                              )}
                            </label>
                            
                            <label
                              className={cn(
                                "relative flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all",
                                theme === "dark"
                                  ? "border-teal-500 bg-teal-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <input
                                type="radio"
                                name="theme"
                                value="dark"
                                checked={theme === "dark"}
                                onChange={() => setTheme("dark")}
                                className="sr-only"
                              />
                              <div className="w-24 h-16 rounded-lg bg-gray-800 border border-gray-700 shadow-sm mb-3 flex items-center justify-center">
                                <div className="w-16 h-2 rounded bg-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900">Dark</span>
                              {theme === "dark" && (
                                <div className="absolute top-3 right-3">
                                  <Check className="h-5 w-5 text-teal-600" />
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 min-w-[140px]"
                  >
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
      </DialogContent>
    </Dialog>
  );
}

// 默认模型数据（当 API 不可用时使用）
function getDefaultModels(): ModelOption[] {
  return [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Most capable model with vision", contextWindow: 128000 },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", description: "Fast and powerful", contextWindow: 128000 },
    { id: "gpt-4", name: "GPT-4", provider: "OpenAI", description: "Original GPT-4", contextWindow: 8192 },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", description: "Fast and cost-effective", contextWindow: 16385 },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", description: "Most capable Claude", contextWindow: 200000 },
    { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic", description: "Balanced performance", contextWindow: 200000 },
    { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", description: "Fastest Claude", contextWindow: 200000 },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", description: "Google's flagship model", contextWindow: 1000000 },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", description: "Fast Gemini model", contextWindow: 1000000 },
    { id: "deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek", description: "Powerful open model", contextWindow: 64000 },
    { id: "deepseek-coder", name: "DeepSeek Coder", provider: "DeepSeek", description: "Optimized for coding", contextWindow: 64000 },
  ];
}

// 默认工具数据
function getDefaultTools(): ToolOption[] {
  return [
    { id: "web_search", name: "Web Search", category: "Search", description: "Search the web using Tavily", enabled: true },
    { id: "perplexity_search", name: "Perplexity Search", category: "Search", description: "AI-powered search with citations", enabled: true },
    { id: "keyword_research", name: "Keyword Research", category: "Search", description: "Research keywords with volume and difficulty", enabled: false },
    { id: "eeat_evaluation", name: "EEAT-CORE Evaluation", category: "Search", description: "Evaluate page quality using EEAT-CORE", enabled: false },
    { id: "serp_analysis", name: "SERP Analysis", category: "Search", description: "Analyze search result page structure", enabled: false },
    { id: "code_interpreter", name: "Code Interpreter", category: "Code", description: "Execute Python code", enabled: true },
    { id: "code_analyzer", name: "Code Analyzer", category: "Code", description: "Analyze and review code", enabled: true },
    { id: "file_reader", name: "File Reader", category: "File", description: "Read various file formats", enabled: true },
    { id: "file_writer", name: "File Writer", category: "File", description: "Create and modify files", enabled: true },
    { id: "image_generator", name: "Image Generator", category: "Image", description: "Generate images using AI", enabled: false },
    { id: "image_analyzer", name: "Image Analyzer", category: "Image", description: "Analyze and describe images", enabled: true },
    { id: "database_query", name: "Database Query", category: "Database", description: "Execute SQL queries", enabled: false },
    { id: "api_caller", name: "API Caller", category: "Web", description: "Make HTTP requests", enabled: true },
    { id: "terminal", name: "Terminal", category: "Terminal", description: "Execute shell commands", enabled: false },
    { id: "calculator", name: "Calculator", category: "General", description: "Perform calculations", enabled: true },
    { id: "datetime", name: "Date & Time", category: "General", description: "Get current date and time", enabled: true },
    { id: "json_parser", name: "JSON Parser", category: "General", description: "Parse and format JSON", enabled: true },
    { id: "markdown_renderer", name: "Markdown Renderer", category: "General", description: "Render markdown to HTML", enabled: true },
  ];
}
