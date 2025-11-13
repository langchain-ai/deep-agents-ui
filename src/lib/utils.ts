import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BaseMessage, isBaseMessage } from "@langchain/core/messages";
import { format } from "date-fns";
import { startCase } from "lodash";
import { HumanInterrupt, HumanResponseWithEdits, SubmitType } from "@/app/types/inbox";
import { validate } from "uuid";
import { Interrupt } from "@langchain/langgraph-sdk";
import { Deployment } from "@/app/types/types";
import { Message, ToolMessage } from "@langchain/langgraph-sdk";
import { ToolCall } from "@langchain/core/messages/tool";


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
              typeof c === "string",
          )
          .map((c: unknown) =>
            typeof c === "string"
              ? c
              : typeof c === "object" && c !== null && "text" in c
                ? (c as { text?: string }).text || ""
                : "",
          )
          .join("")
      : "";
}

export function isPreparingToCallTaskTool(messages: Message[]): boolean {
  const lastMessage = messages[messages.length - 1];
  return (
    (lastMessage.type === "ai" &&
      lastMessage.tool_calls?.some(
        (call: { name?: string }) => call.name === "task",
      )) ||
    false
  );
}

export function justCalledTaskTool(messages: Message[]): boolean {
  const lastAiMessage = messages.filter(
    (message: Message) => message.type === "ai",
  )[-1];
  if (!lastAiMessage) return false;
  const toolMessagesAfterLastAiMessage = messages.slice(
    messages.indexOf(lastAiMessage) + 1,
  );
  const taskToolCallsCompleted = toolMessagesAfterLastAiMessage.some(
    (message) => message.type === "tool" && message.name === "task",
  );
  return (
    (lastAiMessage.tool_calls?.some(
      (call: { name?: string }) => call.name === "task",
    ) &&
      taskToolCallsCompleted) ||
    false
  );
}

export function prepareOptimizerMessage(feedback: string): string {
  return `<feedback>
${feedback}
</feedback>

You have access to the current configuration in config.yaml and the conversation history in conversation.txt. Use the above feedback to update the config.yaml file based on the conversation context.
`;
}

export function deploymentSupportsDeepAgents(
  deployment: Deployment | undefined,
) {
  return deployment?.supportsDeepAgents ?? false;
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
    const toolName = (message as ToolMessage).name || "unknown_tool";
    const toolCallId = (message as ToolMessage).tool_call_id || "";
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
    message.tool_calls.forEach((call: ToolCall) => {
      const toolName = call.name || "unknown_tool";
      const toolArgs = call.args ? JSON.stringify(call.args, null, 2) : "{}";
      toolCallsText.push(`[Tool Call: ${toolName}]\nArguments: ${toolArgs}`);
    });
  }

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

/**
 * Extracts displayable content from a subAgent input or output object
 * @param data - The input or output data object
 * @returns A string representation suitable for display
 */
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


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function prettifyText(action: string) {
  return startCase(action.replace(/_/g, " "));
}

/**
 * Determines if a URL is a deployed (cloud) URL.
 */
export function isDeployedUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Simple check: Does it start with https and not contain localhost?
    return (
      parsedUrl.protocol === "https:" &&
      !parsedUrl.hostname.includes("localhost")
    );
  } catch (_) {
    // If parsing fails, assume it's not a valid deployed URL
    return false;
  }
}

export function isArrayOfMessages(
  value: Record<string, any>[],
): value is BaseMessage[] {
  if (
    value.every(isBaseMessage) ||
    (Array.isArray(value) &&
      value.every(
        (v) =>
          typeof v === "object" &&
          "id" in v &&
          "type" in v &&
          "content" in v &&
          "additional_kwargs" in v,
      ))
  ) {
    return true;
  }
  return false;
}

export function baseMessageObject(item: unknown): string {
  if (isBaseMessage(item)) {
    const contentText =
      typeof item.content === "string"
        ? item.content
        : JSON.stringify(item.content, null);
    let toolCallText = "";
    if ("tool_calls" in item) {
      toolCallText = JSON.stringify(item.tool_calls, null);
    }
    if ("type" in item) {
      return `${item.type}:${contentText ? ` ${contentText}` : ""}${toolCallText ? ` - Tool calls: ${toolCallText}` : ""}`;
    } else if ("_getType" in item) {
      return `${item._getType()}:${contentText ? ` ${contentText}` : ""}${toolCallText ? ` - Tool calls: ${toolCallText}` : ""}`;
    }
  } else if (
    typeof item === "object" &&
    item &&
    "type" in item &&
    "content" in item
  ) {
    const contentText =
      typeof item.content === "string"
        ? item.content
        : JSON.stringify(item.content, null);
    let toolCallText = "";
    if ("tool_calls" in item) {
      toolCallText = JSON.stringify(item.tool_calls, null);
    }
    return `${item.type}:${contentText ? ` ${contentText}` : ""}${toolCallText ? ` - Tool calls: ${toolCallText}` : ""}`;
  }

  if (typeof item === "object") {
    return JSON.stringify(item, null);
  } else {
    return item as string;
  }
}

