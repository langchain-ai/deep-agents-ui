import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 预处理混合内容：解析包含多个 JSON 对象和 Markdown 的混合字符串
 * 
 * 后端有时会返回这样的内容：
 * {JSON1}{JSON2}```markdown...```后续文本
 * 
 * 这个函数会：
 * 1. 识别并移除前导的 JSON 对象（仅当后面有 Markdown 内容时）
 * 2. 提取 Markdown 代码块中的内容
 * 3. 清理并返回适合显示的内容
 * 
 * 注意：如果内容只是一个纯 JSON 对象，会保留原样（由其他函数处理格式化）
 */
export function preprocessMixedContent(content: string): string {
  if (!content || typeof content !== "string") return "";
  
  let processed = content.trim();
  
  // 0. 首先处理转义字符
  // 始终处理转义的换行符，因为内容可能混合了真正的换行符和转义的换行符
  if (processed.includes("\\n")) {
    processed = processed
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "")
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  
  // 0.1 首先检查：如果整个内容就是一个或多个纯 JSON 对象（后面没有其他内容），直接返回原内容
  // 这样可以保留工具调用结果等纯 JSON 数据
  if (isOnlyJsonObjects(processed)) {
    return processed;
  }
  
  // 1. 检测是否有混合内容：JSON 对象后面跟着 Markdown 内容
  // 只有在这种情况下才移除前导的 JSON 对象
  const hasMarkdownAfterJson = /^\{[\s\S]*?\}[\s\S]*?(```|##|#\s|\|.*\||-\s|\d+\.\s)/.test(processed);
  
  if (hasMarkdownAfterJson) {
    // 持续移除前导的 JSON 对象
    let jsonObjectsRemoved = 0;
    const maxJsonObjects = 10; // 防止无限循环
    
    while (jsonObjectsRemoved < maxJsonObjects) {
      // 尝试找到第一个完整的 JSON 对象
      const jsonEndIndex = findJsonObjectEnd(processed);
      if (jsonEndIndex === -1) break;
      
      const jsonStr = processed.slice(0, jsonEndIndex);
      const remaining = processed.slice(jsonEndIndex).trim();
      
      // 只有当移除 JSON 后还有内容时才移除
      if (remaining.length > 0) {
        try {
          JSON.parse(jsonStr);
          // 是有效的 JSON，且后面还有内容，移除它
          processed = remaining;
          jsonObjectsRemoved++;
        } catch {
          // 不是有效的 JSON，停止移除
          break;
        }
      } else {
        // 移除后没有内容了，停止（保留这个 JSON）
        break;
      }
    }
  }
  
  return processed.trim();
}

/**
 * 检查内容是否只包含 JSON 对象（一个或多个连续的 JSON 对象，后面没有其他内容）
 */
function isOnlyJsonObjects(content: string): boolean {
  let remaining = content.trim();
  
  // 如果不是以 { 开头，肯定不是纯 JSON
  if (!remaining.startsWith("{")) return false;
  
  // 尝试解析连续的 JSON 对象
  while (remaining.length > 0 && remaining.startsWith("{")) {
    const jsonEndIndex = findJsonObjectEnd(remaining);
    if (jsonEndIndex === -1) return false;
    
    const jsonStr = remaining.slice(0, jsonEndIndex);
    try {
      JSON.parse(jsonStr);
      remaining = remaining.slice(jsonEndIndex).trim();
    } catch {
      return false;
    }
  }
  
  // 如果解析完所有 JSON 后没有剩余内容，说明是纯 JSON
  return remaining.length === 0;
}

/**
 * 找到 JSON 对象的结束位置（返回结束位置的下一个索引）
 */
function findJsonObjectEnd(content: string): number {
  if (!content.startsWith("{")) return -1;
  
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === "\\") {
      escape = true;
      continue;
    }
    
    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  
  return -1;
}

/**
 * 检查字符串是否是 JSON 对象
 */
function isJsonObject(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

// 通用消息类型（兼容 LangGraph 和自定义格式）
type MessageLike = {
  id?: string;
  type?: string;
  role?: string;
  content: string | unknown[] | null;  // 允许 null
  tool_calls?: Array<{
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }>;
  additional_kwargs?: Record<string, unknown>;
  tool_call_id?: string;
  name?: string;
};

export function extractStringFromMessageContent(message: MessageLike): string {
  // 处理 null 或 undefined 的情况
  if (message.content == null) {
    return "";
  }
  
  let rawContent: string;
  
  if (typeof message.content === "string") {
    rawContent = message.content;
  } else if (Array.isArray(message.content)) {
    rawContent = message.content
      .filter(
        (c: unknown) =>
          (typeof c === "object" &&
            c !== null &&
            "type" in c &&
            (c as { type: string }).type === "text") ||
          typeof c === "string"
      )
      .map((c: unknown) =>
        typeof c === "string"
          ? c
          : typeof c === "object" && c !== null && "text" in c
          ? (c as { text?: string }).text || ""
          : ""
      )
      .join("");
  } else {
    rawContent = "";
  }
  
  // 应用混合内容预处理，清理前导 JSON 对象和提取 Markdown 内容
  return preprocessMixedContent(rawContent);
}

/**
 * 处理字符串中的转义字符，将 \n \t 等转换为真正的字符
 * 同时清理多余的空白和格式问题
 */
function normalizeContent(content: string): string {
  if (!content) return "";
  
  let result = content;
  
  // 1. 始终处理转义的换行符
  if (result.includes("\\n")) {
    result = result
      .replace(/\\n/g, "\n")      // 换行
      .replace(/\\t/g, "\t")      // 制表符
      .replace(/\\r/g, "")        // 回车（移除）
      .replace(/\\\\/g, "\\")     // 反斜杠
      .replace(/\\"/g, '"')       // 双引号
      .replace(/\\'/g, "'");      // 单引号
  }
  
  // 2. 清理多余的空行（超过2个连续空行变为2个）
  result = result.replace(/\n{3,}/g, "\n\n");
  
  // 3. 清理行首行尾空白
  result = result.trim();
  
  return result;
}

/**
 * 智能提取子代理/工具调用的内容
 * 优先提取有意义的文本内容，避免显示原始 JSON
 */
export function extractSubAgentContent(data: unknown): string {
  if (!data) return "";
  
  if (typeof data === "string") {
    // 对字符串内容进行规范化处理
    return normalizeContent(data);
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }

  if (Array.isArray(data)) {
    // 如果是数组，尝试提取每个元素的内容
    const contents = data.map(item => extractSubAgentContent(item)).filter(Boolean);
    return contents.join("\n\n");
  }

  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;

    // -1. 处理 _preview 字段（来自后端的 argsPreview/resultPreview）
    if (dataObj._preview && typeof dataObj._preview === "string") {
      return normalizeContent(dataObj._preview);
    }

    // 0. 处理包含 files 的工具结果（如 write_file）
    // 格式: { files: { "/path/file.md": { path: "...", content: "..." } }, messages: [...] }
    // 注意：文件内容会在右侧 Artefacts 面板显示，这里只显示操作消息
    if (dataObj.files && typeof dataObj.files === "object") {
      const filesObj = dataObj.files as Record<string, unknown>;
      const filePaths = Object.keys(filesObj);
      
      // 如果有 messages，优先显示 messages
      if (dataObj.messages && Array.isArray(dataObj.messages)) {
        const msgContents = (dataObj.messages as Array<Record<string, unknown>>)
          .map(msg => msg?.content)
          .filter(c => typeof c === "string" && c.trim())
          .map(c => normalizeContent(c as string));
        if (msgContents.length > 0) {
          return msgContents.join("\n");
        }
      }
      
      // 否则显示文件路径列表
      if (filePaths.length > 0) {
        return filePaths.map(p => `📄 ${p}`).join("\n");
      }
    }
    
    // 0.1 处理 result.files 结构
    if (dataObj.result && typeof dataObj.result === "object") {
      const resultObj = dataObj.result as Record<string, unknown>;
      if (resultObj.files && typeof resultObj.files === "object") {
        const filesObj = resultObj.files as Record<string, unknown>;
        const filePaths = Object.keys(filesObj);
        
        // 如果有 messages，优先显示 messages
        if (resultObj.messages && Array.isArray(resultObj.messages)) {
          const msgContents = (resultObj.messages as Array<Record<string, unknown>>)
            .map(msg => msg?.content)
            .filter(c => typeof c === "string" && c.trim())
            .map(c => normalizeContent(c as string));
          if (msgContents.length > 0) {
            return msgContents.join("\n");
          }
        }
        
        // 否则显示文件路径列表
        if (filePaths.length > 0) {
          return filePaths.map(p => `📄 ${p}`).join("\n");
        }
      }
    }

    // 1. 处理子代理返回的 messages 结构（没有 files 的情况）
    // 格式: { result: { messages: [{ type: "ToolMessage", content: "..." }] } }
    // 或: { messages: [{ type: "ToolMessage", content: "..." }] }
    if (dataObj.messages && Array.isArray(dataObj.messages)) {
      const messageContents = (dataObj.messages as Array<Record<string, unknown>>)
        .map(msg => {
          if (msg && typeof msg === "object" && msg.content) {
            // 提取 content 字段
            if (typeof msg.content === "string") {
              return normalizeContent(msg.content);
            }
          }
          return null;
        })
        .filter(Boolean);
      
      if (messageContents.length > 0) {
        return messageContents.join("\n\n");
      }
    }
    
    // 1.1 处理 result.messages 结构
    if (dataObj.result && typeof dataObj.result === "object") {
      const resultObj = dataObj.result as Record<string, unknown>;
      if (resultObj.messages && Array.isArray(resultObj.messages)) {
        const messageContents = (resultObj.messages as Array<Record<string, unknown>>)
          .map(msg => {
            if (msg && typeof msg === "object" && msg.content) {
              if (typeof msg.content === "string") {
                return normalizeContent(msg.content);
              }
            }
            return null;
          })
          .filter(Boolean);
        
        if (messageContents.length > 0) {
          return messageContents.join("\n\n");
        }
      }
    }

    // 1. 优先提取主要内容字段
    const primaryFields = ['content', 'text', 'message', 'response', 'answer', 'output', 'result'];
    for (const field of primaryFields) {
      const value = dataObj[field];
      if (value && typeof value === "string" && value.trim()) {
        // 对提取的字符串进行规范化处理
        return normalizeContent(value);
      }
      // 如果字段是对象，递归提取（但跳过已经处理过的 messages 结构）
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const extracted = extractSubAgentContent(value);
        if (extracted && !extracted.startsWith("```json")) {
          return extracted;
        }
      }
    }

    // 2. 处理子代理输入参数（task 调用）
    if (dataObj.subagent_type || dataObj.task) {
      const parts: string[] = [];
      
      // 子代理类型
      if (dataObj.subagent_type && typeof dataObj.subagent_type === "string") {
        parts.push(`**Agent:** ${dataObj.subagent_type}`);
      }
      
      // 任务描述
      if (dataObj.task && typeof dataObj.task === "string") {
        parts.push(`**Task:** ${normalizeContent(dataObj.task)}`);
      }
      
      // 描述
      if (dataObj.description && typeof dataObj.description === "string") {
        parts.push(normalizeContent(dataObj.description));
      }
      
      // 提示词
      if (dataObj.prompt && typeof dataObj.prompt === "string") {
        parts.push(normalizeContent(dataObj.prompt));
      }
      
      // 上下文
      if (dataObj.context && typeof dataObj.context === "string") {
        parts.push(`**Context:** ${normalizeContent(dataObj.context)}`);
      }
      
      if (parts.length > 0) {
        return parts.join("\n\n");
      }
    }

    // 3. 处理 todos 数据
    if (dataObj.todos && Array.isArray(dataObj.todos)) {
      const todoList = dataObj.todos.map((todo: unknown, index: number) => {
        if (typeof todo === "object" && todo !== null) {
          const t = todo as Record<string, unknown>;
          const status = t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⏳";
          const content = typeof t.content === "string" ? normalizeContent(t.content) : "";
          return `${index + 1}. ${status} ${content}`;
        }
        return `${index + 1}. ${String(todo)}`;
      });
      return todoList.join("\n");
    }

    // 4. 处理描述性字段
    const descFields = ['description', 'summary', 'prompt', 'query', 'question', 'title', 'name'];
    for (const field of descFields) {
      if (dataObj[field] && typeof dataObj[field] === "string" && (dataObj[field] as string).trim()) {
        return normalizeContent(dataObj[field] as string);
      }
    }

    // 5. 如果对象只有少量简单字段，格式化显示
    const keys = Object.keys(dataObj).filter(k => {
      const v = dataObj[k];
      return v !== null && v !== undefined && v !== "";
    });
    
    if (keys.length <= 5 && keys.every(k => typeof dataObj[k] !== "object" || dataObj[k] === null)) {
      // 简单对象，格式化为列表
      const items = keys.map(k => {
        const val = typeof dataObj[k] === "string" ? normalizeContent(dataObj[k] as string) : String(dataObj[k]);
        return `- **${k}:** ${val}`;
      });
      return items.join("\n");
    }

    // 6. 复杂对象，尝试提取所有文本字段
    const textParts: string[] = [];
    for (const [key, value] of Object.entries(dataObj)) {
      if (typeof value === "string" && value.trim() && value.length > 10) {
        // 跳过看起来像 ID 或技术字段的内容
        if (!/^[a-f0-9-]{20,}$/i.test(value) && !key.toLowerCase().includes("id")) {
          textParts.push(normalizeContent(value));
        }
      }
    }
    
    if (textParts.length > 0) {
      return textParts.join("\n\n");
    }

    // 7. 最后的 fallback：格式化 JSON，但尝试更简洁
    try {
      const simplified = simplifyObjectForDisplay(dataObj);
      if (Object.keys(simplified).length === 0) {
        return "(No content)";
      }
      return "```json\n" + JSON.stringify(simplified, null, 2) + "\n```";
    } catch {
      return "(Unable to display content)";
    }
  }

  return String(data);
}

