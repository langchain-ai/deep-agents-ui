"use client";

import { useEffect, useCallback, useRef, useMemo, useReducer } from "react";
import { WebSocketStream, type InterruptDecision, type ConnectionState } from "@/lib/stream/websocket";
import { apiClient } from "@/lib/api/client";
import type {
  Message,
  ToolCall,
  TodoItem,
  FileItem,
  InterruptData,
  StreamEvent,
  MessageStartEventData,
  MessageEndEventData,
  ToolCallStartEventData,
  ToolCallResultEventData,
  FileOperationEventData,
} from "@/types";

// ============ 配置 ============

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  const apiBaseUrl = apiClient.getBaseUrl();
  const baseWithoutApi = apiBaseUrl.replace(/\/api$/, '');
  const wsUrl = baseWithoutApi
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
  
  return `${wsUrl}/ws/chat`;
}

// ============ 类型定义 ============

export type StreamTransport = "websocket" | "sse";

interface UseStreamOptions {
  cid: string | null;
  token: string;
  transport?: StreamTransport;
  wsUrl?: string;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessageComplete?: (message: Message) => void;
  onFileOperation?: (data: FileOperationEventData) => void;
  onDone?: () => void;
}

// ============ State 类型 ============

interface StreamState {
  messages: Message[];
  toolCalls: Map<string, ToolCall>;
  todos: TodoItem[];
  files: Record<string, FileItem>;
  interrupt: InterruptData | null;
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  isServerReady: boolean;  // 新增：跟踪服务端是否已确认连接
}

const initialState: StreamState = {
  messages: [],
  toolCalls: new Map(),
  todos: [],
  files: {},
  interrupt: null,
  connectionState: 'disconnected',
  isLoading: false,
  error: null,
  isServerReady: false,
};

// ============ Actions ============

type StreamAction =
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_SERVER_READY'; isReady: boolean }  // 新增
  | { type: 'SET_ERROR'; error: Error | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'RESET' }
  | { type: 'RESET_CONVERSATION' }  // 只重置会话，保留连接
  | { type: 'SET_INITIAL_STATE'; messages: Message[]; todos: TodoItem[]; files: Record<string, string> }
  | { type: 'ADD_USER_MESSAGE'; messageId: string; content: string; cid: string }  // 添加 cid
  | { type: 'MESSAGE_START'; messageId: string; cid: string; role: string; parentMessageId?: string; subagentName?: string }
  | { type: 'MESSAGE_DELTA'; messageId: string; delta: string }
  | { type: 'MESSAGE_END'; messageId: string; content?: string; message?: Message }
  | { type: 'TOOL_CALL_START'; toolCall: ToolCall; messageId?: string }
  | { type: 'TOOL_CALL_END'; toolCallId: string; result: unknown; status: ToolCall['status']; endedAt?: string; durationMs?: number; error?: string }
  | { type: 'TODOS_UPDATE'; todos: TodoItem[] }
  | { type: 'FILE_OPERATION'; operation: string; path: string; content?: string; language?: string; editable?: boolean; oldContent?: string }
  | { type: 'SET_INTERRUPT'; interrupt: InterruptData | null };

// ============ Reducer ============

