// ============ 用户相关 ============
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: Date;
  isAdmin?: boolean;  // 是否是管理员
}

export interface UserSettings {
  mainAgentModel: string;
  subAgentModel: string;
  enabledTools: string[];
  theme: 'light' | 'dark';
  // Context (RAG) 设置
  contextEnabled?: boolean;              // 是否启用 Context
  contextMaxChunks?: number;             // 检索的最大块数 (1-20)
  contextSimilarityThreshold?: number;   // 相似度阈值 (0-1)
  showTokenUsage?: boolean;              // 是否显示 token 使用量
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string | null;
  contextWindow?: number | null;
  context_window?: number | null;  // 后端返回的字段名
  maxTokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
}

export interface ToolOption {
  id: string;
  name: string;
  displayName?: string;
  description?: string | null;
  category?: string | null;       // 工具分类
  isEnabled?: boolean;            // 新格式（后端返回）
  enabled?: boolean;              // 兼容旧格式
  settings?: object | null;
  usedByAgents?: string[];        // 使用此工具的 agent 列表
  usedByOrchestrator?: boolean;   // 是否被 orchestrator 直接使用
}

// 模型按提供商分组
export interface ModelsByProvider {
  [provider: string]: ModelOption[];
}

// 工具按分类分组
export interface ToolsByCategory {
  [category: string]: ToolOption[];
}

// ============ 会话相关 ============
export interface Conversation {
  cid: string;                    // 会话 ID（前端使用）
  title: string;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessage?: string;
}

// ============ 消息相关 ============
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

export interface Message {
  id: string;
  cid?: string;                    // 所属会话
  role: MessageRole;
  content: string | MessageContent[] | null;  // 后端可能返回 null
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // 子代理消息相关
  parentMessageId?: string;        // 父消息 ID（子代理消息）
  subagentName?: string;           // 子代理名称
  // 元数据（包含 todos 快照、citations、usage）
  metadata?: {
    model?: string;
    tokens?: number;
    todos?: {                      // Todos 快照
      items: Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        startedAt?: string;
        endedAt?: string;
        durationMs?: number;
        error?: string;
      }>;
      summary?: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        failed: number;
      };
    };
    citations?: ContextSearchResult[];  // 引用来源 (RAG)
    usage?: TokenUsageSummary;          // Token 使用量统计
    [key: string]: unknown;
  };
  // AI 消息可能包含工具调用
  toolCalls?: ToolCall[];          // 新格式
  tool_calls?: {                   // 兼容旧格式
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[];
}

// ============ 工具调用 ============
// 根据 FRONTEND_API_GUIDE.md 定义
export type ToolCallType = 'tool' | 'subagent' | 'function';  // function 是兼容旧格式
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'completed' | 'error' | 'interrupted';

export interface ToolCall {
  id: string;
  name: string;
  type?: ToolCallType;              // 类型：普通工具或子代理调用
  args: Record<string, unknown>;
  result?: unknown;                 // 执行结果（可以是任意类型）
  status: ToolCallStatus;
  startedAt?: string | Date;        // 开始时间 (ISO)
  endedAt?: string | Date;          // 结束时间 (ISO)
  completedAt?: Date;               // 兼容旧字段
  durationMs?: number;              // 执行耗时（毫秒）
  error?: string;                   // 错误信息
  
  // 子代理上下文 (FRONTEND_API_GUIDE.md)
  subagentName?: string;            // 执行此工具的子代理名称（null 表示主代理）
  targetSubagent?: string;          // 仅 type='subagent' 时：被调用的子代理名称
}

// ============ 子 Agent ============
export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'active' | 'running' | 'completed' | 'success' | 'error';
}

// ============ 任务 ============
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';  // 添加 failed 状态
  createdAt?: Date;
  updatedAt?: Date;
  // FRONTEND_API_GUIDE.md 定义的额外字段
  startedAt?: string;              // 开始时间 (ISO)
  endedAt?: string;                // 结束时间 (ISO)
  durationMs?: number;             // 耗时（毫秒）
  error?: string;                  // 错误信息
}

// ============ 文件 ============
export interface FileItem {
  path: string;
  content: string;
  language?: string;
  editable?: boolean;              // 是否可编辑
  lastModified?: string;           // 最后修改时间 (ISO)
  updatedAt?: Date;                // 兼容旧格式
  // 编辑相关
  lineStart?: number;              // 编辑起始行
  lineEnd?: number;                // 编辑结束行
  oldContent?: string;             // 原内容（用于 diff 显示）
}

// ============ 中断 ============
export interface InterruptData {
  id?: string;
  value: unknown;
  reason?: string;
  ns?: string[];
  scope?: string;
  actionRequests?: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
}

export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  actionName: string;
  allowedDecisions?: string[];
}

export interface ToolApprovalInterruptData {
  action_requests: ActionRequest[];
  review_configs?: ReviewConfig[];
}

// ============ 流式事件类型 ============
// 基于 WEBSOCKET_FRONTEND_GUIDE.md 定义
export type StreamEventType =
  // 连接相关
  | 'connected'          // 连接确认
  | 'pong'               // 心跳响应
  // 初始状态（连接成功后立即收到）
  | 'state'              // 兼容旧格式
  | 'state_update'       // 完整会话状态
  // 消息相关
  | 'message_start'      // 新消息开始
  | 'message_delta'      // 流式内容增量
  | 'content_delta'      // 兼容旧格式
  | 'message_end'        // 消息结束（包含完整内容和 metadata）
  | 'message_complete'   // 兼容旧格式
  | 'token'              // 兼容旧格式
  // 工具调用相关
  | 'tool_call_start'    // 工具调用开始
  | 'tool_call_args_delta' // 兼容旧格式
  | 'tool_call_result'   // 工具调用结果
  | 'tool_call_end'      // 兼容旧格式
  // 子代理相关
  | 'subagent_start'     // 子代理开始
  | 'subagent_update'    // 兼容旧格式
  | 'subagent_end'       // 子代理结束
  // 状态更新
  | 'todo_update'        // 兼容旧格式
  | 'todos_update'       // 兼容旧格式
  | 'todos_updated'      // Todos 更新
  | 'file_update'        // 兼容旧格式
  | 'file_operation'     // 文件操作
  // 中断和错误
  | 'interrupt'          // 中断（人机交互）
  | 'error'              // 错误
  | 'done';              // 请求完成

