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
import type { UserSettings, ModelOption, ToolOption, ModelsByProvider, ToolsByCategory } from "@/app/types/types";
import { 
  Loader2, 
  Check, 
  Settings2, 
  Bot, 
  Wrench, 
  Palette, 
  ChevronDown,
  ChevronRight,
  Cpu,
  Zap,
  Globe,
  Code,
  FileText,
  Search,
  Database,
  MessageSquare,
  Image as ImageIcon,
  Terminal,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  Default: <Cpu className="h-4 w-4" />,
};

// 工具分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Search: <Search className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
  File: <FileText className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  Web: <Globe className="h-4 w-4" />,
  Image: <ImageIcon className="h-4 w-4" />,
  Terminal: <Terminal className="h-4 w-4" />,
  General: <Wrench className="h-4 w-4" />,
  Default: <Wrench className="h-4 w-4" />,
};

// 提供商颜色
const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Anthropic: "bg-orange-100 text-orange-700 border-orange-200",
  Google: "bg-blue-100 text-blue-700 border-blue-200",
  Meta: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Mistral: "bg-purple-100 text-purple-700 border-purple-200",
  Cohere: "bg-pink-100 text-pink-700 border-pink-200",
  Default: "bg-gray-100 text-gray-700 border-gray-200",
};

