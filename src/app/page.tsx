"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Sun, SquarePen, Copy, MessageCircle, LogOut, User } from "lucide-react";
import { ChatProvider, useChatContext } from "@/providers/ChatProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ChatInterface } from "@/app/components/ChatInterface";
import { LeftSidebar } from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { ConversationList } from "@/app/components/ConversationList";
import { SettingsDialog } from "@/app/components/SettingsDialog";

// ============ 主内容组件 ============
function MainContent({
  showAllChats,
  setShowAllChats,
  onConversationListReady,
}: {
  showAllChats: boolean;
  setShowAllChats: (show: boolean) => void;
  onConversationListReady: (mutate: () => void) => void;
}) {
  const { todos, files, setFiles, isLoading, interrupt, cid, setCid } = useChatContext();

  return (
    <div className="flex flex-1 gap-3 overflow-hidden bg-gray-100 p-3">
      {/* Left Sidebar */}
      <div className="w-[240px] flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <LeftSidebar todos={todos} />
      </div>

      {/* Main Chat Area */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        style={{ maxWidth: "calc(100% - 560px)" }}
      >
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
              onClick={() => setCid(null)}
              disabled={!cid}
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
            <ChatInterface />
          </div>

          {/* All Chats Overlay */}
          {showAllChats && (
            <div className="absolute inset-0 z-10 bg-white">
              <ConversationList
                onSelect={async (selectedCid) => {
                  await setCid(selectedCid);
                  setShowAllChats(false);
                }}
                onMutateReady={onConversationListReady}
                onClose={() => setShowAllChats(false)}
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

// ============ 认证后的主页 ============
function AuthenticatedHome() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [showAllChats, setShowAllChats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mutateConversations, setMutateConversations] = useState<(() => void) | null>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="flex h-screen flex-col bg-white">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <h1 className="text-base font-semibold text-gray-800">Deep Agent UI</h1>
          <div className="flex items-center gap-2">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2 mr-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-600">
                  <User size={16} />
                </div>
                <span className="text-sm text-gray-600">{user.name || user.email}</span>
              </div>
            )}

            <button className="rounded-md p-2 hover:bg-gray-100">
              <Sun size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-2 hover:bg-gray-100"
              title="Settings"
            >
              <svg
                className="w-[18px] h-[18px] text-gray-500"
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
              className="rounded-md p-2 hover:bg-gray-100"
              title="Logout"
            >
              <LogOut size={18} className="text-gray-500" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <ChatProvider onHistoryRevalidate={() => mutateConversations?.()}>
          <MainContent
            showAllChats={showAllChats}
            setShowAllChats={setShowAllChats}
            onConversationListReady={(fn) => setMutateConversations(() => fn)}
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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
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
    <AuthProvider>
      <AuthGuard>
        <AuthenticatedHome />
      </AuthGuard>
    </AuthProvider>
  );
}

// ============ 导出的主页组件 ============
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
