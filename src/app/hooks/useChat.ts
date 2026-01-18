"use client";

import { useCallback } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
  type Message,
  type Assistant,
  type Checkpoint,
} from "@langchain/langgraph-sdk";
import { v4 as uuidv4 } from "uuid";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import type { TodoItem } from "@/app/types/types";
import { useClient } from "@/providers/ClientProvider";
import { useQueryState } from "nuqs";

export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  email?: {
    id?: string;
    subject?: string;
    page_content?: string;
  };
  ui?: any;
};

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onThreadId: setThreadId,
    defaultHeaders: { "x-auth-scheme": "langsmith" },
    // Enable fetching state history when switching to existing threads
    fetchStateHistory: true,
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: onHistoryRevalidate,
    onCreated: onHistoryRevalidate,
    experimental_thread: thread,
  });

  // TTL configuration for tagging_pal agent (7 days = 10080 minutes)
  const TAGGING_PAL_TTL_MINUTES = 10080;
  const isTaggingPalAgent =
    activeAssistant?.graph_id === "tagging_pal" ||
    activeAssistant?.assistant_id?.includes("tagging_pal");

  const sendMessage = useCallback(
    async (content: string) => {
      const newMessage: Message = { id: uuidv4(), type: "human", content };

      // If no thread exists and this is tagging_pal, pre-create thread with extended TTL
      if (!threadId && isTaggingPalAgent && client) {
        try {
          const newThread = await client.threads.create({
            ttl: { strategy: "delete", ttl: TAGGING_PAL_TTL_MINUTES },
          });
          setThreadId(newThread.thread_id);

          // Submit with the pre-created thread ID
          stream.submit(
            { messages: [newMessage] },
            {
              threadId: newThread.thread_id,
              optimisticValues: (prev) => ({
                messages: [...(prev.messages ?? []), newMessage],
              }),
              config: {
                ...(activeAssistant?.config ?? {}),
                recursion_limit: 100,
              },
            }
          );
        } catch (error) {
          // Fall back to default thread creation if TTL-enabled creation fails
          console.error("Failed to create thread with TTL, falling back:", error);
          stream.submit(
            { messages: [newMessage] },
            {
              optimisticValues: (prev) => ({
                messages: [...(prev.messages ?? []), newMessage],
              }),
              config: {
                ...(activeAssistant?.config ?? {}),
                recursion_limit: 100,
              },
            }
          );
        }
      } else {
        stream.submit(
          { messages: [newMessage] },
          {
            optimisticValues: (prev) => ({
              messages: [...(prev.messages ?? []), newMessage],
            }),
            config: {
              ...(activeAssistant?.config ?? {}),
              recursion_limit: 100,
            },
          }
        );
      }
      // Update thread list immediately when sending a message
      onHistoryRevalidate?.();
    },
    [
      stream,
      activeAssistant?.config,
      onHistoryRevalidate,
      threadId,
      isTaggingPalAgent,
      client,
      setThreadId,
    ]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          config: activeAssistant?.config,
          checkpoint: checkpoint,
          ...(isRerunningSubagent
            ? { interruptAfter: ["tools"] }
            : { interruptBefore: ["tools"] }),
        });
      } else {
        stream.submit(
          { messages },
          { config: activeAssistant?.config, interruptBefore: ["tools"] }
        );
      }
    },
    [stream, activeAssistant?.config]
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId) return;
      // TODO: missing a way how to revalidate the internal state
      // I think we do want to have the ability to externally manage the state
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId]
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
      // Update thread list when continuing stream
      onHistoryRevalidate?.();
    },
    [stream, activeAssistant?.config, onHistoryRevalidate]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    stream.submit(null, { command: { goto: "__end__", update: null } });
    // Update thread list when marking thread as resolved
    onHistoryRevalidate?.();
  }, [stream, onHistoryRevalidate]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      stream.submit(null, { command: { resume: value } });
      // Update thread list when resuming from interrupt
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  return {
    stream,
    todos: stream.values.todos ?? [],
    files: stream.values.files ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages: stream.messages,
    isLoading: stream.isLoading,
    isThreadLoading: stream.isThreadLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
    markCurrentThreadAsResolved,
    resumeInterrupt,
  };
}
