"use client";

import React, { Suspense } from "react";
import { useQueryState } from "nuqs";
import { Assistant } from "@langchain/langgraph-sdk";
import { ClientProvider } from "@/providers/ClientProvider";
import { ChatProvider } from "@/providers/ChatProvider";
import { ChatInterface } from "@/app/components/ChatInterface";

function EmbedChatContent() {
  const [deploymentUrl] = useQueryState("deploymentUrl");
  const [assistantId] = useQueryState("assistantId");
  const [apiKey] = useQueryState("apiKey");
  const [model] = useQueryState("model");
  const [project] = useQueryState("project");
  const [_threadId, setThreadId] = useQueryState("threadId");

  if (!deploymentUrl || !assistantId) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Missing required params: deploymentUrl, assistantId
      </div>
    );
  }

  const assistant: Assistant = {
    assistant_id: assistantId,
    graph_id: assistantId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      configurable: {
        LLM_MODEL: model || "litellm:openai/gpt-5-mini",
        PROJECT: project || undefined,
      },
    },
    metadata: {},
    version: 1,
    name: "Embed Assistant",
    context: {},
  };

  return (
    <ClientProvider deploymentUrl={deploymentUrl} apiKey={apiKey || ""}>
      <div className="flex h-screen flex-col">
        <ChatProvider activeAssistant={assistant}>
          <ChatInterface
            assistant={assistant}
            debugMode={false}
            mode="embed"
            controls={<></>}
            skeleton={
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            }
            onClearThread={() => setThreadId(null)}
          />
        </ChatProvider>
      </div>
    </ClientProvider>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <EmbedChatContent />
    </Suspense>
  );
}
