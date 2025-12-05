import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 通用消息类型（兼容 LangGraph 和自定义格式）
type MessageLike = {
  id?: string;
  type?: string;
  role?: string;
  content: string | unknown[];
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
  return typeof message.content === "string"
    ? message.content
    : Array.isArray(message.content)
    ? message.content
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
        .join("")
    : "";
}

export function extractSubAgentContent(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;

    // Try to extract description first
    if (dataObj.description && typeof dataObj.description === "string") {
      return dataObj.description;
    }

    // Then try prompt
    if (dataObj.prompt && typeof dataObj.prompt === "string") {
      return dataObj.prompt;
    }

    // For output objects, try result
    if (dataObj.result && typeof dataObj.result === "string") {
      return dataObj.result;
    }

    // Fallback to JSON stringification
    return JSON.stringify(data, null, 2);
  }

  // Fallback for any other type
  return JSON.stringify(data, null, 2);
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
