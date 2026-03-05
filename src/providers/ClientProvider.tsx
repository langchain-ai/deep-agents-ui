"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { Client } from "@langchain/langgraph-sdk";

interface ClientContextValue {
  client: Client;
}

const ClientContext = createContext<ClientContextValue | null>(null);

interface ClientProviderProps {
  children: ReactNode;
  deploymentUrl: string;
  apiKey: string;
  /** Authorization header from incoming request (e.g. from auth proxy). Forwarded as-is when present. */
  authorizationHeader?: string;
}

export function ClientProvider({
  children,
  deploymentUrl,
  apiKey,
  authorizationHeader,
}: ClientProviderProps) {
  const client = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    };
    if (authorizationHeader) {
      headers["Authorization"] = authorizationHeader;
    }
    return new Client({
      apiUrl: deploymentUrl,
      defaultHeaders: headers,
    });
  }, [deploymentUrl, apiKey, authorizationHeader]);

  const value = useMemo(() => ({ client }), [client]);

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient(): Client {
  const context = useContext(ClientContext);

  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context.client;
}