type TabType = "models" | "tools" | "appearance";

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

  // Available options
  const [models, setModels] = useState<ModelOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);

  // Expanded providers/categories
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load available models and tools
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([getAvailableModels(), getAvailableTools()])
        .then(([modelsData, toolsData]) => {
          setModels(modelsData);
          setTools(toolsData);
          
          // 默认展开所有提供商和分类
          const providers = new Set(modelsData.map(m => m.provider));
          const categories = new Set(toolsData.map(t => t.category || "General"));
          setExpandedProviders(providers);
          setExpandedCategories(categories);
        })
        .catch((err) => {
          console.error("Failed to load options:", err);
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
  const modelsByProvider = useMemo((): ModelsByProvider => {
    return models.reduce((acc, model) => {
      const provider = model.provider || "Other";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as ModelsByProvider);
  }, [models]);

  // Group tools by category
  const toolsByCategory = useMemo((): ToolsByCategory => {
    return tools.reduce((acc, tool) => {
      const category = tool.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tool);
      return acc;
    }, {} as ToolsByCategory);
  }, [tools]);

  // Toggle provider expansion
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

  // Toggle category expansion
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

  // Handle tool toggle
  const handleToolToggle = useCallback((toolId: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  }, []);

  // Toggle all tools in a category
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

  // Check if all tools in category are enabled
  const isCategoryFullyEnabled = useCallback((category: string) => {
    const categoryTools = toolsByCategory[category] || [];
    return categoryTools.length > 0 && categoryTools.every(t => enabledTools.includes(t.id));
  }, [toolsByCategory, enabledTools]);

  // Check if some tools in category are enabled
  const isCategoryPartiallyEnabled = useCallback((category: string) => {
    const categoryTools = toolsByCategory[category] || [];
    const enabledCount = categoryTools.filter(t => enabledTools.includes(t.id)).length;
    return enabledCount > 0 && enabledCount < categoryTools.length;
  }, [toolsByCategory, enabledTools]);

  // Handle save
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
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [mainAgentModel, subAgentModel, enabledTools, theme, updateSettings]);

  // Get selected model info
  const getSelectedModelInfo = useCallback((modelId: string) => {
    return models.find(m => m.id === modelId);
  }, [models]);

  const tabs = [
    { id: "models" as const, label: "Models", icon: <Bot className="h-4 w-4" /> },
    { id: "tools" as const, label: "Tools", icon: <Wrench className="h-4 w-4" /> },
    { id: "appearance" as const, label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100">
              <Settings2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Settings</DialogTitle>
              <DialogDescription className="text-sm">
                Configure your agent models, tools, and preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 p-3 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-white text-teal-700 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {/* Error Message */}
                    {error && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    {/* Success Message */}
                    {success && (
                      <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Settings saved successfully
                      </div>
                    )}

                    {/* Models Tab */}
                    {activeTab === "models" && (
                      <div className="space-y-6">
                        {/* Main Agent Model */}
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">Main Agent Model</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            The primary model used for main agent responses and reasoning.
                          </p>
                          
                          <div className="space-y-3">
                            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                              <div key={provider} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleProvider(provider)}
                                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-lg border",
                                      PROVIDER_COLORS[provider] || PROVIDER_COLORS.Default
                                    )}>
                                      {PROVIDER_ICONS[provider] || PROVIDER_ICONS.Default}
                                    </div>
                                    <span className="font-medium text-gray-900">{provider}</span>
                                    <span className="text-xs text-gray-500">
                                      ({providerModels.length} models)
                                    </span>
                                  </div>
                                  {expandedProviders.has(provider) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                                
                                {expandedProviders.has(provider) && (
                                  <div className="p-3 space-y-2 bg-white">
                                    {providerModels.map((model) => (
                                      <label
                                        key={model.id}
                                        className={cn(
                                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
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
                                          className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{model.name}</span>
                                            {model.contextWindow && (
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                {Math.round(model.contextWindow / 1000)}K context
                                              </span>
                                            )}
                                          </div>
                                          {model.description && (
                                            <p className="mt-1 text-sm text-gray-500">{model.description}</p>
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

                        {/* Divider */}
                        <div className="border-t border-gray-200" />

                        {/* Sub Agent Model */}
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">Sub Agent Model</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            The model used for sub-agent tasks and tool execution. Usually a faster, more cost-effective model.
                          </p>
                          
                          <div className="space-y-3">
                            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                              <div key={`sub-${provider}`} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleProvider(`sub-${provider}`)}
                                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-lg border",
                                      PROVIDER_COLORS[provider] || PROVIDER_COLORS.Default
                                    )}>
                                      {PROVIDER_ICONS[provider] || PROVIDER_ICONS.Default}
                                    </div>
                                    <span className="font-medium text-gray-900">{provider}</span>
                                    <span className="text-xs text-gray-500">
                                      ({providerModels.length} models)
                                    </span>
                                  </div>
                                  {expandedProviders.has(`sub-${provider}`) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                                
                                {expandedProviders.has(`sub-${provider}`) && (
                                  <div className="p-3 space-y-2 bg-white">
                                    {providerModels.map((model) => (
                                      <label
                                        key={`sub-${model.id}`}
                                        className={cn(
                                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                          subAgentModel === model.id
                                            ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                      >
                                        <input
                                          type="radio"
                                          name="subAgentModel"
                                          value={model.id}
                                          checked={subAgentModel === model.id}
                                          onChange={() => setSubAgentModel(model.id)}
                                          className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{model.name}</span>
                                            {model.contextWindow && (
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                {Math.round(model.contextWindow / 1000)}K context
                                              </span>
                                            )}
                                          </div>
                                          {model.description && (
                                            <p className="mt-1 text-sm text-gray-500">{model.description}</p>
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
                      </div>
                    )}

                    {/* Tools Tab */}
                    {activeTab === "tools" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">Enabled Tools</h3>
                            <p className="text-sm text-gray-500">
                              Select which tools the agent can use during conversations.
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {enabledTools.length} / {tools.length} enabled
                          </div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                                <button
                                  onClick={() => toggleCategory(category)}
                                  className="flex items-center gap-3 hover:text-gray-900 transition-colors"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 text-gray-600">
                                    {CATEGORY_ICONS[category] || CATEGORY_ICONS.Default}
                                  </div>
                                  <span className="font-medium text-gray-900">{category}</span>
                                  <span className="text-xs text-gray-500">
                                    ({categoryTools.filter(t => enabledTools.includes(t.id)).length}/{categoryTools.length})
                                  </span>
                                  {expandedCategories.has(category) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                                
                                {/* Category toggle */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <span className="text-xs text-gray-500">
                                    {isCategoryFullyEnabled(category) ? "Disable all" : "Enable all"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={isCategoryFullyEnabled(category)}
                                    ref={(el) => {
                                      if (el) {
                                        el.indeterminate = isCategoryPartiallyEnabled(category);
                                      }
                                    }}
                                    onChange={(e) => toggleCategoryTools(category, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                </label>
                              </div>
                              
                              {expandedCategories.has(category) && (
                                <div className="p-3 space-y-2 bg-white">
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
                                        <div className="font-medium text-gray-900">{tool.name}</div>
                                        {tool.description && (
                                          <p className="mt-0.5 text-sm text-gray-500">{tool.description}</p>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {tools.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No tools available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Appearance Tab */}
                    {activeTab === "appearance" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">Theme</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Choose your preferred color theme.
                          </p>
                          
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
                              <div className="w-20 h-14 rounded-lg bg-white border border-gray-200 shadow-sm mb-3 flex items-center justify-center">
                                <div className="w-12 h-2 rounded bg-gray-200" />
                              </div>
                              <span className="font-medium text-gray-900">Light</span>
                              <span className="text-xs text-gray-500 mt-1">Clean and bright</span>
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
                              <div className="w-20 h-14 rounded-lg bg-gray-800 border border-gray-700 shadow-sm mb-3 flex items-center justify-center">
                                <div className="w-12 h-2 rounded bg-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900">Dark</span>
                              <span className="text-xs text-gray-500 mt-1">Easy on the eyes</span>
                              {theme === "dark" && (
                                <div className="absolute top-3 right-3">
                                  <Check className="h-5 w-5 text-teal-600" />
                                </div>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Future settings placeholder */}
                        <div className="border-t border-gray-200 pt-6">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">More Settings</h3>
                          <p className="text-sm text-gray-500">
                            Additional appearance settings coming soon.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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
                    className="bg-teal-600 hover:bg-teal-700 min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