function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      // 如果断开连接，同时重置 isServerReady
      if (action.state === 'disconnected') {
        return { ...state, connectionState: action.state, isServerReady: false };
      }
      return { ...state, connectionState: action.state };

    case 'SET_SERVER_READY':
      return { ...state, isServerReady: action.isReady };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'RESET':
      // 完全重置，包括连接状态
      return { ...initialState, isServerReady: false };

    case 'RESET_CONVERSATION':
      // 只重置会话相关状态，保留连接状态
      return {
        ...state,
        messages: [],
        toolCalls: new Map(),
        todos: [],
        files: {},
        interrupt: null,
        isLoading: false,
        error: null,
        // 保留 connectionState 和 isServerReady
      };

    case 'SET_INITIAL_STATE': {
      // 规范化消息格式，包括 tool_calls -> toolCalls 的转换
      const normalizedMessages = action.messages.map(msg => {
        // 处理 tool_calls 到 toolCalls 的转换
        // 后端可能返回 ToolCallSummary 格式（只有 argsPreview/resultPreview）
        const rawToolCalls = (msg as { tool_calls?: ToolCall[] }).tool_calls || msg.toolCalls;
        const toolCalls = rawToolCalls?.map(tc => {
          // 处理后端返回的 ToolCallSummary 格式
          const tcAny = tc as ToolCall & { 
            argsPreview?: string; 
            resultPreview?: string;
          };
          
          // 处理 args：如果没有完整的 args，使用 argsPreview
          let args = tc.args;
          if (!args || Object.keys(args).length === 0) {
            if (tcAny.argsPreview) {
              // 将 argsPreview 包装成对象，方便后续处理
              args = { _preview: tcAny.argsPreview };
            } else {
              args = {};
            }
          }
          
          // 处理 result：如果没有完整的 result，使用 resultPreview
          let result = tc.result;
          if (result === undefined || result === null) {
            if (tcAny.resultPreview) {
              // 将 resultPreview 包装成对象，方便后续处理
              result = { _preview: tcAny.resultPreview };
            }
          }
          
          return {
            ...tc,
            // 确保 status 有默认值
            status: tc.status || 'completed',
            args,
            result,
          };
        }) || [];
        
        return {
          ...msg,
          role: msg.role || (msg as { type?: string }).type || 'assistant',
          content: msg.content ?? '',
          toolCalls,  // 使用驼峰格式
        };
      });

      // 从最新消息提取 todos
      let currentTodos = action.todos;
      if (currentTodos.length === 0) {
        for (let i = normalizedMessages.length - 1; i >= 0; i--) {
          const todos = normalizedMessages[i].metadata?.todos;
          if (todos?.items) {
            currentTodos = todos.items;
            break;
          }
        }
      }

      // 转换 files - 首先从 action.files 获取
      const files: Record<string, FileItem> = {};
      for (const [path, content] of Object.entries(action.files)) {
        // 支持多种格式：字符串、FileItem 对象、或包含 content 的对象
        let fileContent = '';
        let language = 'text';
        
        if (typeof content === 'string') {
          fileContent = content;
        } else if (content && typeof content === 'object') {
          const contentObj = content as Record<string, unknown>;
          // 尝试从不同字段获取内容
          if (typeof contentObj.content === 'string') {
            fileContent = contentObj.content;
          } else if (Array.isArray(contentObj.content)) {
            fileContent = contentObj.content.join('\n');
          }
          if (typeof contentObj.language === 'string') {
            language = contentObj.language;
          }
        }
        
        files[path] = {
          path,
          content: fileContent,
          language,
          editable: true,
        };
      }
      
      // 从历史消息的 tool_calls 中提取文件
      // 支持多种格式:
      // 1. result.files: { "/path": { content: "...", language: "..." } }
      // 2. result.result.files: 同上
      // 3. write_file 工具: 从 args.file_path 和 args.content 提取
      for (const msg of normalizedMessages) {
        // 使用类型断言来处理不同的 tool_calls 格式
        const toolCalls = (msg.toolCalls || msg.tool_calls) as Array<{
          id?: string;
          name?: string;
          args?: Record<string, unknown>;
          result?: unknown;
          status?: string;
        }> | undefined;
        
        if (toolCalls && Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            // 处理 write_file 工具调用 - 从 args 中提取文件信息
            if (tc.name === 'write_file' && tc.args && (tc.status === 'success' || tc.status === 'completed')) {
              const filePath = tc.args.file_path as string | undefined;
              const content = tc.args.content as string | undefined;
              if (filePath && content) {
                // 根据文件扩展名推断语言
                const ext = filePath.split('.').pop()?.toLowerCase() || '';
                const languageMap: Record<string, string> = {
                  'md': 'markdown',
                  'js': 'javascript',
                  'ts': 'typescript',
                  'tsx': 'typescript',
                  'jsx': 'javascript',
                  'py': 'python',
                  'json': 'json',
                  'html': 'html',
                  'css': 'css',
                  'yaml': 'yaml',
                  'yml': 'yaml',
                };
                files[filePath] = {
                  path: filePath,
                  content,
                  language: languageMap[ext] || 'text',
                  editable: true,
                };
              }
            }
            
            // 处理其他格式的文件结果
            const result = tc.result as Record<string, unknown> | null | undefined;
            if (result && typeof result === 'object') {
              // 尝试从 result.files 或 result.result.files 获取
              const filesData = (result.files || (result.result as Record<string, unknown>)?.files) as Record<string, unknown> | undefined;
              if (filesData && typeof filesData === 'object') {
                for (const [filePath, fileData] of Object.entries(filesData)) {
                  if (fileData && typeof fileData === 'object') {
                    const file = fileData as Record<string, unknown>;
                    if (file.content && typeof file.content === 'string') {
                      files[filePath] = {
                        path: filePath,
                        content: file.content,
                        language: typeof file.language === 'string' ? file.language : 'text',
                        editable: true,
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }

      return {
        ...state,
        messages: normalizedMessages,
        todos: currentTodos,
        files,
        toolCalls: new Map(),
      };
    }

    case 'ADD_USER_MESSAGE': {
      const userMessage: Message = {
        id: action.messageId,
        cid: action.cid,  // 使用传入的 cid
        role: 'user',
        content: action.content,
        createdAt: new Date(),
      };
      return {
        ...state,
        messages: [...state.messages, userMessage],
      };
    }

    case 'MESSAGE_START': {
      const newMessage: Message = {
        id: action.messageId,
        cid: action.cid,
        role: action.role as Message['role'],
        content: '',
        createdAt: new Date(),
        parentMessageId: action.parentMessageId,
        subagentName: action.subagentName,
      };
      return {
        ...state,
        isLoading: true,
        messages: [...state.messages, newMessage],
      };
    }

    case 'MESSAGE_DELTA': {
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.messageId
            ? { ...msg, content: (msg.content || '') + action.delta }
            : msg
        ),
      };
    }

    case 'MESSAGE_END': {
      const finalMessage = action.message;
      let newTodos = state.todos;

      // 从完整消息中提取 todos
      if (finalMessage?.metadata?.todos?.items) {
        newTodos = finalMessage.metadata.todos.items;
      }

      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === action.messageId) {
            if (finalMessage) {
              // 合并 toolCalls：优先保留之前通过 TOOL_CALL_START/END 收集的完整数据
              // 因为 message_end 中的 toolCalls 可能只是预览数据
              const existingToolCalls = msg.toolCalls || [];
              const finalToolCalls = finalMessage.toolCalls || [];
              
              // 创建一个 Map 来合并 toolCalls，以 id 为 key
              const toolCallsMap = new Map<string, ToolCall>();
              
              // 先添加 finalMessage 中的 toolCalls（可能是预览数据）
              finalToolCalls.forEach(tc => {
                toolCallsMap.set(tc.id, tc);
              });
              
              // 然后用 existing toolCalls 覆盖（这些是完整数据）
              existingToolCalls.forEach(tc => {
                const existing = toolCallsMap.get(tc.id);
                if (existing) {
                  // 合并：保留 existing 的完整数据，但更新状态等字段
                  toolCallsMap.set(tc.id, {
                    ...existing,
                    ...tc,
                    // 如果 existing 有完整的 args/result，保留它们
                    args: tc.args && Object.keys(tc.args).length > 0 ? tc.args : existing.args,
                    result: tc.result !== undefined ? tc.result : existing.result,
                  });
                } else {
                  toolCallsMap.set(tc.id, tc);
                }
              });
              
              const mergedToolCalls = Array.from(toolCallsMap.values());
              
              return {
                ...msg,
                ...finalMessage,
                content: typeof finalMessage.content === 'string' ? finalMessage.content : action.content || msg.content,
                // 使用合并后的 toolCalls
                toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
              };
            }
            return { ...msg, content: action.content || msg.content };
          }
          return msg;
        }),
        todos: newTodos,
      };
    }

    case 'TOOL_CALL_START': {
      const newToolCalls = new Map(state.toolCalls);
      newToolCalls.set(action.toolCall.id, action.toolCall);

      // 如果有 messageId，更新对应消息
      let updatedMessages = state.messages;
      if (action.messageId) {
        updatedMessages = state.messages.map(msg => {
          if (msg.id === action.messageId) {
            const existing = msg.toolCalls || [];
            if (!existing.some(tc => tc.id === action.toolCall.id)) {
              return { ...msg, toolCalls: [...existing, action.toolCall] };
            }
          }
          return msg;
        });
      }

      return { ...state, toolCalls: newToolCalls, messages: updatedMessages };
    }

    case 'TOOL_CALL_END': {
      const newToolCalls = new Map(state.toolCalls);
      const existing = newToolCalls.get(action.toolCallId);
      if (existing) {
        newToolCalls.set(action.toolCallId, {
          ...existing,
          result: action.result,
          status: action.status,
          endedAt: action.endedAt,
          durationMs: action.durationMs,
          error: action.error,
        });
      }

      // 更新消息中的 toolCalls
      const updatedMessages = state.messages.map(msg => {
        if (msg.toolCalls) {
          const idx = msg.toolCalls.findIndex(tc => tc.id === action.toolCallId);
          if (idx !== -1) {
            const updated = [...msg.toolCalls];
            updated[idx] = {
              ...updated[idx],
              result: action.result,
              status: action.status,
              endedAt: action.endedAt,
              durationMs: action.durationMs,
              error: action.error,
            };
            return { ...msg, toolCalls: updated };
          }
        }
        return msg;
      });

      // 从工具调用结果中提取文件内容
      // 支持格式: { files: { "/path": { content: "...", path: "..." } } }
      // 或: { result: { files: { ... } } }
      let newFiles = state.files;
      const result = action.result as Record<string, unknown> | null | undefined;
      if (result && typeof result === 'object') {
        const filesData = (result.files || (result.result as Record<string, unknown>)?.files) as Record<string, unknown> | undefined;
        if (filesData && typeof filesData === 'object') {
          newFiles = { ...state.files };
          for (const [filePath, fileData] of Object.entries(filesData)) {
            if (fileData && typeof fileData === 'object') {
              const file = fileData as Record<string, unknown>;
              if (file.content && typeof file.content === 'string') {
                newFiles[filePath] = {
                  path: filePath,
                  content: file.content,
                  language: typeof file.language === 'string' ? file.language : undefined,
                  editable: true,
                };
              }
            }
          }
        }
      }

      // 从 write_todos 工具调用结果中提取 todos
      let newTodos = state.todos;
      if (existing?.name === 'write_todos' && action.result) {
        // 尝试从结果中提取 todos
        // 格式1: { todos: [...] }
        // 格式2: 字符串 "Updated todo list to [...]"
        // 格式3: 直接是数组
        const resultData = action.result as Record<string, unknown> | TodoItem[] | string;
        
        if (Array.isArray(resultData)) {
          // 直接是数组
          newTodos = resultData as TodoItem[];
        } else if (typeof resultData === 'object' && resultData !== null) {
          // 对象格式
          if (Array.isArray((resultData as Record<string, unknown>).todos)) {
            newTodos = (resultData as Record<string, unknown>).todos as TodoItem[];
          } else if (Array.isArray((resultData as Record<string, unknown>).items)) {
            newTodos = (resultData as Record<string, unknown>).items as TodoItem[];
          }
        } else if (typeof resultData === 'string') {
          // 字符串格式，尝试解析
          // 格式: "Updated todo list to [{'content': '...', 'status': '...'}, ...]"
          const match = resultData.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              // 将 Python 风格的字典转换为 JSON
              const jsonStr = match[0]
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null');
              const parsed = JSON.parse(jsonStr);
              if (Array.isArray(parsed)) {
                newTodos = parsed as TodoItem[];
              }
            } catch {
              // 解析失败，保持原状
            }
          }
        }
      }

      return { ...state, toolCalls: newToolCalls, messages: updatedMessages, files: newFiles, todos: newTodos };
    }

    case 'TODOS_UPDATE':
      return { ...state, todos: action.todos };

    case 'FILE_OPERATION': {
      const newFiles = { ...state.files };
      if (action.operation === 'delete') {
        delete newFiles[action.path];
      } else {
        newFiles[action.path] = {
          path: action.path,
          content: action.content || '',
          language: action.language || 'text',
          editable: action.editable ?? true,
          oldContent: action.oldContent,
        };
      }
      return { ...state, files: newFiles };
    }

    case 'SET_INTERRUPT':
      return { ...state, interrupt: action.interrupt, isLoading: false };

    default:
      return state;
  }
}

