/**
 * SeenOS HTTP API 客户端
 * 基于 FRONTEND_API_GUIDE.md 实现
 * 
 * Base URL: http://localhost:8000/api
 */

// ============ 配置 ============
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// ============ 类型定义 ============

/** API 错误 */
export interface ApiError extends Error {
  code?: string;
  status?: number;
}

/** 用户 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  created_at: string;
}

/** 用户设置 */
export interface UserSettings {
  orchestratorModel: string;
  defaultSubagentModel: string;
  subagentModels: Record<string, string>;
  enabledTools: string[];
  theme: 'light' | 'dark';
  // Context (RAG) 设置
  contextEnabled?: boolean;              // 是否启用 Context
  contextMaxChunks?: number;             // 检索的最大块数 (1-20)
  contextSimilarityThreshold?: number;   // 相似度阈值 (0-1)
  showTokenUsage?: boolean;              // 是否显示 token 使用量
}

/** 登录响应 */
export interface LoginResponse {
  token: string;
  user: User;
  settings: UserSettings;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  inviteCode: string;
}

/** 注册响应 */
export interface RegisterResponse {
  token: string;
  user: User;
  settings: UserSettings;
}

/** 当前用户响应 */
export interface AuthMeResponse {
  user: User;
  settings: UserSettings;
  isAdmin: boolean;
}

/** 对话 */
export interface Conversation {
  cid: string;
  title: string;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 对话列表响应 */
export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** 消息 */
export interface Message {
  id: string;
  cid: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;  // 后端可能返回 null
  metadata: Record<string, unknown> | null;
  toolCalls: ToolCall[] | null;
  toolCallId: string | null;
  createdAt: string;
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** TODO */
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

/** 对话详情响应 */
export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  todos: Todo[];
  files: Record<string, string>;
}

/** 模型选项 */
export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  context_window: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
}

/** 提供商模型分组 */
export interface ProviderModels {
  providerId: string;
  providerName: string;
  icon: string;
  models: ModelOption[];
}

/** 工具选项 */
export interface ToolOption {
  id: string;
  name: string;
  displayName?: string;
  description: string | null;
  category: string | null;
  isEnabled: boolean;             // 改为 isEnabled (后端格式)
  enabled?: boolean;              // 兼容旧格式
  settings?: object | null;
  usedByAgents: string[];         // 新增：使用此工具的 agent 列表
  usedByOrchestrator: boolean;    // 新增：是否被 orchestrator 直接使用
}

/** Subagent 摘要信息（用于 orchestrator 配置返回） */
export interface SubagentSummary {
  name: string;
  description: string;
  isEnabled: boolean;
  category: string;
  toolCount: number;
}

/** 子代理（从后端获取的基本信息） */
export interface SubAgent {
  name: string;
  description: string;
  category: string;
  tools: string[];
  defaultModel: string;
}

