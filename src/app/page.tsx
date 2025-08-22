"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { ChatInterface } from "./components/ChatInterface/ChatInterface";
import { TasksFilesSidebar } from "./components/TasksFilesSidebar/TasksFilesSidebar";
import { SubAgentPanel } from "./components/SubAgentPanel/SubAgentPanel";
import { FileViewDialog } from "./components/FileViewDialog/FileViewDialog";
import { AgentSelector } from "./components/AgentSelector/AgentSelector";
import { createClientForAgent } from "@/lib/client";
import { useAuthContext } from "@/providers/Auth";
import { AVAILABLE_AGENTS, getDefaultAgent } from "@/lib/agents/config";
import type {
  SubAgent,
  FileItem,
  TodoItem,
  Agent,
  AgentContext,
} from "./types/types";
import styles from "./page.module.scss";

export default function HomePage() {
  const { session } = useAuthContext();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [currentAgent, setCurrentAgent] = useState<Agent>(getDefaultAgent());
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingThreadState, setIsLoadingThreadState] = useState(false);


  const [agentContexts, setAgentContexts] = useState<
    Record<string, AgentContext>
  >({});

  const currentContext = useMemo(() => {
    return (
      agentContexts[currentAgent.id] || {
        agent: currentAgent,
        threadId: null,
        todos: [],
        files: {},
        selectedSubAgent: null,
      }
    );
  }, [agentContexts, currentAgent.id, currentAgent]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleAgentChange = useCallback(
    (newAgent: Agent) => {
      if (newAgent.id === currentAgent.id) return;

      setAgentContexts((prev) => {
        const currentCtx = prev[currentAgent.id] || {
          agent: currentAgent,
          threadId: null,
          todos: [],
          files: {},
          selectedSubAgent: null,
        };

        const updatedContexts = {
          ...prev,
          [currentAgent.id]: {
            ...currentCtx,
            threadId: threadId,
          },
        };

        const newContext = updatedContexts[newAgent.id];
        if (newContext) {
          setThreadId(newContext.threadId);
        } else {
          setThreadId(null);
        }

        return updatedContexts;
      });

      setCurrentAgent(newAgent);

      setSelectedFile(null);
    },
    [currentAgent.id, threadId, setThreadId, currentAgent]
  );

  const updateCurrentContext = useCallback(
    (updates: Partial<AgentContext>) => {
      setAgentContexts((prev) => {
        const existingContext = prev[currentAgent.id] || {
          agent: currentAgent,
          threadId: null,
          todos: [],
          files: {},
          selectedSubAgent: null,
        };

        return {
          ...prev,
          [currentAgent.id]: {
            ...existingContext,
            ...updates,
          },
        };
      });
    },
    [currentAgent.id, currentAgent]
  );

  // When the threadId changes, grab the thread state from the graph server
  useEffect(() => {
    const fetchThreadState = async () => {
      if (!threadId || !session?.accessToken) {
        updateCurrentContext({ todos: [], files: {} });
        setIsLoadingThreadState(false);
        return;
      }
      setIsLoadingThreadState(true);
      try {
        const client = createClientForAgent(
          session.accessToken,
          currentAgent.id
        );
        const state = await client.threads.getState(threadId);

        if (state.values) {
          const currentState = state.values as {
            todos?: TodoItem[];
            files?: Record<string, string>;
          };
          updateCurrentContext({
            todos: currentState.todos || [],
            files: currentState.files || {},
          });
        }
      } catch (error) {
        console.error("Failed to fetch thread state:", error);
        updateCurrentContext({ todos: [], files: {} });
      } finally {
        setIsLoadingThreadState(false);
      }
    };
    fetchThreadState();
  }, [threadId, session?.accessToken, currentAgent.id, updateCurrentContext]);

  const handleNewThread = useCallback(() => {
    setThreadId(null);
    updateCurrentContext({
      threadId: null,
      selectedSubAgent: null,
      todos: [],
      files: {},
    });
  }, [setThreadId, updateCurrentContext]);

  const handleTodosUpdate = useCallback(
    (todos: TodoItem[]) => {
      updateCurrentContext({ todos });
    },
    [updateCurrentContext]
  );

  const handleFilesUpdate = useCallback(
    (files: Record<string, string>) => {
      updateCurrentContext({ files });
    },
    [updateCurrentContext]
  );

  const handleSelectSubAgent = useCallback(
    (subAgent: SubAgent) => {
      updateCurrentContext({ selectedSubAgent: subAgent });
    },
    [updateCurrentContext]
  );

  return (
    <div className={styles.container}>
      <TasksFilesSidebar
        todos={currentContext.todos}
        files={currentContext.files}
        onFileClick={setSelectedFile}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className={styles.mainContent}>
        <div className={styles.agentHeader}>
          <AgentSelector
            availableAgents={AVAILABLE_AGENTS}
            currentAgent={currentAgent}
            onAgentChange={handleAgentChange}
            disabled={isLoadingThreadState}
          />
        </div>
        <ChatInterface
          agent={currentAgent}
          threadId={threadId}
          selectedSubAgent={currentContext.selectedSubAgent}
          setThreadId={setThreadId}
          onSelectSubAgent={handleSelectSubAgent}
          onTodosUpdate={handleTodosUpdate}
          onFilesUpdate={handleFilesUpdate}
          onNewThread={handleNewThread}
          isLoadingThreadState={isLoadingThreadState}
        />
        {currentContext.selectedSubAgent && (
          <SubAgentPanel
            subAgent={currentContext.selectedSubAgent}
            onClose={() => updateCurrentContext({ selectedSubAgent: null })}
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
