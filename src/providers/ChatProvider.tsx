"use client";

import { ReactNode } from "react";
import { Assistant } from "@langchain/langgraph-sdk";
import { type StateType, useChat } from "@/app/hooks/useChat";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import { ChatContext } from "./ChatContext";

interface ChatProviderProps {
  children: ReactNode;
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
}

export function ChatProvider({
  children,
  activeAssistant,
  onHistoryRevalidate,
  thread,
}: ChatProviderProps) {
  const chat = useChat({ activeAssistant, onHistoryRevalidate, thread });
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

