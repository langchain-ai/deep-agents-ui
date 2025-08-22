import { useCallback, useMemo } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
  type Message,
  type Assistant,
  type Checkpoint,
} from "@langchain/langgraph-sdk";
import { v4 as uuidv4 } from "uuid";
import type { TodoItem } from "../types/types";
import { createClient } from "@/lib/client";
import { useEnvConfig } from "@/providers/EnvConfig";

type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
};

export function useChat(
  threadId: string | null,
  setThreadId: (
    value: string | ((old: string | null) => string | null) | null,
  ) => void,
  onTodosUpdate: (todos: TodoItem[]) => void,
  onFilesUpdate: (files: Record<string, string>) => void,
  activeAssistant: Assistant | null,
) {
  const { config, configVersion } = useEnvConfig();
  const deploymentUrl = config?.DEPLOYMENT_URL || "";
  const langsmithApiKey = config?.LANGSMITH_API_KEY || "filler-token";
  const assistantId = config?.ASSISTANT_ID || "";

  const handleUpdateEvent = useCallback(
    (data: { [node: string]: Partial<StateType> }) => {
      Object.values(data).forEach((nodeData) => {
        if (nodeData?.todos) {
          onTodosUpdate(nodeData.todos);
        }
        if (nodeData?.files) {
          onFilesUpdate(nodeData.files);
        }
      });
    },
    [onTodosUpdate, onFilesUpdate],
  );

  // Create client with configVersion as dependency to force recreation when config changes
  const client = useMemo(
    () => createClient(deploymentUrl, langsmithApiKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deploymentUrl, langsmithApiKey, configVersion],
  );

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || assistantId,
    client: client,
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onUpdateEvent: handleUpdateEvent,
    onThreadId: setThreadId,
    defaultHeaders: {
      "x-auth-scheme": "langsmith",
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      const humanMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: message,
      };
      stream.submit(
        { messages: [humanMessage] },
        {
          optimisticValues(prev) {
            const prevMessages = prev.messages ?? [];
            const newMessages = [...prevMessages, humanMessage];
            return { ...prev, messages: newMessages };
          },
          config: {
            ...(activeAssistant?.config || {}),
            recursion_limit: 100,
          },
        },
      );
    },
    [stream, activeAssistant?.config],
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
    ) => {
      if (checkpoint) {
        stream.submit(undefined, {
          config: {
            ...(activeAssistant?.config || {}),
          },
          checkpoint: checkpoint,
          ...(isRerunningSubagent
            ? { interruptAfter: ["tools"] }
            : { interruptBefore: ["tools"] }),
        });
      } else {
        stream.submit(
          { messages: messages },
          {
            config: {
              ...(activeAssistant?.config || {}),
            },
            interruptBefore: ["tools"],
          },
        );
      }
    },
    [stream, activeAssistant?.config],
  );

  const continueStream = useCallback(
    (hasTaskToolCall?: boolean) => {
      stream.submit(undefined, {
        config: {
          ...(activeAssistant?.config || {}),
          recursion_limit: 100,
        },
        ...(hasTaskToolCall
          ? { interruptAfter: ["tools"] }
          : { interruptBefore: ["tools"] }),
      });
    },
    [stream, activeAssistant?.config],
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  return {
    messages: stream.messages,
    isLoading: stream.isLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
  };
}