export function unknownToPrettyDate(input: unknown): string | undefined {
  try {
    if (
      Object.prototype.toString.call(input) === "[object Date]" ||
      new Date(input as string)
    ) {
      return format(new Date(input as string), "MM/dd/yyyy hh:mm a");
    }
  } catch (_) {
    // failed to parse date. no-op
  }
  return undefined;
}

export function createDefaultHumanResponse(
  interrupts: HumanInterrupt[],
  initialHumanInterruptEditValue: React.MutableRefObject<
    Record<string, string>
  >,
): {
  responses: HumanResponseWithEdits[];
  defaultSubmitType: SubmitType | undefined;
  hasAccept: boolean;
} {
  const interrupt = interrupts[0];

  const responses: HumanResponseWithEdits[] = [];
  if (interrupt.config.allow_edit) {
    if (interrupt.config.allow_accept) {
      Object.entries(interrupt.action_request.args).forEach(([k, v]) => {
        let stringValue = "";
        if (typeof v === "string") {
          stringValue = v;
        } else {
          stringValue = JSON.stringify(v, null);
        }

        if (
          !initialHumanInterruptEditValue.current ||
          !(k in initialHumanInterruptEditValue.current)
        ) {
          initialHumanInterruptEditValue.current = {
            ...initialHumanInterruptEditValue.current,
            [k]: stringValue,
          };
        } else if (
          k in initialHumanInterruptEditValue.current &&
          initialHumanInterruptEditValue.current[k] !== stringValue
        ) {
          console.error(
            "KEY AND VALUE FOUND IN initialHumanInterruptEditValue.current THAT DOES NOT MATCH THE ACTION REQUEST",
            {
              key: k,
              value: stringValue,
              expectedValue: initialHumanInterruptEditValue.current[k],
            },
          );
        }
      });
      responses.push({
        type: "edit",
        args: interrupt.action_request,
        acceptAllowed: true,
        editsMade: false,
      });
    } else {
      responses.push({
        type: "edit",
        args: interrupt.action_request,
        acceptAllowed: false,
      });
    }
  }
  if (interrupt.config.allow_respond) {
    responses.push({
      type: "response",
      args: "",
    });
  }

  if (interrupt.config.allow_ignore) {
    responses.push({
      type: "ignore",
      args: null,
    });
  }

  // Set the submit type.
  // Priority: accept > response  > edit
  const acceptAllowedConfig = interrupts.find((i) => i.config.allow_accept);
  const ignoreAllowedConfig = interrupts.find((i) => i.config.allow_ignore);

  const hasResponse = responses.find((r) => r.type === "response");
  const hasAccept =
    responses.find((r) => r.acceptAllowed) || acceptAllowedConfig;
  const hasEdit = responses.find((r) => r.type === "edit");

  let defaultSubmitType: SubmitType | undefined;
  if (hasAccept) {
    defaultSubmitType = "accept";
  } else if (hasResponse) {
    defaultSubmitType = "response";
  } else if (hasEdit) {
    defaultSubmitType = "edit";
  }

  if (acceptAllowedConfig && !responses.find((r) => r.type === "accept")) {
    responses.push({
      type: "accept",
      args: null,
    });
  }
  if (ignoreAllowedConfig && !responses.find((r) => r.type === "ignore")) {
    responses.push({
      type: "ignore",
      args: null,
    });
  }

  return { responses, defaultSubmitType, hasAccept: !!hasAccept };
}

export function haveArgsChanged(
  args: unknown,
  initialValues: Record<string, string>,
): boolean {
  if (typeof args !== "object" || !args) {
    return false;
  }

  const currentValues = args as Record<string, string>;

  return Object.entries(currentValues).some(([key, value]) => {
    const valueString = ["string", "number"].includes(typeof value)
      ? value.toString()
      : JSON.stringify(value, null);
    return initialValues[key] !== valueString;
  });
}

/**
 * Interface for deployment info response
 */
export interface DeploymentInfoResponse {
  flags: {
    assistants: boolean;
    crons: boolean;
    langsmith: boolean;
  };
  host: {
    kind: string;
    project_id: string | null;
    revision_id: string;
    tenant_id: string | null;
  };
}

/**
 * Fetches information about a deployment from its /info endpoint
 * @param deploymentUrl The URL of the deployment to fetch info from
 */
export async function fetchDeploymentInfo(
  deploymentUrl: string,
): Promise<DeploymentInfoResponse | null> {
  try {
    // Ensure deploymentUrl doesn't end with a slash
    const baseUrl = deploymentUrl.replace(/\/$/, "");
    const infoUrl = `${baseUrl}/info`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const response = await fetch(infoUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error(`Error fetching deployment info: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data as DeploymentInfoResponse;
  } catch (error) {
    console.error("Error fetching deployment info:", error);
    return null;
  }
}

export function extractProjectId(inboxId: string): string | null {
  if (!inboxId || !inboxId.includes(":")) {
    return null;
  }
  const parts = inboxId.split(":");
  if (parts.length === 2) {
    // Ensure the first part is a valid UUID
    if (validate(parts[0])) {
      return parts[0];
    }
  }
  return null;
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