/** 子代理配置 (管理员) */
export interface AgentConfig {
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

/** 主代理配置 (管理员) */
export interface OrchestratorConfig {
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

/** 主代理配置更新请求 */
export interface OrchestratorConfigUpdate {
  modelId?: string | null;
  systemPrompt?: string | null;
  tools?: string[] | null;           // 可配置 orchestrator 直接工具
}

// ============ 请求选项 ============
interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// ============ API 客户端 ============
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** 获取 API 基础 URL */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** 设置 API 基础 URL */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /** 设置认证 token */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('seenos_token', token);
    } else {
      localStorage.removeItem('seenos_token');
    }
  }

  /** 获取当前 token */
  getToken(): string | null {
    return this.token;
  }

  /** 从 localStorage 加载 token */
  loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('seenos_token');
    }
  }

  /** 清除 token */
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seenos_token');
    }
  }

  /** 构建请求头 */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /** 发送请求 */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      // Token 过期处理
      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }

      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  }

  /** GET 请求 */
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /** POST 请求 */
  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** PUT 请求 */
  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** PATCH 请求 */
  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** DELETE 请求 */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============ 认证 API ============

  /** 用户登录 */
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.post<LoginResponse>('/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  /** 用户注册 */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const data = await this.post<RegisterResponse>('/auth/register', request);
    this.setToken(data.token);
    return data;
  }

  /** 退出登录 */
  async logout(): Promise<void> {
    await this.post('/auth/logout');
    this.clearToken();
  }

  /** 获取当前用户 */
  async getCurrentUser(): Promise<AuthMeResponse> {
    return this.get<AuthMeResponse>('/auth/me');
  }

  /** 更新用户资料 */
  async updateProfile(data: { name?: string; avatar?: string }): Promise<User> {
    return this.put<User>('/auth/profile', data);
  }

  /** 修改密码 */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.post('/auth/password', { oldPassword, newPassword });
  }

  /** 获取 OAuth 提供商 */
  async getOAuthProviders(): Promise<Record<string, boolean>> {
    return this.get<Record<string, boolean>>('/auth/oauth/providers');
  }

  /** Google OAuth 回调 */
  async googleOAuthCallback(code: string, redirectUri: string): Promise<LoginResponse & { isNewUser: boolean }> {
    const data = await this.post<LoginResponse & { isNewUser: boolean }>('/auth/oauth/google', {
      code,
      redirect_uri: redirectUri,
    });
    this.setToken(data.token);
    return data;
  }

  // ============ 对话 API ============

  /** 获取对话列表 */
  async getConversations(options?: {
    offset?: number;
    limit?: number;
    status?: 'idle' | 'busy' | 'interrupted' | 'error';
  }): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;
    return this.get<ConversationListResponse>('/conversations', params);
  }

  /** 创建对话 */
  async createConversation(title?: string): Promise<{ cid: string; conversation: Conversation }> {
    return this.post<{ cid: string; conversation: Conversation }>('/conversations', { title });
  }

  /** 获取对话详情 */
  async getConversation(cid: string): Promise<ConversationDetailResponse> {
    return this.get<ConversationDetailResponse>(`/conversations/${cid}`);
  }

  /** 更新对话 */
  async updateConversation(cid: string, data: { title?: string; status?: string }): Promise<Conversation> {
    return this.patch<Conversation>(`/conversations/${cid}`, data);
  }

  /** 删除对话 */
  async deleteConversation(cid: string): Promise<void> {
    return this.delete(`/conversations/${cid}`);
  }

  /** 更新对话文件 */
  async updateConversationFiles(cid: string, files: Record<string, string>): Promise<void> {
    return this.put(`/conversations/${cid}/files`, { files });
  }

  /** 继续对话 */
  async continueConversation(cid: string): Promise<void> {
    return this.post(`/conversations/${cid}/continue`);
  }

  /** 标记对话完成 */
  async resolveConversation(cid: string): Promise<void> {
    return this.post(`/conversations/${cid}/resolve`);
  }

  // ============ 聊天 API (SSE 模式) ============

  /** 发送消息 (SSE 模式) */
  async sendMessage(cid: string, content: string, attachments?: unknown[]): Promise<void> {
    return this.post(`/chat/${cid}/messages`, { content, attachments });
  }

  /** 停止生成 (SSE 模式) */
  async stopGeneration(cid: string): Promise<void> {
    return this.post(`/chat/${cid}/stop`);
  }

  /** 恢复中断 (SSE 模式) */
  async resumeInterrupt(cid: string, interruptId: string, decision: unknown): Promise<void> {
    return this.post(`/chat/${cid}/interrupt/resume`, { interruptId, decision });
  }

  // ============ 模型 API ============

  /** 获取模型列表 (扁平) */
  async getModels(): Promise<{ models: ModelOption[] }> {
    return this.get<{ models: ModelOption[] }>('/models');
  }

  /** 获取模型列表 (按提供商分组) */
  async getModelsGrouped(): Promise<{ providers: ProviderModels[] }> {
    return this.get<{ providers: ProviderModels[] }>('/models/grouped');
  }

  /** 获取默认模型 */
  async getDefaultModels(): Promise<{ orchestratorModel: string; defaultSubagentModel: string }> {
    return this.get<{ orchestratorModel: string; defaultSubagentModel: string }>('/models/defaults');
  }

  /** 获取子代理列表 */
  async getSubAgents(): Promise<{ subagents: SubAgent[] }> {
    return this.get<{ subagents: SubAgent[] }>('/models/subagents');
  }

  // ============ 工具 API ============

  /** 获取工具列表 */
  async getTools(): Promise<{ tools: ToolOption[] }> {
    return this.get<{ tools: ToolOption[] }>('/tools');
  }

  // ============ 设置 API ============

  /** 获取用户设置 */
  async getSettings(): Promise<UserSettings> {
    return this.get<UserSettings>('/settings');
  }

  /** 更新用户设置 */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.put<UserSettings>('/settings', settings);
  }

  // ============ 配置 API (管理员) ============

  /** 获取所有子代理配置 */
  async getAgentConfigs(): Promise<AgentConfig[]> {
    return this.get<AgentConfig[]>('/config/agents');
  }

  /** 获取单个子代理配置 */
  async getAgentConfig(agentName: string): Promise<AgentConfig> {
    return this.get<AgentConfig>(`/config/agents/${agentName}`);
  }

  /** 更新子代理配置 (管理员) */
  async updateAgentConfig(agentName: string, config: Partial<AgentConfig>): Promise<AgentConfig> {
    return this.put<AgentConfig>(`/config/agents/${agentName}`, config);
  }

  /** 切换子代理启用状态 (管理员) - 简化的启用/禁用 API */
  async toggleAgentEnabled(agentName: string, isEnabled: boolean): Promise<AgentConfig> {
    return this.patch<AgentConfig>(`/config/agents/${agentName}/toggle`, { isEnabled });
  }

  /** 重置子代理配置 (管理员) */
  async resetAgentConfig(agentName: string): Promise<void> {
    return this.delete(`/config/agents/${agentName}`);
  }

  /** 获取主代理配置 */
  async getOrchestratorConfig(): Promise<OrchestratorConfig> {
    return this.get<OrchestratorConfig>('/config/orchestrator');
  }

  /** 更新主代理配置 (管理员) */
  async updateOrchestratorConfig(config: OrchestratorConfigUpdate): Promise<OrchestratorConfig> {
    return this.put<OrchestratorConfig>('/config/orchestrator', config);
  }

  /** 重置主代理配置 (管理员) */
  async resetOrchestratorConfig(): Promise<void> {
    return this.delete('/config/orchestrator');
  }

  /** 获取工具配置 */
  async getToolConfigs(): Promise<unknown[]> {
    return this.get<unknown[]>('/config/tools');
  }

  /** 更新工具配置 (管理员) */
  async updateToolConfig(toolName: string, config: { isEnabled: boolean }): Promise<void> {
    return this.put(`/config/tools/${toolName}`, config);
  }

  /** 切换工具启用状态 (管理员) - 简化的启用/禁用 API */
  async toggleToolEnabled(toolName: string, isEnabled: boolean): Promise<ToolOption> {
    return this.patch<ToolOption>(`/config/tools/${toolName}/toggle`, { isEnabled });
  }

  /** 获取默认提示词模板 */
  async getDefaultPrompts(): Promise<Array<{ name: string; content: string }>> {
    return this.get<Array<{ name: string; content: string }>>('/config/prompts/defaults');
  }

  /** 获取管理员列表 (管理员) */
  async getAdmins(): Promise<User[]> {
    return this.get<User[]>('/config/admins');
  }

  // ============ Context API (RAG) ============

  /** 获取用户上下文文件列表 */
  async getContextFiles(): Promise<ContextListResponse> {
    return this.get<ContextListResponse>('/context');
  }

  /** 上传上下文文件 */
  async uploadContextFile(file: File, filename?: string): Promise<ContextFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await fetch(`${this.baseUrl}/context/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }
      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  /** 删除上下文文件 */
  async deleteContextFile(contextId: string): Promise<void> {
    return this.delete(`/context/${contextId}`);
  }

  /** 获取文件内容 */
  async getContextFileContent(contextId: string): Promise<ContextContentResponse> {
    return this.get<ContextContentResponse>(`/context/${contextId}/content`);
  }

  /** 获取文件分块 */
  async getContextFileChunks(contextId: string): Promise<ContextChunksResponse> {
    return this.get<ContextChunksResponse>(`/context/${contextId}/chunks`);
  }

  /** 下载原始文件 */
  async downloadContextFile(contextId: string, filename: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/context/${contextId}/download`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** 搜索上下文 */
  async searchContext(query: string, options?: {
    top_k?: number;
    similarity_threshold?: number;
  }): Promise<{ results: ContextSearchResult[] }> {
    return this.post<{ results: ContextSearchResult[] }>('/context/search', {
      query,
      ...options,
    });
  }
}

// ============ Context 类型定义 ============

/** 上下文文件 */
export interface ContextFile {
  id: string;
  filename: string;
  fileType: 'txt' | 'md' | 'pdf' | 'docx';
  fileSize: number;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: string;
}

/** 上下文列表响应 */
export interface ContextListResponse {
  contexts: ContextFile[];
  totalSize: number;   // 当前已用存储（字节）
  maxSize: number;     // 最大存储限制（字节）
}

/** 上下文搜索结果 */
export interface ContextSearchResult {
  contextId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** 文件内容响应 */
export interface ContextContentResponse {
  id: string;
  filename: string;
  fileType: string;
  content: string;  // 提取的文本内容
}

/** 文件分块 */
export interface ContextChunk {
  index: number;
  content: string;
}

/** 文件分块响应 */
export interface ContextChunksResponse {
  id: string;
  filename: string;
  chunkCount: number;
  chunks: ContextChunk[];
}

// 导出单例实例
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
export { ApiClient, API_BASE_URL };
