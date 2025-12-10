"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ContextProvider } from "./ContextProvider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * 客户端 Providers 包装器
 * 用于在服务器组件 (layout.tsx) 中包裹客户端 context providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ContextProvider>
        {children}
      </ContextProvider>
    </AuthProvider>
  );
}

