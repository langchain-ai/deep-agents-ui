// ============ Settings 模块类型定义 ============

import type { ModelOption, ToolOption } from "@/app/types/types";

// 用户权限类型
export interface UserPermissions {
  canConfigureMainAgent?: boolean;
  canConfigureSubAgents?: boolean;
  canConfigureTools?: boolean;
  canChangeAppearance?: boolean;
  canImportExport?: boolean;
  isAdmin?: boolean;  // 是否是管理员
}

// Subagent 摘要信息（用于 orchestrator 配置返回）
export interface SubagentSummary {
  name: string;
  description: string;
  isEnabled: boolean;
  category: string;
  toolCount: number;
}

// 后端返回的 Sub-Agent 信息（只读）
export interface BackendSubAgent {
  name: string;
  description: string;
  category: string;
  tools: string[];
  defaultModel: string;
}

// 后端返回的 Agent 配置（管理员可修改）
export interface BackendAgentConfig {
  name: string;
  description: string;
  modelId: string;
  systemPrompt: string;
  tools: string[];
  toolCount: number;              // 新增：工具数量
  isEnabled: boolean;
  category: string;
  isModelOverridden: boolean;
  isPromptOverridden: boolean;
  isToolsOverridden: boolean;
  isDescriptionOverridden: boolean; // 新增：描述是否被覆盖
}

// 后端返回的 Orchestrator 配置
export interface BackendOrchestratorConfig {
  modelId: string;
  systemPrompt: string;
  tools: string[];                   // orchestrator 直接可用的工具列表
  subagents: SubagentSummary[];      // 新增：所有 subagents 的摘要列表
  enabledSubagentCount: number;      // 新增：启用的 subagent 数量
  hasSubagents: boolean;             // 是否启用 subagents
  isModelOverridden: boolean;
  isPromptOverridden: boolean;
  isToolsOverridden: boolean;        // 工具是否被覆盖
}

// 用户设置（用户级别的模型配置）
export interface UserModelSettings {
  orchestratorModel: string;
  defaultSubagentModel: string;
  subagentModels: Record<string, string>;  // subagent name -> model id
  enabledTools: string[];
  theme: 'light' | 'dark';
  // Context (RAG) 设置
  contextEnabled?: boolean;              // 是否启用 Context
  contextMaxChunks?: number;             // 检索的最大块数 (1-20)
  contextSimilarityThreshold?: number;   // 相似度阈值 (0-1)
  showTokenUsage?: boolean;              // 是否显示 token 使用量
}

// Sub-Agent 配置类型（前端使用，结合后端数据和用户设置）
export interface SubAgentConfig {
  id: string;              // 使用 name 作为 id
  name: string;
  description: string;
  category: string;
  modelId: string;         // 当前选择的模型（用户设置 > 管理员配置 > 默认）
  defaultModelId: string;  // 默认模型
  systemPrompt: string;
  tools: string[];         // 该 sub-agent 可用的工具
  toolCount: number;       // 工具数量
  enabledTools: string[];  // 启用的工具（用于前端展示）
  isActive: boolean;       // 是否激活（从 subagents 摘要获取）
  isEnabled: boolean;      // 是否启用（从 orchestrator config 获取）
  isModelOverridden: boolean;  // 是否被管理员覆盖
}

// Tool 配置类型（扩展 ToolOption，添加模型配置）
export interface ToolConfig extends ToolOption {
  modelId?: string;  // 某些工具需要指定模型
  requiresModel?: boolean;  // 是否需要模型配置
}

// Main Agent (Orchestrator) 配置类型
export interface MainAgentConfig {
  modelId: string;
  defaultModelId: string;           // 默认模型
  systemPrompt: string;
  additionalInstructions: string;
  directTools: string[];            // orchestrator 直接可用的工具 ID 列表
  hasSubagents: boolean;            // 是否启用 subagents
  enabledSubagentCount: number;     // 启用的 subagent 数量（从后端获取）
  totalSubagentCount: number;       // 总 subagent 数量
  enabledSubAgents: string[];       // 启用的子 Agent 名称列表（当 hasSubagents=true）
  enabledTools: string[];           // 用户启用的工具 ID 列表
  isModelOverridden: boolean;       // 模型是否被管理员覆盖
  isPromptOverridden: boolean;      // 提示词是否被管理员覆盖
  isToolsOverridden: boolean;       // 工具是否被管理员覆盖
}

// Tab 类型
export type TabType = "main-agent" | "sub-agents" | "tools" | "context" | "appearance" | "account";

// Settings Context 类型
export interface SettingsContextValue {
  // 数据
  models: ModelOption[];
  tools: ToolOption[];
  modelsByProvider: Record<string, ModelOption[]>;
  toolsByCategory: Record<string, ToolOption[]>;
  
  // Main Agent (Orchestrator) 配置
  mainAgentConfig: MainAgentConfig;
  setMainAgentConfig: React.Dispatch<React.SetStateAction<MainAgentConfig>>;
  
  // Sub-Agents 配置（从后端获取的列表）
  subAgents: SubAgentConfig[];
  setSubAgents: React.Dispatch<React.SetStateAction<SubAgentConfig[]>>;
  updateSubAgentModel: (subAgentName: string, modelId: string) => void;
  toggleSubAgentEnabled: (agentName: string, isEnabled: boolean) => Promise<void>;  // 调用后端 API
  
  // 用户模型设置
  userModelSettings: UserModelSettings;
  setUserModelSettings: React.Dispatch<React.SetStateAction<UserModelSettings>>;
  
  // 工具配置
  toolConfigs: Record<string, ToolConfig>;
  setToolConfigs: React.Dispatch<React.SetStateAction<Record<string, ToolConfig>>>;
  toggleTool: (toolId: string) => void;
  toggleToolEnabled: (toolName: string, isEnabled: boolean) => Promise<void>;  // 调用后端 API
  setToolModel: (toolId: string, modelId: string) => void;
  
  // 主题
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  
  // UI 状态
  expandedProviders: Set<string>;
  toggleProvider: (provider: string) => void;
  expandedCategories: Set<string>;
  toggleCategory: (category: string) => void;
  expandedSubAgents: Set<string>;
  toggleSubAgent: (id: string) => void;
  
  // 加载/保存状态
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // 保存设置
  saveSettings: () => Promise<void>;
  
  // 管理员操作
  resetOrchestratorConfig: () => Promise<void>;
  resetAgentConfig: (agentName: string) => Promise<void>;
  
  // 权限
  permissions: UserPermissions;
}

// 需要模型配置的工具列表
export const TOOLS_REQUIRING_MODEL = [
  "image_generator",
  "code_interpreter",
  "perplexity_search",
];

