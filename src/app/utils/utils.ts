import { Message } from "@langchain/langgraph-sdk";

export const extractStringFromMessageContent = (message: Message): string => {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    const textBlock = message.content.find((block) => block.type === "text");
    if (textBlock && "text" in textBlock) {
      return textBlock.text;
    }
  }
  return JSON.stringify(message.content);
};

export const generateToolCallId = (toolCall: any): string => {
  if (toolCall.id) {
    return toolCall.id;
  }
  const name = toolCall.function?.name || toolCall.name || toolCall.type || "unknown";
  const args = toolCall.function?.arguments || toolCall.args || toolCall.input || {};
  return `tool-${name}-${JSON.stringify(args)}`;
};