import { Message } from "@langchain/langgraph-sdk";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type guard: Check if content item is a text object
 */
function isTextContentObject(
  item: unknown
): item is { type: string; text: string } {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    "text" in item &&
    (item as Record<string, unknown>).type === "text" &&
    typeof (item as Record<string, unknown>).text === "string"
  );
}

/**
 * Type guard: Check if content item is a plain string
 */
function isStringContent(item: unknown): item is string {
  return typeof item === "string";
}

export function extractStringFromMessageContent(message: Message): string {
  // Handle simple string content
  if (typeof message.content === "string") {
    return message.content;
  }

  // Handle array content
  if (Array.isArray(message.content)) {
    const textParts: string[] = [];

    for (const item of message.content) {
      // Handle plain strings
      if (isStringContent(item)) {
        textParts.push(item);
        continue;
      }

      // Handle text objects
      if (isTextContentObject(item)) {
        textParts.push(item.text);
        continue;
      }

      // Log unhandled types for debugging (optional, can be removed in production)
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[extractStringFromMessageContent] Skipping unknown content type:",
          item
        );
      }
    }

    return textParts.join("");
  }

  // Fallback for unexpected content types
  if (process.env.NODE_ENV === "development" && message.content) {
    console.warn(
      "[extractStringFromMessageContent] Unexpected content type:",
      typeof message.content
    );
  }
  return "";
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

export function isPreparingToCallTaskTool(messages: Message[]): boolean {
  const lastMessage = messages[messages.length - 1];
  return (
    (lastMessage.type === "ai" &&
      lastMessage.tool_calls?.some(
        (call: { name?: string }) => call.name === "task"
      )) ||
    false
  );
}

export function formatMessageForLLM(message: Message): string {
  let role: string;
  if (message.type === "human") {
    role = "Human";
  } else if (message.type === "ai") {
    role = "Assistant";
  } else if (message.type === "tool") {
    role = `Tool Result`;
  } else {
    role = message.type || "Unknown";
  }

  const timestamp = message.id ? ` (${message.id.slice(0, 8)})` : "";

  let contentText = "";

  // Extract content text
  if (typeof message.content === "string") {
    contentText = message.content;
  } else if (Array.isArray(message.content)) {
    const textParts: string[] = [];

    for (const part of message.content) {
      // Handle plain strings
      if (isStringContent(part)) {
        textParts.push(part);
        continue;
      }

      // Handle text objects
      if (isTextContentObject(part)) {
        textParts.push(part.text);
        continue;
      }

      // Ignore other types like tool_use in content - we handle tool calls separately
    }

    contentText = textParts.join("").trim();
  }

  // For tool messages, include additional tool metadata
  if (message.type === "tool") {
    const toolName = (message as any).name || "unknown_tool";
    const toolCallId = (message as any).tool_call_id || "";
    role = `Tool Result [${toolName}]`;
    if (toolCallId) {
      role += ` (call_id: ${toolCallId.slice(0, 8)})`;
    }
  }

  // Handle tool calls from .tool_calls property (for AI messages)
  const toolCallsText: string[] = [];
  if (
    message.type === "ai" &&
    message.tool_calls &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  ) {
    message.tool_calls.forEach((call: any) => {
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

export function formatConversationForLLM(messages: Message[]): string {
  const formattedMessages = messages.map(formatMessageForLLM);
  return formattedMessages.join("\n\n---\n\n");
}
