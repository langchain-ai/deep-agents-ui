"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { ModelOption, ToolOption } from "@/app/types/types";
import type {
  SubAgentConfig,
  MainAgentConfig,
  ToolConfig,
  SettingsContextValue,
  UserPermissions,
  UserModelSettings,
  BackendSubAgent,
  BackendOrchestratorConfig,
} from "./types";
import { apiClient } from "@/lib/api/client";

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
  initialModels?: ModelOption[];
  initialTools?: ToolOption[];
  initialSettings?: UserModelSettings;
  permissions?: UserPermissions;
}

// 默认权限（全部开启）
const DEFAULT_PERMISSIONS: UserPermissions = {
  canConfigureMainAgent: true,
  canConfigureSubAgents: true,
  canConfigureTools: true,
  canChangeAppearance: true,
  canImportExport: true,
  isAdmin: false,
};

// 默认用户模型设置
const DEFAULT_USER_MODEL_SETTINGS: UserModelSettings = {
  orchestratorModel: "",
  defaultSubagentModel: "",
  subagentModels: {},
  enabledTools: [],
  theme: "light",
};

export function SettingsProvider({
  children,
  initialModels,
  initialTools,
  initialSettings,
  permissions = DEFAULT_PERMISSIONS,
}: SettingsProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 数据
  const [models, setModels] = useState<ModelOption[]>(initialModels || []);
  const [tools, setTools] = useState<ToolOption[]>(initialTools || []);

  // 用户模型设置
  const [userModelSettings, setUserModelSettings] = useState<UserModelSettings>(
    initialSettings || DEFAULT_USER_MODEL_SETTINGS
  );

  // Main Agent (Orchestrator) 配置
  const [mainAgentConfig, setMainAgentConfig] = useState<MainAgentConfig>({
    modelId: initialSettings?.orchestratorModel || "",
    defaultModelId: "",
    systemPrompt: "",
    additionalInstructions: "",
    directTools: [],                                    // orchestrator 直接可用的工具
    hasSubagents: true,                                 // 默认启用 subagents
    enabledSubagentCount: 0,                            // 启用的 subagent 数量
    totalSubagentCount: 0,                              // 总 subagent 数量
    enabledSubAgents: [],
    enabledTools: initialSettings?.enabledTools || [],
    isModelOverridden: false,
    isPromptOverridden: false,
    isToolsOverridden: false,
  });

  // Sub-Agents 配置（从后端获取）
  const [subAgents, setSubAgents] = useState<SubAgentConfig[]>([]);

  // 工具配置
  const [toolConfigs, setToolConfigs] = useState<Record<string, ToolConfig>>({});

  // 主题
  const [theme, setThemeState] = useState<"light" | "dark">(
    initialSettings?.theme || "light"
  );

  // UI 状态
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubAgents, setExpandedSubAgents] = useState<Set<string>>(new Set());

  // 防止重复加载的 ref
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // 加载数据 - 从 API 获取
  useEffect(() => {
    // 防止重复加载（React Strict Mode 或组件重新挂载）
    if (hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    const loadData = async () => {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // 并行获取所有数据
        const [
          modelsResponse,
          toolsResponse,
          subAgentsResponse,
          orchestratorConfig,
          userSettings,
        ] = await Promise.all([
          apiClient.getModels().catch((err) => {
            console.error("[Settings] Failed to load models:", err);
            return { models: [] };
          }),
          apiClient.getTools().catch((err) => {
            console.error("[Settings] Failed to load tools:", err);
            return { tools: [] };
          }),
          apiClient.getSubAgents().catch((err) => {
            console.error("[Settings] Failed to load sub-agents:", err);
            return { subagents: [] };
          }),
          apiClient.getOrchestratorConfig().catch((err) => {
            console.error("[Settings] Failed to load orchestrator config:", err);
            return null;
          }),
          apiClient.getSettings().catch((err) => {
            console.error("[Settings] Failed to load user settings:", err);
            return null;
          }),
        ]);
        
        // 标记已加载完成
        hasLoadedRef.current = true;
        
        console.log("[Settings] Loaded data:", {
          models: modelsResponse.models?.length || 0,
          tools: toolsResponse.tools?.length || 0,
          subAgents: subAgentsResponse.subagents?.length || 0,
          hasOrchestratorConfig: !!orchestratorConfig,
          hasUserSettings: !!userSettings,
        });

        // 设置模型列表
        const loadedModels = modelsResponse.models || [];
        setModels(loadedModels);

        // 设置工具列表（转换为前端格式）
        const loadedTools = (toolsResponse.tools || []).map(tool => ({
          ...tool,
          enabled: tool.isEnabled ?? tool.enabled ?? false,  // 统一为 enabled
          usedByAgents: tool.usedByAgents || [],
          usedByOrchestrator: tool.usedByOrchestrator ?? false,
        }));
        setTools(loadedTools);

        // 初始化工具配置
        const initialToolConfigs: Record<string, ToolConfig> = {};
        loadedTools.forEach((tool) => {
          initialToolConfigs[tool.id] = {
            ...tool,
            enabled: userSettings?.enabledTools?.includes(tool.id) ?? tool.enabled ?? false,
          };
        });
        setToolConfigs(initialToolConfigs);

        // 设置用户模型设置
        if (userSettings) {
          setUserModelSettings(userSettings);
          setThemeState(userSettings.theme || "light");
        }

        // 设置 Orchestrator 配置（包含 subagents 摘要信息）
        const defaultOrchestratorModel = loadedModels[0]?.id || "";
        const subagentsSummary = orchestratorConfig?.subagents || [];
        const enabledSubagentNames = subagentsSummary
          .filter(s => s.isEnabled)
          .map(s => s.name);
        
        setMainAgentConfig({
          modelId: userSettings?.orchestratorModel || orchestratorConfig?.modelId || defaultOrchestratorModel,
          defaultModelId: defaultOrchestratorModel,
          systemPrompt: orchestratorConfig?.systemPrompt || "",
          additionalInstructions: "",
          directTools: orchestratorConfig?.tools || [],           // 从后端获取 orchestrator 直接工具
          hasSubagents: orchestratorConfig?.hasSubagents ?? true, // 是否启用 subagents
          enabledSubagentCount: orchestratorConfig?.enabledSubagentCount || 0,
          totalSubagentCount: subagentsSummary.length,
          enabledSubAgents: enabledSubagentNames,                 // 从 subagents 摘要获取启用的 agent
          enabledTools: userSettings?.enabledTools || [],
          isModelOverridden: orchestratorConfig?.isModelOverridden || false,
          isPromptOverridden: orchestratorConfig?.isPromptOverridden || false,
          isToolsOverridden: orchestratorConfig?.isToolsOverridden || false,
        });

        // 设置 Sub-Agents 配置（结合 subagents 摘要和详细信息）
        const backendSubAgents: BackendSubAgent[] = subAgentsResponse.subagents || [];
        const globalDefaultModel = userSettings?.defaultSubagentModel || defaultOrchestratorModel;
        
        // 创建 subagent 摘要的 Map 用于快速查找
        const subagentSummaryMap = new Map(subagentsSummary.map(s => [s.name, s]));
        
        const subAgentConfigs: SubAgentConfig[] = backendSubAgents.map((agent) => {
          const userModelId = userSettings?.subagentModels?.[agent.name];
          // 后端返回的默认模型（用于显示 "Default: xxx"）
          const backendDefaultModel = agent.defaultModel || "";
          // 实际使用的默认模型（优先级：后端默认 > 全局默认）
          const effectiveDefaultModel = backendDefaultModel || globalDefaultModel;
          // 从摘要获取启用状态
          const summary = subagentSummaryMap.get(agent.name);
          
          return {
            id: agent.name,
            name: agent.name,
            description: agent.description,
            category: agent.category,
            modelId: userModelId || effectiveDefaultModel,
            defaultModelId: backendDefaultModel, // 只显示后端返回的默认模型
            systemPrompt: "",
            tools: agent.tools,
            toolCount: summary?.toolCount || agent.tools.length,
            enabledTools: agent.tools,
            isActive: true,
            isEnabled: summary?.isEnabled ?? true,  // 从摘要获取启用状态
            isModelOverridden: false,
          };
        });
        setSubAgents(subAgentConfigs);

        // 默认展开第一个提供商
        if (loadedModels.length > 0) {
          const firstProvider = loadedModels[0].provider?.toLowerCase() || "other";
          setExpandedProviders(new Set([firstProvider]));
        }

        // 默认展开所有分类
        if (loadedTools.length > 0) {
          const categories = new Set(loadedTools.map((t) => t.category || "General"));
          setExpandedCategories(categories);
        }
      } catch (err) {
        console.error("Failed to load settings data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        // API 失败时保持空数据
        setModels([]);
        setTools([]);
        setSubAgents([]);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadData();
  }, []);

  // 按提供商分组模型
  const modelsByProvider = useMemo(() => {
    return models.reduce(
      (acc, model) => {
        const provider = model.provider?.toLowerCase() || "other";
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      },
      {} as Record<string, ModelOption[]>
    );
  }, [models]);

  // 按分类分组工具
  const toolsByCategory = useMemo(() => {
    return tools.reduce(
      (acc, tool) => {
        const category = tool.category || "General";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(tool);
        return acc;
      },
      {} as Record<string, ToolOption[]>
    );
  }, [tools]);

  // Toggle 函数
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

  // 更新 Sub-Agent 的模型
  const updateSubAgentModel = useCallback((subAgentName: string, modelId: string) => {
    // 更新 subAgents 状态
    setSubAgents((prev) =>
      prev.map((a) => (a.name === subAgentName ? { ...a, modelId } : a))
    );
    // 更新 userModelSettings
    setUserModelSettings((prev) => ({
      ...prev,
      subagentModels: {
        ...prev.subagentModels,
        [subAgentName]: modelId,
      },
    }));
  }, []);

  // 切换 Sub-Agent 启用状态（调用后端 API）
  const toggleSubAgentEnabled = useCallback(async (agentName: string, isEnabled: boolean) => {
    try {
      // 调用后端 API
      await apiClient.toggleAgentEnabled(agentName, isEnabled);
      
      // 更新本地状态
      setSubAgents((prev) =>
        prev.map((a) => (a.name === agentName ? { ...a, isEnabled } : a))
      );
      
      // 更新 mainAgentConfig.enabledSubAgents
      setMainAgentConfig((prev) => ({
        ...prev,
        enabledSubAgents: isEnabled
          ? [...prev.enabledSubAgents, agentName]
          : prev.enabledSubAgents.filter((name) => name !== agentName),
      }));
    } catch (err) {
      console.error("Failed to toggle agent:", err);
      setError(err instanceof Error ? err.message : "Failed to toggle agent");
      throw err;
    }
  }, []);

  // 工具管理（本地状态切换）
  const toggleTool = useCallback((toolId: string) => {
    setToolConfigs((prev) => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        enabled: !prev[toolId]?.enabled,
      },
    }));
    // 同步更新 userModelSettings.enabledTools
    setUserModelSettings((prev) => {
      const isCurrentlyEnabled = prev.enabledTools.includes(toolId);
      return {
        ...prev,
        enabledTools: isCurrentlyEnabled
          ? prev.enabledTools.filter((id) => id !== toolId)
          : [...prev.enabledTools, toolId],
      };
    });
  }, []);

  // 切换工具启用状态（调用后端 API）
  const toggleToolEnabled = useCallback(async (toolName: string, isEnabled: boolean) => {
    try {
      // 调用后端 API
      await apiClient.toggleToolEnabled(toolName, isEnabled);
      
      // 更新本地状态
      setToolConfigs((prev) => ({
        ...prev,
        [toolName]: {
          ...prev[toolName],
          enabled: isEnabled,
          isEnabled: isEnabled,
        },
      }));
      
      // 同步更新 tools 列表
      setTools((prev) =>
        prev.map((t) => (t.id === toolName ? { ...t, enabled: isEnabled, isEnabled } : t))
      );
    } catch (err) {
      console.error("Failed to toggle tool:", err);
      setError(err instanceof Error ? err.message : "Failed to toggle tool");
      throw err;
    }
  }, []);

  const setToolModel = useCallback((toolId: string, modelId: string) => {
    setToolConfigs((prev) => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        modelId,
      },
    }));
  }, []);

  // 主题设置（实际应用主题）
  const setTheme = useCallback((newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    setUserModelSettings((prev) => ({ ...prev, theme: newTheme }));
    // 实际应用主题到 DOM
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
        root.setAttribute("data-joy-color-scheme", "dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        root.setAttribute("data-joy-color-scheme", "light");
      }
      // 保存到 localStorage
      localStorage.setItem("theme", newTheme);
    }
  }, []);

  // 初始化时应用主题
  useEffect(() => {
    if (typeof document !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
      setThemeState(initialTheme);
      // 立即应用主题
      const root = document.documentElement;
      if (initialTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
        root.setAttribute("data-joy-color-scheme", "dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        root.setAttribute("data-joy-color-scheme", "light");
      }
    }
  }, []);

  // 保存设置到后端
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // 构建要保存的用户设置
      const settingsToSave: Partial<UserModelSettings> = {
        orchestratorModel: mainAgentConfig.modelId,
        defaultSubagentModel: userModelSettings.defaultSubagentModel,
        subagentModels: {},
        enabledTools: Object.entries(toolConfigs)
          .filter(([, config]) => config.enabled)
          .map(([id]) => id),
        theme,
        // Context (RAG) 设置
        contextEnabled: userModelSettings.contextEnabled,
        contextMaxChunks: userModelSettings.contextMaxChunks,
        contextSimilarityThreshold: userModelSettings.contextSimilarityThreshold,
        showTokenUsage: userModelSettings.showTokenUsage,
      };

      // 收集每个 sub-agent 的模型设置
      subAgents.forEach((agent) => {
        if (agent.modelId && agent.modelId !== agent.defaultModelId) {
          settingsToSave.subagentModels![agent.name] = agent.modelId;
        }
      });

      // 调用 API 保存用户设置
      await apiClient.updateSettings(settingsToSave);
      
      // 如果是管理员，还需要保存管理员配置
      if (permissions.isAdmin) {
        // 保存 Orchestrator 配置
        await apiClient.updateOrchestratorConfig({
          modelId: mainAgentConfig.modelId,
          systemPrompt: mainAgentConfig.systemPrompt || null,
          tools: mainAgentConfig.directTools.length > 0 ? mainAgentConfig.directTools : null,
        });
        
        // 保存每个 Sub-Agent 的配置（如果有修改）
        // 注意：这里只保存被管理员覆盖的配置
        // 普通用户的模型选择通过 userModelSettings.subagentModels 保存
      }
      
      console.log("[Settings] Saved successfully:", settingsToSave);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [mainAgentConfig.modelId, mainAgentConfig.systemPrompt, mainAgentConfig.directTools, userModelSettings, subAgents, toolConfigs, theme, permissions.isAdmin]);

  // 重置 Orchestrator 配置到默认值（管理员）
  const resetOrchestratorConfig = useCallback(async () => {
    if (!permissions.isAdmin) return;
    
    try {
      await apiClient.resetOrchestratorConfig();
      // 重新加载配置
      const orchestratorConfig = await apiClient.getOrchestratorConfig();
      const subagentsSummary = orchestratorConfig.subagents || [];
      const enabledSubagentNames = subagentsSummary
        .filter(s => s.isEnabled)
        .map(s => s.name);
      
      setMainAgentConfig((prev) => ({
        ...prev,
        modelId: orchestratorConfig.modelId,
        systemPrompt: orchestratorConfig.systemPrompt,
        directTools: orchestratorConfig.tools || [],
        hasSubagents: orchestratorConfig.hasSubagents ?? true,
        enabledSubagentCount: orchestratorConfig.enabledSubagentCount || 0,
        totalSubagentCount: subagentsSummary.length,
        enabledSubAgents: enabledSubagentNames,
        isModelOverridden: false,
        isPromptOverridden: false,
        isToolsOverridden: false,
      }));
    } catch (err) {
      console.error("Failed to reset orchestrator config:", err);
      setError(err instanceof Error ? err.message : "Failed to reset config");
    }
  }, [permissions.isAdmin]);

  // 重置 Sub-Agent 配置到默认值（管理员）
  const resetAgentConfig = useCallback(async (agentName: string) => {
    if (!permissions.isAdmin) return;
    
    try {
      await apiClient.resetAgentConfig(agentName);
      // 更新本地状态
      setSubAgents((prev) =>
        prev.map((a) =>
          a.name === agentName
            ? { ...a, modelId: a.defaultModelId, isModelOverridden: false }
            : a
        )
      );
    } catch (err) {
      console.error("Failed to reset agent config:", err);
      setError(err instanceof Error ? err.message : "Failed to reset config");
    }
  }, [permissions.isAdmin]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      models,
      tools,
      modelsByProvider,
      toolsByCategory,
      mainAgentConfig,
      setMainAgentConfig,
      subAgents,
      setSubAgents,
      updateSubAgentModel,
      toggleSubAgentEnabled,
      userModelSettings,
      setUserModelSettings,
      toolConfigs,
      setToolConfigs,
      toggleTool,
      toggleToolEnabled,
      setToolModel,
      theme,
      setTheme,
      expandedProviders,
      toggleProvider,
      expandedCategories,
      toggleCategory,
      expandedSubAgents,
      toggleSubAgent,
      isLoading,
      isSaving,
      error,
      saveSettings,
      resetOrchestratorConfig,
      resetAgentConfig,
      permissions,
    }),
    [
      models,
      tools,
      modelsByProvider,
      toolsByCategory,
      mainAgentConfig,
      subAgents,
      updateSubAgentModel,
      toggleSubAgentEnabled,
      userModelSettings,
      toolConfigs,
      toggleTool,
      toggleToolEnabled,
      setToolModel,
      theme,
      setTheme,
      expandedProviders,
      toggleProvider,
      expandedCategories,
      toggleCategory,
      expandedSubAgents,
      toggleSubAgent,
      isLoading,
      isSaving,
      error,
      saveSettings,
      resetOrchestratorConfig,
      resetAgentConfig,
      permissions,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
