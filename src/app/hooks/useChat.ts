"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
  type Message,
  type Assistant,
  type Checkpoint,
} from "@langchain/langgraph-sdk";
import { v4 as uuidv4 } from "uuid";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import type { Attachment, TodoItem } from "@/app/types/types";
import { useClient } from "@/providers/ClientProvider";
import { useAuthHeader } from "@/providers/AuthHeaderProvider";
import { HumanResponse } from "@/app/types/inbox";
import { isImageFile, resolveImageMimeType } from "@/app/utils/utils";
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
  const { authorization } = useAuthHeader();

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onThreadId: setThreadId,
    defaultHeaders: {
      "x-auth-scheme": "langsmith",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: onHistoryRevalidate,
    onCreated: onHistoryRevalidate,
    experimental_thread: thread,
  });

  const runStartedAtRef = useRef<number | null>(null);
  const prevIsLoadingRef = useRef(stream.isLoading);
  const [responseDurationByAiMessageId, setResponseDurationByAiMessageId] =
    useState<Record<string, number>>({});

  useEffect(() => {
    setResponseDurationByAiMessageId({});
  }, [threadId]);

  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    const nowLoading = stream.isLoading;
    if (wasLoading && !nowLoading && runStartedAtRef.current != null) {
      const started = runStartedAtRef.current;
      runStartedAtRef.current = null;
      const msgs = stream.messages ?? [];
      let lastAiId: string | undefined;
      for (let i = msgs.length - 1; i >= 0; i -= 1) {
        const m = msgs[i];
        if (m.type === "ai" && m.id) {
          lastAiId = m.id;
          break;
        }
      }
      if (lastAiId) {
        const durationMs = Math.round(performance.now() - started);
        setResponseDurationByAiMessageId((prev) => ({
          ...prev,
          [lastAiId!]: durationMs,
        }));
      }
    }
    prevIsLoadingRef.current = nowLoading;
  }, [stream.isLoading, stream.messages]);

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      let messageContent: Message["content"];
      const documentAttachments: Attachment[] = [];
      const inlineAttachments: Attachment[] = [];

      // Separate document attachments (to files state) from inline attachments (to message)
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.isDocument) {
            documentAttachments.push(attachment);
          } else {
            inlineAttachments.push(attachment);
          }
        }
      }

      // Build document files map for state update
      let documentFiles: Record<string, string> | null = null;
      if (documentAttachments.length > 0) {
        const currentFiles = stream.values.files ?? {};
        documentFiles = { ...currentFiles };
        for (const doc of documentAttachments) {
          documentFiles[`uploads/${doc.name}`] = doc.content;
        }

        // If thread exists, update state before sending message
        if (threadId) {
          await client.threads.updateState(threadId, {
            values: { files: documentFiles },
          });
        }
      }

      const hasInlineAttachments = inlineAttachments.length > 0;
      const hasDocumentAttachments = documentAttachments.length > 0;

      if (hasInlineAttachments || hasDocumentAttachments) {
        const contentBlocks: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [];

        // Add user text if present
        if (content.trim()) {
          contentBlocks.push({ type: "text", text: content });
        }

        // Add inline attachment blocks (images, text files)
        for (const attachment of inlineAttachments) {
          if (isImageFile(attachment.type, attachment.name)) {
            const mime =
              resolveImageMimeType(attachment.type, attachment.name) ??
              "image/png";
            contentBlocks.push({
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${attachment.content}`,
              },
            });
          } else {
            const isBinary = !attachment.type.startsWith("text/");
            const header = isBinary
              ? `--- File: ${attachment.name} (base64) ---`
              : `--- File: ${attachment.name} ---`;
            contentBlocks.push({
              type: "text",
              text: `${header}\n${attachment.content}`,
            });
          }
        }

        // Add references for document attachments
        for (const doc of documentAttachments) {
          contentBlocks.push({
            type: "text",
            text: `[Uploaded file: ${doc.name} - use parse_document_file("uploads/${doc.name}") to extract its text.]`,
          });
        }

        messageContent = contentBlocks;
      } else {
        messageContent = content;
      }

      const newMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: messageContent,
      };

      // Include files in submit values for new threads (no threadId yet)
      const submitValues: Record<string, unknown> = {
        messages: [newMessage],
      };
      if (documentFiles && !threadId) {
        submitValues.files = documentFiles;
      }

      runStartedAtRef.current = performance.now();
      stream.submit(submitValues, {
        optimisticValues: (prev) => ({
          messages: [...(prev.messages ?? []), newMessage],
        }),
        config: {
          ...(activeAssistant?.config ?? {}),
          recursion_limit: 1000,
        },
      });
      // Update thread list immediately when sending a message
      onHistoryRevalidate?.();
    },
    [stream, activeAssistant?.config, onHistoryRevalidate, threadId, client]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      runStartedAtRef.current = performance.now();
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
      runStartedAtRef.current = performance.now();
      stream.submit(undefined, {
        config: {
          ...(activeAssistant?.config || {}),
          recursion_limit: 1000,
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

  const sendHumanResponse = useCallback(
    (response: HumanResponse[]) => {
      runStartedAtRef.current = performance.now();
      stream.submit(null, { command: { resume: response } });
      // Update thread list when resuming from interrupt
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    stream.submit(null, { command: { goto: "__end__", update: null } });
    // Update thread list when marking thread as resolved
    onHistoryRevalidate?.();
  }, [stream, onHistoryRevalidate]);

  const stopStream = useCallback(() => {
    runStartedAtRef.current = null;
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
    responseDurationByAiMessageId,
    isLoading: stream.isLoading,
    isThreadLoading: stream.isThreadLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
    sendHumanResponse,
    markCurrentThreadAsResolved,
  };
}