// ============ Hook ============

export function useStream(options: UseStreamOptions) {
  const {
    cid,
    token,
    wsUrl,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onMessageComplete,
    onFileOperation,
    onDone,
  } = options;

  const [state, dispatch] = useReducer(streamReducer, initialState);

  // Refs
  const wsRef = useRef<WebSocketStream | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const cidRef = useRef<string | null>(cid);
  const callbacksRef = useRef({ onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone });

  // 更新 refs
  useEffect(() => {
    cidRef.current = cid;
  }, [cid]);

  useEffect(() => {
    callbacksRef.current = { onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone };
  }, [onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone]);

  // 事件处理 (基于 WEBSOCKET_FRONTEND_GUIDE.md)
  const handleEvent = useCallback((event: StreamEvent) => {
    const currentCid = cidRef.current;

    switch (event.type) {
      // 连接确认
      case 'connected': {
        dispatch({ type: 'SET_SERVER_READY', isReady: true });
        break;
      }

      // 完整会话状态（连接后推送）- 兼容 state 和 state_update
      case 'state':
      case 'state_update': {
        dispatch({ type: 'SET_SERVER_READY', isReady: true });
        
        const data = event.data as { messages?: Message[]; todos?: TodoItem[]; files?: Record<string, unknown> };
        
        // Debug: 打印 files 数据格式
        if (data.files) {
          console.log('[useStream] state_update files:', JSON.stringify(data.files, null, 2));
        }
        
        if (data.messages) {
          // 转换 files 为正确格式
          const normalizedFiles: Record<string, string> = {};
          if (data.files) {
            for (const [path, value] of Object.entries(data.files)) {
              if (typeof value === 'string') {
                normalizedFiles[path] = value;
              } else if (value && typeof value === 'object') {
                // 可能是 { content: string } 格式
                const obj = value as Record<string, unknown>;
                if (typeof obj.content === 'string') {
                  normalizedFiles[path] = obj.content;
                } else {
                  console.warn('[useStream] Unknown file format for path:', path, value);
                }
              }
            }
          }
          
          dispatch({
            type: 'SET_INITIAL_STATE',
            messages: data.messages,
            todos: data.todos || [],
            files: normalizedFiles,
          });
        }
        break;
      }

      // 新消息开始
      case 'message_start': {
        const data = event.data as MessageStartEventData;
        currentMessageIdRef.current = data.messageId;
        dispatch({
          type: 'MESSAGE_START',
          messageId: data.messageId,
          cid: currentCid || '',
          role: data.role || 'assistant',
          parentMessageId: data.parentMessageId,
          subagentName: data.subagentName,
        });
        break;
      }

      // 流式内容增量 - 兼容 content_delta 和 message_delta
      case 'content_delta':
      case 'message_delta': {
        const data = event.data as { messageId: string; delta: string };
        dispatch({ type: 'MESSAGE_DELTA', messageId: data.messageId, delta: data.delta || '' });
        break;
      }

      // 消息结束 - 包含完整内容、toolCalls 和 metadata（含 usage）
      case 'message_end': {
        const data = event.data as MessageEndEventData & {
          toolCalls?: Array<{
            id: string;
            name: string;
            type?: string;
            status: string;
            argsPreview?: string;
            resultPreview?: string;
            durationMs?: number;
            subagentName?: string;
          }>;
          metadata?: {
            contentType?: string;
            usage?: {
              totalTokens: number;
              promptTokens: number;
              completionTokens: number;
              totalCost: number;
              callCount: number;
              byModel?: Record<string, unknown>;
              bySource?: Record<string, unknown>;
            };
            todos?: { items: TodoItem[]; summary?: { total: number; pending: number; inProgress: number; completed: number; failed: number } };
          };
        };
        
        // 如果后端返回了完整消息，直接使用
        let finalMessage: Message;
        if (data.message) {
          finalMessage = data.message;
        } else {
          // 否则构建消息对象
          finalMessage = {
            id: data.messageId,
            cid: currentCid || '',
            role: 'assistant',
            content: data.content || '',
            toolCalls: data.toolCalls?.map(tc => ({
              id: tc.id,
              name: tc.name,
              type: tc.type as ToolCall['type'],
              args: {},
              status: tc.status as ToolCall['status'],
              durationMs: tc.durationMs,
              subagentName: tc.subagentName,
            })),
            metadata: data.metadata as Message['metadata'],
          };
        }
        
        dispatch({
          type: 'MESSAGE_END',
          messageId: data.messageId,
          content: data.content,
          message: finalMessage,
        });
        currentMessageIdRef.current = null;
        
        callbacksRef.current.onMessageComplete?.(finalMessage);
        break;
      }

      // 工具调用开始
      case 'tool_call_start': {
        const data = event.data as ToolCallStartEventData & {
          toolType?: 'tool' | 'subagent';
          subagentName?: string;
          targetSubagent?: string;
        };
        const toolCall: ToolCall = {
          id: data.toolCallId,
          name: data.toolName,
          type: data.toolType || data.type || 'tool',
          args: data.args || {},
          status: 'running',
          startedAt: data.startedAt,
          subagentName: data.subagentName,
          targetSubagent: data.targetSubagent,
        };
        dispatch({
          type: 'TOOL_CALL_START',
          toolCall,
          messageId: data.messageId || currentMessageIdRef.current || undefined,
        });
        break;
      }

      // 工具调用结果 - 兼容 tool_call_end 和 tool_call_result
      case 'tool_call_end':
      case 'tool_call_result': {
        const data = event.data as ToolCallResultEventData & { toolName?: string };
        const status: ToolCall['status'] = data.error ? 'error' : (data.status as ToolCall['status']) || 'completed';
        dispatch({
          type: 'TOOL_CALL_END',
          toolCallId: data.toolCallId,
          result: data.result,
          status,
          endedAt: data.endedAt,
          durationMs: data.durationMs,
          error: data.error,
        });
        break;
      }

      // 子代理开始
      case 'subagent_start': {
        const data = event.data as {
          messageId: string;
          subagentName: string;
          taskDescription: string;
        };
        // 创建一个子代理类型的工具调用
        const toolCall: ToolCall = {
          id: `subagent-${data.subagentName}-${Date.now()}`,
          name: 'task',
          type: 'subagent',
          args: { task: data.taskDescription },
          status: 'running',
          targetSubagent: data.subagentName,
        };
        dispatch({
          type: 'TOOL_CALL_START',
          toolCall,
          messageId: data.messageId || currentMessageIdRef.current || undefined,
        });
        break;
      }

      // 子代理结束
      case 'subagent_end': {
        const data = event.data as {
          messageId: string;
          subagentName: string;
          status: 'success' | 'error';
        };
        // 查找对应的子代理工具调用并更新状态
        // 注意：这里简化处理，实际可能需要更精确的匹配
        break;
      }

      // Todos 更新 - 兼容 todos_update 和 todos_updated
      case 'todos_update':
      case 'todos_updated': {
        const data = event.data as { 
          messageId?: string;
          todos?: TodoItem[] | { items?: TodoItem[] };
          summary?: unknown;
        };
        // 支持两种格式：直接数组或 { items: [...] }
        const todos = Array.isArray(data.todos) 
          ? data.todos 
          : (data.todos as { items?: TodoItem[] })?.items;
        if (todos) {
          dispatch({ type: 'TODOS_UPDATE', todos });
        }
        break;
      }

      // 文件操作
      case 'file_operation': {
        const data = event.data as FileOperationEventData;
        dispatch({
          type: 'FILE_OPERATION',
          operation: data.operation,
          path: data.path,
          content: data.content,
          language: data.language,
          editable: data.editable,
          oldContent: data.oldContent,
        });
        callbacksRef.current.onFileOperation?.(data);
        break;
      }

      // 中断（人机交互）
      case 'interrupt': {
        const data = event.data as InterruptData;
        dispatch({ type: 'SET_INTERRUPT', interrupt: data });
        break;
      }

      // 错误
      case 'error': {
        const data = event.data as { message?: string; code?: string };
        const error = new Error(data.message || 'Unknown error');
        dispatch({ type: 'SET_ERROR', error });
        callbacksRef.current.onError?.(error);
        break;
      }

      // 请求完成
      case 'done': {
        const data = event.data as { reason?: 'cancelled' | 'error' } | null;
        dispatch({ type: 'SET_LOADING', isLoading: false });
        if (data?.reason === 'error') {
          console.warn('[useStream] Request completed with errors');
        }
        callbacksRef.current.onDone?.();
        break;
      }
    }
  }, []);

  // 保存 handleEvent 到 ref，避免 effect 依赖变化
  const handleEventRef = useRef(handleEvent);
  useEffect(() => {
    handleEventRef.current = handleEvent;
  }, [handleEvent]);

  // WebSocket 连接管理 - 只在 enabled/token 变化时重建
  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const url = wsUrl || getWsUrl();
    
    // 创建 WebSocket 实例，使用 ref 来调用 handleEvent
    const ws = new WebSocketStream({
      url,
      token,
      cid: cidRef.current || undefined, // 使用 ref 获取当前 cid
      onEvent: (event) => handleEventRef.current(event),
      onConnect: () => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
        callbacksRef.current.onConnect?.();
      },
      onDisconnect: () => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'disconnected' });
        dispatch({ type: 'SET_SERVER_READY', isReady: false });
        callbacksRef.current.onDisconnect?.();
      },
      onError: (error) => {
        dispatch({ type: 'SET_ERROR', error });
        callbacksRef.current.onError?.(error);
      },
      onConnectionStateChange: (connectionState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: connectionState });
        // 如果断开连接，重置服务端就绪状态
        if (connectionState === 'disconnected') {
          dispatch({ type: 'SET_SERVER_READY', isReady: false });
        }
      },
    });

    wsRef.current = ws;

    // 如果有 cid，立即连接
    const currentCid = cidRef.current;
    if (currentCid) {
      ws.connect(currentCid);
    }

    return () => {
      // 使用 destroy 而不是 close，确保清理所有资源
      ws.destroy();
      wsRef.current = null;
    };
  }, [enabled, token, wsUrl]);

  // 同步 cid 到 ref（不触发 WebSocket 操作，由 connectToCid 手动控制）
  useEffect(() => {
    cidRef.current = cid || null;
  }, [cid]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized');
    }

    const currentCid = cidRef.current;

    // 检查连接状态
    if (wsRef.current.state === 'disconnected') {
      if (currentCid) {
        console.log('[useStream] WebSocket disconnected, reconnecting...');
        wsRef.current.connect(currentCid);
        
        // 等待连接就绪
        const maxWait = 5000;
        const checkInterval = 50;
        let waited = 0;
        while (!wsRef.current.isReady && waited < maxWait) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waited += checkInterval;
        }
        
        if (!wsRef.current.isReady) {
          throw new Error('WebSocket connection timeout');
        }
      } else {
        throw new Error('No conversation ID available');
      }
    }

    // 立即添加用户消息到本地状态（乐观更新）
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'ADD_USER_MESSAGE', messageId: userMessageId, content, cid: currentCid || '' });
    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // sendUserMessage 会自动处理 isReady 状态
      // 如果 WebSocket 已连接但服务端未确认，消息会被加入队列
      await wsRef.current.sendUserMessage(content);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error : new Error('Failed to send message') });
      dispatch({ type: 'SET_LOADING', isLoading: false });
      throw error;
    }
  }, []);

  // 恢复中断
  const resumeInterrupt = useCallback(async (decision: InterruptDecision) => {
    if (!wsRef.current || !state.interrupt) {
      return;
    }

    dispatch({ type: 'SET_LOADING', isLoading: true });

    try {
      await wsRef.current.resumeInterrupt(state.interrupt.id || '', decision);
      dispatch({ type: 'SET_INTERRUPT', interrupt: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error : new Error('Failed to resume') });
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.interrupt]);

  // 停止生成
  const stop = useCallback(async () => {
    if (!wsRef.current) return;

    try {
      await wsRef.current.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }, []);

  // 重置状态（不关闭 WebSocket 连接）
  // 完全重置（包括连接状态）
  const reset = useCallback(() => {
    console.log('[useStream] Resetting all state');
    dispatch({ type: 'RESET' });
    currentMessageIdRef.current = null;
  }, []);

  // 只重置会话状态（保留连接）
  const resetConversation = useCallback(() => {
    console.log('[useStream] Resetting conversation state (keeping connection)');
    dispatch({ type: 'RESET_CONVERSATION' });
    currentMessageIdRef.current = null;
  }, []);

  // 设置初始状态
  const setInitialState = useCallback((data: {
    messages: Message[];
    todos: TodoItem[];
    files: Record<string, string>;
  }) => {
    dispatch({
      type: 'SET_INITIAL_STATE',
      messages: data.messages,
      todos: data.todos,
      files: data.files,
    });
  }, []);

  // 重新连接
  const reconnect = useCallback(() => {
    wsRef.current?.reconnect();
  }, []);

  // 连接到新的 cid（同步操作，不阻塞）
  // 注意：后端要求 cid 必须在连接 URL 中，不支持 bind_cid 消息
  // 因此切换 cid 时需要断开并重新连接
  const connectToCid = useCallback((newCid: string): void => {
    console.log('[useStream] Connecting to cid:', newCid);
    // 更新 ref
    cidRef.current = newCid;
    
    if (wsRef.current) {
      const currentWsCid = wsRef.current.cid;
      
      if (wsRef.current.state === 'disconnected') {
        // 未连接，直接连接到新 cid
        console.log('[useStream] WebSocket disconnected, connecting to:', newCid);
        wsRef.current.connect(newCid);
      } else if (wsRef.current.state === 'connected') {
        // 已连接，检查是否需要切换 cid
        if (currentWsCid === newCid) {
          // 已经连接到正确的 cid，标记为就绪
          console.log('[useStream] Already connected to cid:', newCid);
          dispatch({ type: 'SET_SERVER_READY', isReady: true });
        } else {
          // 需要切换 cid，断开并重新连接到新 cid
          console.log('[useStream] Switching from cid:', currentWsCid, 'to:', newCid);
          wsRef.current.reconnect(newCid);
        }
      } else {
        // 正在连接中（connecting 或 reconnecting），断开并重新连接到新 cid
        console.log('[useStream] WebSocket state:', wsRef.current.state, ', reconnecting to:', newCid);
        wsRef.current.reconnect(newCid);
      }
    } else {
      console.warn('[useStream] WebSocket not initialized');
    }
  }, []);

  // 获取 WebSocket 是否就绪（直接检查 WebSocket 实例状态）
  // 这个方法可以在异步代码中调用，获取最新状态
  const checkIsReady = useCallback((): boolean => {
    return wsRef.current?.isReady ?? false;
  }, []);

  // 返回值
  return useMemo(() => ({
    // 状态
    messages: state.messages,
    toolCalls: Array.from(state.toolCalls.values()),
    todos: state.todos,
    files: state.files,
    interrupt: state.interrupt,
    isConnected: state.connectionState === 'connected',
    connectionState: state.connectionState,
    isLoading: state.isLoading,
    error: state.error,
    // WebSocket 是否完全就绪（已连接且服务端已确认）
    isReady: state.connectionState === 'connected' && state.isServerReady,

    // 方法
    sendMessage,
    resumeInterrupt,
    stop,
    reset,
    resetConversation,
    setInitialState,
    reconnect,
    connectToCid,
    checkIsReady,
  }), [
    state,
    sendMessage,
    resumeInterrupt,
    stop,
    reset,
    resetConversation,
    setInitialState,
    reconnect,
    connectToCid,
    checkIsReady,
  ]);
}

export type UseStreamReturn = ReturnType<typeof useStream>;