/**
 * 简化对象用于显示，移除不必要的字段
 */
function simplifyObjectForDisplay(obj: Record<string, unknown>): Record<string, unknown> {
  const skipFields = ['id', 'uuid', 'created_at', 'updated_at', 'timestamp', 'metadata'];
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // 跳过技术字段
    if (skipFields.some(f => key.toLowerCase().includes(f))) continue;
    // 跳过空值
    if (value === null || value === undefined || value === "") continue;
    // 跳过很长的字符串（可能是 base64 或类似的）
    if (typeof value === "string" && value.length > 500) {
      result[key] = value.substring(0, 100) + "... (truncated)";
      continue;
    }
    result[key] = value;
  }
  
  return result;
}

export function isPreparingToCallTaskTool(messages: MessageLike[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return false;
  
  const messageType = lastMessage.type || lastMessage.role;
  return (
    (messageType === "ai" || messageType === "assistant") &&
    lastMessage.tool_calls?.some(
      (call: { name?: string }) => call.name === "task"
    ) || false
  );
}

export function formatMessageForLLM(message: MessageLike): string {
  const messageType = message.type || message.role;
  let role: string;
  
  if (messageType === "human" || messageType === "user") {
    role = "Human";
  } else if (messageType === "ai" || messageType === "assistant") {
    role = "Assistant";
  } else if (messageType === "tool") {
    role = `Tool Result`;
  } else {
    role = messageType || "Unknown";
  }

  const timestamp = message.id ? ` (${message.id.slice(0, 8)})` : "";

  let contentText = "";

  // Extract content text
  if (typeof message.content === "string") {
    contentText = message.content;
  } else if (Array.isArray(message.content)) {
    const textParts: string[] = [];

    message.content.forEach((part: unknown) => {
      if (typeof part === "string") {
        textParts.push(part);
      } else if (part && typeof part === "object" && "type" in part && (part as { type: string }).type === "text") {
        textParts.push((part as { text?: string }).text || "");
      }
      // Ignore other types like tool_use in content - we handle tool calls separately
    });

    contentText = textParts.join("\n\n").trim();
  }

  // For tool messages, include additional tool metadata
  if (messageType === "tool") {
    const toolName = message.name || "unknown_tool";
    const toolCallId = message.tool_call_id || "";
    role = `Tool Result [${toolName}]`;
    if (toolCallId) {
      role += ` (call_id: ${toolCallId.slice(0, 8)})`;
    }
  }

  // Handle tool calls from .tool_calls property (for AI messages)
  const toolCallsText: string[] = [];
  if (
    (messageType === "ai" || messageType === "assistant") &&
    message.tool_calls &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  ) {
    message.tool_calls.forEach((call) => {
      const toolName = call.name || "unknown_tool";
      const toolArgs = call.args ? JSON.stringify(call.args, null, 2) : "{}";
      toolCallsText.push(`[Tool Call: ${toolName}]\nArguments: ${toolArgs}`);
    });
  }

  // Combine content and tool calls
  const parts: string[] = [];
  if (contentText) {
    parts.push(contentText);
  }
  if (toolCallsText.length > 0) {
    parts.push(...toolCallsText);
  }

  if (parts.length === 0) {
    return `${role}${timestamp}: [Empty message]`;
  }

  if (parts.length === 1) {
    return `${role}${timestamp}: ${parts[0]}`;
  }

  return `${role}${timestamp}:\n${parts.join("\n\n")}`;
}

export function formatConversationForLLM(messages: MessageLike[]): string {
  const formattedMessages = messages.map(formatMessageForLLM);
  return formattedMessages.join("\n\n---\n\n");
}
