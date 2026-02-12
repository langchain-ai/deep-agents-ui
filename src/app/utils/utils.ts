import { Interrupt, Message } from "@langchain/langgraph-sdk";
import { HumanInterrupt } from "@/app/types/inbox";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractStringFromMessageContent(message: Message): string {
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

    message.content.forEach((part: any) => {
      if (typeof part === "string") {
        textParts.push(part);
      } else if (part && typeof part === "object" && part.type === "text") {
        textParts.push(part.text || "");
      }
      // Ignore other types like tool_use in content - we handle tool calls separately
    });

    contentText = textParts.join("\n\n").trim();
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

const FILE_ATTACHMENT_PREFIX = "--- File: ";

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

const TEXT_MIME_PREFIXES = ["text/", "application/json", "application/xml"];
const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".sh",
  ".bash",
  ".sql",
  ".toml",
  ".ini",
  ".cfg",
  ".env",
  ".log",
  ".svg",
];

export function isTextFile(mimeType: string, fileName: string): boolean {
  if (TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) return true;
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return TEXT_EXTENSIONS.includes(ext);
}

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xlsx"];

export function isDocumentFile(mimeType: string, fileName: string): boolean {
  if (DOCUMENT_MIME_TYPES.includes(mimeType)) return true;
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return DOCUMENT_EXTENSIONS.includes(ext);
}

export interface ImageBlock {
  url: string;
}

export interface FileAttachmentBlock {
  name: string;
  content: string;
  isBinary: boolean;
}

/**
 * Extract image_url blocks from a message's content array.
 */
export function extractImagesFromMessageContent(message: Message): ImageBlock[] {
  if (!Array.isArray(message.content)) return [];
  return message.content
    .filter(
      (c: any) =>
        typeof c === "object" && c !== null && c.type === "image_url"
    )
    .map((c: any) => {
      const url =
        typeof c.image_url === "string" ? c.image_url : c.image_url?.url ?? "";
      return { url };
    });
}

/**
 * Extract file attachment text blocks from a message's content array.
 * These are blocks whose text starts with "--- File: ".
 */
export function extractFileAttachmentsFromMessageContent(
  message: Message
): FileAttachmentBlock[] {
  if (!Array.isArray(message.content)) return [];
  return message.content
    .filter(
      (c: any) =>
        typeof c === "object" &&
        c !== null &&
        c.type === "text" &&
        typeof c.text === "string" &&
        c.text.startsWith(FILE_ATTACHMENT_PREFIX)
    )
    .map((c: any) => {
      const text = c.text as string;
      // Parse "--- File: name (base64) ---\n..." or "--- File: name ---\n..."
      const headerEnd = text.indexOf(" ---\n");
      if (headerEnd === -1) {
        return { name: "unknown", content: text, isBinary: false };
      }
      const header = text.slice(FILE_ATTACHMENT_PREFIX.length, headerEnd);
      const isBinary = header.endsWith(" (base64)");
      const name = isBinary
        ? header.slice(0, -" (base64)".length)
        : header;
      const content = text.slice(headerEnd + " ---\n".length);
      return { name, content, isBinary };
    });
}

/**
 * Extract only the user-typed text from message content, excluding file attachment blocks.
 */
export function extractUserTextFromMessageContent(message: Message): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter(
      (c: any) =>
        (typeof c === "object" &&
          c !== null &&
          c.type === "text" &&
          typeof c.text === "string" &&
          !c.text.startsWith(FILE_ATTACHMENT_PREFIX)) ||
        typeof c === "string"
    )
    .map((c: any) => (typeof c === "string" ? c : c.text || ""))
    .join("");
}

export function getInterruptTitle(interrupt: Interrupt): string {
  try {
    const interruptValue = (interrupt.value as any)?.[0] as HumanInterrupt;
    return interruptValue?.action_request.action ?? "Unknown interrupt";
  } catch (error) {
    console.error("Error getting interrupt title:", error);
    return "Unknown interrupt";
  }
}
