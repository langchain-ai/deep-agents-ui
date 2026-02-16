"use client";

import { createContext, useContext } from "react";
import { Client } from "@langchain/langgraph-sdk";

interface ClientContextValue {
  client: Client;
}

export const ClientContext = createContext<ClientContextValue | null>(null);

export function useClient(): Client {
  const context = useContext(ClientContext);

  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context.client;
}