export interface StreamEvent<T = unknown> {
  type: StreamEventType;
  data: T;
  timestamp?: number;
}

// 具体事件数据类型

// 初始状态事件（连接成功后立即收到）
export interface StateEventData {
  conversation: Conversation;
  messages: Message[];
}

export interface MessageStartEventData {
  messageId: string;
  role: MessageRole;
  parentMessageId?: string;   // 如果是子代理消息
  subagentName?: string;      // 子代理名称
}

// content_delta 和 message_delta 使用相同的数据结构
export interface MessageDeltaEventData {
  messageId: string;
  delta: string;
}
export type ContentDeltaEventData = MessageDeltaEventData;

export interface MessageEndEventData {
  messageId: string;
  content?: string;
  message?: Message;          // 完整消息（包含所有 toolCalls 和 metadata）
}

export interface ToolCallStartEventData {
  messageId?: string;         // 关联的消息 ID
  toolCallId: string;
  toolName: string;
  type?: 'function' | 'subagent';  // 类型：普通函数或子代理
  toolType?: 'tool' | 'subagent';  // WEBSOCKET_FRONTEND_GUIDE.md 格式
  args?: Record<string, unknown>;
  startedAt?: string;         // 开始时间 (ISO)
  status?: 'running';
  subagentName?: string;      // 如果在子代理内运行
  targetSubagent?: string;    // 对于 task() 调用
}

// tool_call_end 和 tool_call_result 使用相同的数据结构
export interface ToolCallResultEventData {
  messageId?: string;
  toolCallId: string;
  toolName?: string;          // 工具名称
  result: unknown;            // 格式化的结果（用于显示）
  endedAt?: string;           // 结束时间 (ISO)
  durationMs?: number;        // 执行耗时（毫秒）
  status?: 'success' | 'error' | 'completed' | 'failed';
  error?: string;
}
export type ToolCallEndEventData = ToolCallResultEventData;

// 子代理开始事件（WEBSOCKET_FRONTEND_GUIDE.md 格式）
export interface SubAgentStartEventData {
  messageId?: string;
  subagentName: string;       // 注意：小写 a
  taskDescription: string;
}

// 子代理结束事件（WEBSOCKET_FRONTEND_GUIDE.md 格式）
export interface SubAgentEndEventData {
  messageId?: string;
  subagentName: string;
  status: 'success' | 'error';
}

// 兼容旧格式
export interface LegacySubAgentStartEventData {
  subAgentId: string;
  subAgentName: string;
  input: Record<string, unknown>;
}

export interface SubAgentEndEventData {
  subAgentId: string;
  output?: Record<string, unknown>;
  error?: string;
}

// Todos 快照（嵌入在消息的 metadata 中）
export interface TodosSnapshot {
  items: TodoItem[];
  summary: TodosSummary;
}

export interface TodosSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

// todos_update 事件数据
export interface TodosUpdateEventData {
  messageId: string;
  todos: TodosSnapshot;
}

// 兼容旧格式
export interface TodoUpdateEventData {
  todos: TodoItem[];
}

export interface FileUpdateEventData {
  path: string;
  content: string;
  language?: string;
}

// file_operation 事件数据 (FRONTEND_API_GUIDE.md)
export type FileOperationType = 'write' | 'edit' | 'read' | 'delete';

export interface FileOperationEventData {
  operation: FileOperationType;
  path: string;                    // 文件路径
  content?: string;                // 文件内容（write/edit/read 时）
  language: string;                // 语言类型（用于语法高亮）
  toolCallId: string;              // 关联的工具调用 ID
  editable: boolean;               // 是否可编辑（write/edit 为 true）
  lineStart?: number;              // 编辑起始行（edit 时）
  lineEnd?: number;                // 编辑结束行（edit 时）
  oldContent?: string;             // 原内容（edit 时，用于 diff 显示）
}

export interface InterruptEventData {
  interruptId: string;
  reason: string;
  actionRequests?: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
  value?: unknown;
}

export interface StateUpdateEventData {
  messages?: Message[];
  todos?: TodoItem[];
  files?: Record<string, string>;
}

export interface ErrorEventData {
  message: string;
  code?: string;
  details?: unknown;
}

// ============ API 响应类型 ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
  settings: UserSettings;
  isAdmin?: boolean;  // 是否是管理员
}

export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  todos?: TodoItem[];
  files?: Record<string, string>;
}

// ============ Context (RAG) 相关 ============

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

/** Token 使用量统计 */
export interface TokenUsageSummary {
  totalTokens: number;           // 总 token 数
  promptTokens: number;          // 输入 token 数
  completionTokens: number;      // 输出 token 数
  totalCost: number;             // 总成本（USD）
  callCount: number;             // LLM 调用次数
  byModel?: Record<string, ModelUsage>;   // 按模型分组
  bySource?: Record<string, SourceUsage>; // 按来源分组
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  callCount: number;
}

export interface SourceUsage {
  totalTokens: number;
  cost: number;
  callCount: number;
}

