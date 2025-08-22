"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { ChatInterface } from "./components/ChatInterface/ChatInterface";
import { TasksFilesSidebar } from "./components/TasksFilesSidebar/TasksFilesSidebar";
import { SubAgentPanel } from "./components/SubAgentPanel/SubAgentPanel";
import { FileViewDialog } from "./components/FileViewDialog/FileViewDialog";
import { createClient } from "@/lib/client";
import { useEnvConfig } from "@/providers/EnvConfig";
import type { SubAgent, FileItem, TodoItem } from "./types/types";
import { Assistant } from "@langchain/langgraph-sdk";
import { useChat } from "./hooks/useChat";
import { toast } from "sonner";

export default function HomePage() {
  const { config } = useEnvConfig();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [selectedSubAgent, setSelectedSubAgent] = useState<SubAgent | null>(
    null,
  );
  const [debugMode, setDebugMode] = useState(true);
  const [activeAssistant, setActiveAssistant] = useState<Assistant | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isLoadingThreadState, setIsLoadingThreadState] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const deploymentUrl = config?.DEPLOYMENT_URL || "";
  const langsmithApiKey = config?.LANGSMITH_API_KEY || "filler-token";
  const assistantId = config?.ASSISTANT_ID || "";

  const client = useMemo(() => {
    return createClient(deploymentUrl, langsmithApiKey);
  }, [deploymentUrl, langsmithApiKey]);

  const refreshActiveAssistant = useCallback(async () => {
    if (!assistantId || !deploymentUrl) {
      setActiveAssistant(null);
      setAssistantError(null);
      return;
    }
    setAssistantError(null);
    try {
      const assistant = await client.assistants.get(assistantId);
      setActiveAssistant(assistant);
      setAssistantError(null);
      toast.dismiss();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setActiveAssistant(null);
      setAssistantError(errorMessage);
      toast.dismiss();
      toast.error("Failed to load assistant", {
        description: `Could not connect to assistant: ${errorMessage}`,
        duration: 50000,
      });
    }
  }, [client, assistantId, deploymentUrl]);

  useEffect(() => {
    refreshActiveAssistant();
  }, [refreshActiveAssistant]);

  // When the threadId changes, grab the thread state from the graph server
  useEffect(() => {
    const fetchThreadState = async () => {
      // TODO: Potentially remove the langsmithApiKey check
      if (!threadId || !langsmithApiKey) {
        setTodos([]);
        setFiles({});
        setIsLoadingThreadState(false);
        return;
      }
      setIsLoadingThreadState(true);
      try {
        const state = await client.threads.getState(threadId);
        if (state.values) {
          const currentState = state.values as {
            todos?: TodoItem[];
            files?: Record<string, string>;
          };
          setTodos(currentState.todos || []);
          setFiles(currentState.files || {});
        }
      } catch (error) {
        console.error("Failed to fetch thread state:", error);
        setTodos([]);
        setFiles({});
      } finally {
        setIsLoadingThreadState(false);
      }
    };
    fetchThreadState();
  }, [threadId, client, langsmithApiKey]);

  const handleNewThread = useCallback(() => {
    setThreadId(null);
    setSelectedSubAgent(null);
    setTodos([]);
    setFiles({});
  }, [setThreadId]);

  const {
    messages,
    isLoading,
    interrupt,
    getMessagesMetadata,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
  } = useChat(threadId, setThreadId, setTodos, setFiles, activeAssistant);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
      }}
    >
      <TasksFilesSidebar
        threadId={threadId}
        messages={messages}
        todos={todos}
        files={files}
        activeAssistant={activeAssistant}
        onFileClick={setSelectedFile}
        onAssistantUpdate={refreshActiveAssistant}
        assistantError={assistantError}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          minWidth: 0,
          position: "relative",
        }}
      >
        <ChatInterface
          threadId={threadId}
          messages={messages}
          isLoading={isLoading}
          sendMessage={sendMessage}
          stopStream={stopStream}
          getMessagesMetadata={getMessagesMetadata}
          selectedSubAgent={selectedSubAgent}
          setThreadId={setThreadId}
          onSelectSubAgent={setSelectedSubAgent}
          onNewThread={handleNewThread}
          isLoadingThreadState={isLoadingThreadState}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          runSingleStep={runSingleStep}
          continueStream={continueStream}
          interrupt={interrupt}
          assistantError={assistantError}
        />
        {selectedSubAgent && (
          <SubAgentPanel
            subAgent={selectedSubAgent}
            onClose={() => setSelectedSubAgent(null)}
          />
        )}
      </div>
      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
