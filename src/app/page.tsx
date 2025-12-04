"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useQueryState } from "nuqs";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Button } from "@/components/ui/button";
import { Assistant } from "@langchain/langgraph-sdk";
import { ClientProvider, useClient } from "@/providers/ClientProvider";
import { Settings, Sun, SquarePen, Copy, MessageCircle } from "lucide-react";
import { ThreadList } from "@/app/components/ThreadList";
import { ChatProvider, useChatContext } from "@/providers/ChatProvider";
import { ChatInterface } from "@/app/components/ChatInterface";
import { LeftSidebar } from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";

interface HomePageInnerProps {
  config: StandaloneConfig;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  handleSaveConfig: (config: StandaloneConfig) => void;
}

// Inner component that uses ChatContext
function MainContent({
  assistant,
  threadId,
  setThreadId,
  setConfigDialogOpen,
  showAllChats,
  setShowAllChats,
  mutateThreads,
  setMutateThreads,
  setInterruptCount,
}: {
  assistant: Assistant | null;
  threadId: string | null;
  setThreadId: (id: string | null) => Promise<URLSearchParams>;
  setConfigDialogOpen: (open: boolean) => void;
  showAllChats: boolean;
  setShowAllChats: (show: boolean) => void;
  mutateThreads: (() => void) | null;
  setMutateThreads: (fn: (() => void) | null) => void;
  setInterruptCount: (count: number) => void;
}) {
  const { todos, files, setFiles, isLoading, interrupt } = useChatContext();

  return (
    <div className="flex flex-1 gap-3 overflow-hidden bg-gray-100 p-3">
      {/* Left Sidebar */}
      <div className="w-[240px] flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <LeftSidebar todos={todos} />
      </div>

      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" style={{ maxWidth: 'calc(100% - 560px)' }}>
        {/* Chat Header */}
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
              <Copy size={14} />
              Copy
            </button>
            <button
              onClick={() => setShowAllChats(!showAllChats)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              <MessageCircle size={14} />
              All Chats
            </button>
            <button
              onClick={() => setThreadId(null)}
              disabled={!threadId}
              className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <SquarePen size={14} />
              New Chat
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-1 flex-col">
            <ChatInterface assistant={assistant} />
          </div>

          {/* All Chats Overlay */}
          {showAllChats && (
            <div className="absolute inset-0 z-10 bg-white">
              <ThreadList
                onThreadSelect={async (id) => {
                  await setThreadId(id);
                  setShowAllChats(false);
                }}
                onMutateReady={(fn) => setMutateThreads(() => fn)}
                onClose={() => setShowAllChats(false)}
                onInterruptCountChange={setInterruptCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <RightSidebar
          files={files}
          setFiles={setFiles}
          isLoading={isLoading}
          interrupt={interrupt}
        />
      </div>
    </div>
  );
}

function HomePageInner({
  config,
  configDialogOpen,
  setConfigDialogOpen,
  handleSaveConfig,
}: HomePageInnerProps) {
  const client = useClient();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [showAllChats, setShowAllChats] = useState(false);

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [_interruptCount, setInterruptCount] = useState(0);
  const [assistant, setAssistant] = useState<Assistant | null>(null);

  const fetchAssistant = useCallback(async () => {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.assistantId
      );

    if (isUUID) {
      // We should try to fetch the assistant directly with this UUID
      try {
        const data = await client.assistants.get(config.assistantId);
        setAssistant(data);
      } catch (error) {
        console.error("Failed to fetch assistant:", error);
        setAssistant({
          assistant_id: config.assistantId,
          graph_id: config.assistantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          config: {},
          metadata: {},
          version: 1,
          name: "Assistant",
          context: {},
        });
      }
    } else {
      try {
        // We should try to list out the assistants for this graph, and then use the default one.
        // TODO: Paginate this search, but 100 should be enough for graph name
        const assistants = await client.assistants.search({
          graphId: config.assistantId,
          limit: 100,
        });
        const defaultAssistant = assistants.find(
          (assistant) => assistant.metadata?.["created_by"] === "system"
        );
        if (defaultAssistant === undefined) {
          throw new Error("No default assistant found");
        }
        setAssistant(defaultAssistant);
      } catch (error) {
        console.error(
          "Failed to find default assistant from graph_id: try setting the assistant_id directly:",
          error
        );
        setAssistant({
          assistant_id: config.assistantId,
          graph_id: config.assistantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          config: {},
          metadata: {},
          version: 1,
          name: config.assistantId,
          context: {},
        });
      }
    }
  }, [client, config.assistantId]);

  useEffect(() => {
    fetchAssistant();
  }, [fetchAssistant]);

  return (
    <>
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        initialConfig={config}
      />
      <div className="flex h-screen flex-col bg-white">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <h1 className="text-base font-semibold text-gray-800">Deep Agent UI</h1>
          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 hover:bg-gray-100">
              <Sun size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setConfigDialogOpen(true)}
              className="rounded-md p-2 hover:bg-gray-100"
            >
              <Settings size={18} className="text-gray-500" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <ChatProvider
          activeAssistant={assistant}
          onHistoryRevalidate={() => mutateThreads?.()}
        >
          <MainContent
            assistant={assistant}
            threadId={threadId}
            setThreadId={setThreadId}
            setConfigDialogOpen={setConfigDialogOpen}
            showAllChats={showAllChats}
            setShowAllChats={setShowAllChats}
            mutateThreads={mutateThreads}
            setMutateThreads={setMutateThreads}
            setInterruptCount={setInterruptCount}
          />
        </ChatProvider>
      </div>
    </>
  );
}

function HomePageContent() {
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [assistantId, setAssistantId] = useQueryState("assistantId");

  // On mount, check for saved config, otherwise show config dialog
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

  // If config changes, update the assistantId
  useEffect(() => {
    if (config && !assistantId) {
      setAssistantId(config.assistantId);
    }
  }, [config, assistantId, setAssistantId]);

  const handleSaveConfig = useCallback((newConfig: StandaloneConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

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

  return (
    <ClientProvider
      deploymentUrl={config.deploymentUrl}
      apiKey={langsmithApiKey}
    >
      <HomePageInner
        config={config}
        configDialogOpen={configDialogOpen}
        setConfigDialogOpen={setConfigDialogOpen}
        handleSaveConfig={handleSaveConfig}
      />
    </ClientProvider>
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
