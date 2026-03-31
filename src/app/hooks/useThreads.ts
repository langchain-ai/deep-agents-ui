"use client";

import useSWRInfinite from "swr/infinite";
import type { Thread } from "@langchain/langgraph-sdk";
import { Client } from "@langchain/langgraph-sdk";
import { getConfig } from "@/lib/config";
import { useAuthHeader } from "@/providers/AuthHeaderProvider";

export interface ThreadItem {
  id: string;
  updatedAt: Date;
  status: Thread["status"];
  title: string;
  description: string;
  assistantId?: string;
}

const DEFAULT_PAGE_SIZE = 20;

export function useThreads(props: {
  status?: Thread["status"];
  limit?: number;
}) {
  const pageSize = props.limit || DEFAULT_PAGE_SIZE;
  const { authorization, ready: authReady } = useAuthHeader();

  return useSWRInfinite(
    (pageIndex: number, previousPageData: ThreadItem[] | null) => {
      const config = getConfig();
      const apiKey =
        config?.langsmithApiKey ||
        process.env.NEXT_PUBLIC_LANGSMITH_API_KEY ||
        "";

      // Minimal fix: don't disable threads when apiKey is empty.
      // Many deployments don't require an API key, and the original
      // `!apiKey` check caused the hook to never run.
      if (!config) {
        return null;
      }

      if (!authReady) {
        return null;
      }

      // If the previous page returned no items, we've reached the end
      if (previousPageData && previousPageData.length === 0) {
        return null;
      }

      return {
        kind: "threads" as const,
        pageIndex,
        pageSize,
        deploymentUrl: config.deploymentUrl,
        assistantId: config.assistantId,
        apiKey,
        authorization: authorization ?? "",
        status: props?.status,
      };
    },
    async ({
      deploymentUrl,
      assistantId,
      apiKey,
      authorization,
      status,
      pageIndex,
      pageSize,
    }: {
      kind: "threads";
      pageIndex: number;
      pageSize: number;
      deploymentUrl: string;
      assistantId: string;
      apiKey: string;
      authorization: string;
      status?: Thread["status"];
    }) => {
      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      };
      if (authorization) {
        defaultHeaders["Authorization"] = authorization;
      }

      const client = new Client({
        apiUrl: deploymentUrl,
        defaultHeaders,
      });

      const threads = await client.threads.search({
        limit: pageSize,
        offset: pageIndex * pageSize,
        sortBy: "updated_at",
        sortOrder: "desc",
        status,
        // Minimal fix: do NOT filter by assistantId metadata here,
        // since many deployments don't populate it and that caused
        // the list to be empty.
        // metadata: { assistant_id: assistantId },
      });

      return threads.map((thread): ThreadItem => {
        let title = "Untitled Thread";
        let description = "";

        try {
          if (thread.values && typeof thread.values === "object") {
            const values = thread.values as any;
            const firstHumanMessage = values.messages.find(
              (m: any) => m.type === "human"
            );
            if (firstHumanMessage?.content) {
              const content =
                typeof firstHumanMessage.content === "string"
                  ? firstHumanMessage.content
                  : firstHumanMessage.content[0]?.text || "";
              title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
            }
            const firstAiMessage = values.messages.find(
              (m: any) => m.type === "ai"
            );
            if (firstAiMessage?.content) {
              const content =
                typeof firstAiMessage.content === "string"
                  ? firstAiMessage.content
                  : firstAiMessage.content[0]?.text || "";
              description = content.slice(0, 100);
            }
          }
        } catch {
          // Fallback to thread ID
          title = `Thread ${thread.thread_id.slice(0, 8)}`;
        }

        return {
          id: thread.thread_id,
          updatedAt: new Date(thread.updated_at),
          status: thread.status,
          title,
          description,
          assistantId,
        };
      });
    },
    {
      revalidateFirstPage: true,
      revalidateOnFocus: true,
    }
  );
}
