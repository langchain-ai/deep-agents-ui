"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon, SquarePen, Copy, MessageCircle, LogOut, User } from "lucide-react";
import { ChatProvider, useChatContext } from "@/providers/ChatProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ChatInterface } from "@/app/components/ChatInterface";
import { LeftSidebar } from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { ConversationList } from "@/app/components/ConversationList";
import { SettingsDialog } from "@/app/components/SettingsDialog";
import { useConversations } from "@/hooks/useConversations";

// ============ 主题切换 Hook ============
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 初始化时读取保存的主题或系统偏好
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-joy-color-scheme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-joy-color-scheme", "light");
    }
  };

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  return { theme, toggleTheme };
}

// ============ 主内容组件 ============
function MainContent({
  showAllChats,
  setShowAllChats,
}: {
  showAllChats: boolean;
  setShowAllChats: (show: boolean) => void;
}) {
  const { todos, files, setFiles, isLoading, interrupt, cid, startNewChat, switchConversation } = useChatContext();

  return (
    <div className="flex flex-1 gap-3 overflow-hidden bg-muted p-3">
      {/* Left Sidebar */}
      <div className="w-[240px] flex-shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <LeftSidebar todos={todos} />
      </div>

      {/* Main Chat Area */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        {/* Chat Header */}
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <Copy size={14} />
              Copy
            </button>
            <button
              onClick={() => setShowAllChats(!showAllChats)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MessageCircle size={14} />
              All Chats
            </button>
            <button
              onClick={startNewChat}
              disabled={!cid}
              style={{ backgroundColor: 'hsl(173, 58%, 35%)' }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <SquarePen size={14} />
              New Chat
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-1 flex-col">
            <ChatInterface />
          </div>

          {/* All Chats Overlay */}
          {showAllChats && (
            <div className="absolute inset-0 z-10 bg-card">
              <ConversationList
                onSelect={(selectedCid) => {
                  // 立即关闭列表，然后切换会话（异步加载历史）
                  setShowAllChats(false);
                  switchConversation(selectedCid);
                }}
                onClose={() => setShowAllChats(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] flex-shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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

// ============ 认证后的主页 ============
function AuthenticatedHome() {
  const router = useRouter();
  const { user, logout, token, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAllChats, setShowAllChats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // 在顶层使用 useConversations hook，确保 mutate 始终可用
  const { mutate: mutateConversations } = useConversations({
    isAuthenticated,
    token,
  });

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.svg"
              alt="SeenOS"
              width={28}
              height={28}
              priority
            />
            <h1 className="text-base font-semibold text-foreground">SeenOS</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* User Info */}
            {user && (
              <div className="mr-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User size={16} />
                </div>
                <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="rounded-md p-2 hover:bg-accent"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? (
                <Sun size={18} className="text-muted-foreground" />
              ) : (
                <Moon size={18} className="text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-2 hover:bg-accent"
              title="Settings"
            >
              <svg
                className="h-[18px] w-[18px] text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-md p-2 hover:bg-accent"
              title="Logout"
            >
              <LogOut size={18} className="text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <ChatProvider onHistoryRevalidate={() => mutateConversations()}>
          <MainContent
            showAllChats={showAllChats}
            setShowAllChats={setShowAllChats}
          />
        </ChatProvider>
      </div>
    </>
  );
}

// ============ 认证检查包装器 ============
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// ============ 主页内容 ============
function HomePageContent() {
  return (
    <AuthGuard>
      <AuthenticatedHome />
    </AuthGuard>
  );
}

// ============ 导出的主页组件 ============
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
