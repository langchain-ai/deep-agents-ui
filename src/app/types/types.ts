// ============ 用户相关 ============
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: Date;
}

export interface UserSettings {
  mainAgentModel: string;
  subAgentModel: string;
  enabledTools: string[];
  theme: 'light' | 'dark';
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface ToolOption {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
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
  content: string | MessageContent[];
  createdAt?: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    [key: string]: unknown;
  };
  // AI 消息可能包含工具调用
  tool_calls?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[];
}

// ============ 工具调用 ============
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'interrupted';
  startedAt?: Date;
  completedAt?: Date;
}

// ============ 子 Agent ============
export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'active' | 'running' | 'completed' | 'error';
}

// ============ 任务 ============
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

// ============ 文件 ============
export interface FileItem {
  path: string;
  content: string;
  language?: string;
  updatedAt?: Date;
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
export type StreamEventType =
  | 'connected'
  | 'message_start'
  | 'message_delta'
  | 'message_end'
  | 'tool_call_start'
  | 'tool_call_args_delta'
  | 'tool_call_result'
  | 'subagent_start'
  | 'subagent_update'
  | 'subagent_end'
  | 'todo_update'
  | 'file_update'
  | 'interrupt'
  | 'state_update'
  | 'error'
  | 'done';

export interface StreamEvent<T = unknown> {
  type: StreamEventType;
  data: T;
  timestamp?: number;
}

// 具体事件数据类型
export interface MessageStartEventData {
  messageId: string;
  role: MessageRole;
}

export interface MessageDeltaEventData {
  messageId: string;
  delta: string;
}

export interface MessageEndEventData {
  messageId: string;
  content?: string;
}

export interface ToolCallStartEventData {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
}

export interface ToolCallResultEventData {
  toolCallId: string;
  result: string;
  error?: string;
}

export interface SubAgentStartEventData {
  subAgentId: string;
  subAgentName: string;
  input: Record<string, unknown>;
}

export interface SubAgentEndEventData {
  subAgentId: string;
  output?: Record<string, unknown>;
  error?: string;
}

export interface TodoUpdateEventData {
  todos: TodoItem[];
}

export interface FileUpdateEventData {
  path: string;
  content: string;
  language?: string;
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
}

export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  todos?: TodoItem[];
  files?: Record<string, string>;
}

// ============ 兼容 LangGraph 的类型（用于渐进迁移）============
export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  status?: 'idle' | 'busy' | 'interrupted' | 'error';
}
