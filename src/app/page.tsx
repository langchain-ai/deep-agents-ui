"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useQueryState } from "nuqs";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Button } from "@/components/ui/button";
import { Assistant } from "@langchain/langgraph-sdk";
import { ClientProvider } from "@/providers/ClientProvider";
import { Settings, MessagesSquare, SquarePen } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ThreadList } from "@/app/components/ThreadList";
import { ChatProvider } from "@/providers/ChatProvider";
import { ChatInterface } from "@/app/components/ChatInterface";

function HomePageContent() {
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [debugMode, _] = useState(false);
  const [assistantId, setAssistantId] = useQueryState("assistantId");
  const [_threadId, setThreadId] = useQueryState("threadId");
  const [sidebar, setSidebar] = useQueryState("sidebar");

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [interruptCount, setInterruptCount] = useState(0);

  useEffect(() => {
    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      if (!assistantId) {
        setAssistantId(savedConfig.assistantId);
      }
    } else {
      setConfigDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (config && !assistantId) {
      setAssistantId(config.assistantId);
    }
  }, [config, assistantId, setAssistantId]);

  const handleSaveConfig = (newConfig: StandaloneConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  };

  const langsmithApiKey =
    config?.langsmithApiKey || process.env.NEXT_PUBLIC_LANGSMITH_API_KEY || "";

  if (!config) {
    return (
      <>
        <ConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          onSave={handleSaveConfig}
        />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to Standalone Chat</h1>
            <p className="mt-2 text-muted-foreground">
              Configure your deployment to get started
            </p>
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="mt-4"
            >
              Open Configuration
            </Button>
          </div>
        </div>
      </>
    );
  }

  let subagentModelsConfig: Record<string, string> | undefined;
  if (config.subagentModelOverrides) {
    try {
      const parsed = JSON.parse(config.subagentModelOverrides);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        subagentModelsConfig = parsed as Record<string, string>;
      }
    } catch {
      // Ignore invalid JSON; backend will behave as if no overrides were provided.
    }
  }

  const defaultModelName = "litellm:openai/gpt-5-mini";
  const assistant: Assistant = {
    assistant_id: config.assistantId,
    graph_id: config.assistantId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      configurable: {
        LLM_MODEL: config.llmModelName || defaultModelName,
        PROJECT: config.project,
        ...(subagentModelsConfig
          ? { SUBAGENT_MODELS: subagentModelsConfig }
          : {}),
      },
    },
    metadata: {},
    version: 1,
    name: "Default Assistant",
    context: {},
  };

  return (
    <>
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        initialConfig={config}
      />
      <ClientProvider deploymentUrl={config.deploymentUrl} apiKey={langsmithApiKey}>
        <div className="flex h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Deep Agent UI</h1>
              {!sidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebar("1")}
                  className="rounded-md border border-border bg-card p-3 text-foreground hover:bg-accent"
                >
                  <MessagesSquare className="mr-2 h-4 w-4" />
                  Threads
                  {interruptCount > 0 && (
                    <span className="ml-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                      {interruptCount}
                    </span>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Assistant:</span>{" "}
                {config.assistantId}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigDialogOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setThreadId(null)}
                disabled={!_threadId}
                className="border-[#2F6868] bg-[#2F6868] text-white hover:bg-[#2F6868]/80"
              >
                <SquarePen className="mr-2 h-4 w-4" />
                New Thread
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="standalone-chat"
            >
              {sidebar && (
                <>
                  <ResizablePanel
                    id="thread-history"
                    order={1}
                    defaultSize={25}
                    minSize={20}
                    className="relative min-w-[380px]"
                  >
                    <ThreadList
                      onThreadSelect={async (id) => {
                        await setThreadId(id);
                      }}
                      onMutateReady={(fn) => setMutateThreads(() => fn)}
                      onClose={() => setSidebar(null)}
                      onInterruptCountChange={setInterruptCount}
                    />
                  </ResizablePanel>
                  <ResizableHandle />
                </>
              )}

              <ResizablePanel
                id="chat"
                className="relative flex flex-col"
                order={2}
              >
                <ChatProvider
                  activeAssistant={assistant}
                  onHistoryRevalidate={() => mutateThreads?.()}
                >
                  <ChatInterface
                    assistant={assistant}
                    debugMode={debugMode}
                    controls={<></>}
                    skeleton={
                      <div className="flex items-center justify-center p-8">
                        <p className="text-muted-foreground">Loading...</p>
                      </div>
                    }
                  />
                </ChatProvider>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ClientProvider>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
