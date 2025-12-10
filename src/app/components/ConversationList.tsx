"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, MessageSquare, X, Trash2, Pencil, Check } from "lucide-react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useConversations, type ConversationItem, useDeleteConversation } from "@/hooks/useConversations";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type { Conversation } from "@/app/types/types";

type StatusFilter = "all" | "idle" | "busy" | "interrupted" | "error";

const GROUP_LABELS = {
  interrupted: "Requiring Attention",
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  older: "Older",
} as const;

const STATUS_COLORS: Record<Conversation["status"], string> = {
  idle: "bg-green-500 dark:bg-green-400",
  busy: "bg-blue-500 dark:bg-blue-400",
  interrupted: "bg-orange-500 dark:bg-orange-400",
  error: "bg-red-600 dark:bg-red-400",
};

function getStatusColor(status: Conversation["status"]): string {
  return STATUS_COLORS[status] ?? "bg-muted-foreground";
}

function formatTime(date: Date, now = new Date()): string {
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return format(date, "HH:mm");
  if (days === 1) return "Yesterday";
  if (days < 7) return format(date, "EEEE");
  return format(date, "MM/dd");
}

function StatusFilterItem({
  status,
  label,
  badge,
}: {
  status: Conversation["status"];
  label: string;
  badge?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("inline-block size-2 rounded-full", getStatusColor(status))}
      />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </span>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-destructive">Failed to load conversations</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <MessageSquare className="mb-2 h-12 w-12 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No conversations found</p>
    </div>
  );
}

interface ConversationListProps {
  onSelect: (cid: string) => void;
  onMutateReady?: (mutate: () => void) => void;
  onClose?: () => void;
}

export function ConversationList({
  onSelect,
  onMutateReady,
  onClose,
}: ConversationListProps) {
  const [currentCid] = useQueryState("cid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // 编辑标题状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 从 AuthProvider 获取认证状态
  const { token, isAuthenticated } = useAuth();

  const { deleteConversation } = useDeleteConversation();

  const {
    conversations,
    isLoading,
    isValidating,
    error,
    hasMore,
    loadMore,
    mutate,
  } = useConversations({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 20,
    isAuthenticated,
    token,
  });

  const isEmpty = !isLoading && conversations.length === 0;

  // Group conversations by time and status
  const grouped = useMemo(() => {
    const now = new Date();
    const groups: Record<keyof typeof GROUP_LABELS, ConversationItem[]> = {
      interrupted: [],
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    conversations.forEach((conv) => {
      if (conv.status === "interrupted") {
        groups.interrupted.push(conv);
        return;
      }

      const diff = now.getTime() - conv.updatedAt.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        groups.today.push(conv);
      } else if (days === 1) {
        groups.yesterday.push(conv);
      } else if (days < 7) {
        groups.week.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  const interruptedCount = useMemo(() => {
    return conversations.filter((c) => c.status === "interrupted").length;
  }, [conversations]);

  // Expose conversation list revalidation to parent component
  const onMutateReadyRef = useRef(onMutateReady);
  const mutateRef = useRef(mutate);

  useEffect(() => {
    onMutateReadyRef.current = onMutateReady;
  }, [onMutateReady]);

  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  const mutateFn = useCallback(() => {
    mutateRef.current();
  }, []);

  useEffect(() => {
    onMutateReadyRef.current?.(mutateFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (e: React.MouseEvent, cid: string) => {
      e.stopPropagation();
      if (deletingId) return;

      setDeletingId(cid);
      try {
        await deleteConversation(cid);
        mutate();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, deleteConversation, mutate]
  );

  // Handle edit title
  const handleStartEdit = useCallback(
    (e: React.MouseEvent, conv: ConversationItem) => {
      e.stopPropagation();
      setEditingId(conv.cid);
      setEditingTitle(conv.title);
      // 聚焦输入框
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingTitle("");
  }, []);

  const handleSaveTitle = useCallback(
    async (e?: React.MouseEvent | React.FormEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      
      if (!editingId || isSavingTitle) return;
      
      const trimmedTitle = editingTitle.trim();
      if (!trimmedTitle) {
        handleCancelEdit();
        return;
      }

      setIsSavingTitle(true);
      try {
        await apiClient.updateConversation(editingId, { title: trimmedTitle });
        mutate();
        setEditingId(null);
        setEditingTitle("");
      } catch (error) {
        console.error("Failed to update conversation title:", error);
      } finally {
        setIsSavingTitle(false);
      }
    },
    [editingId, editingTitle, isSavingTitle, mutate, handleCancelEdit]
  );

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveTitle();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveTitle, handleCancelEdit]
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header */}
      <div className="grid flex-shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-b border-border p-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Conversations</h2>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Active</SelectLabel>
                <SelectItem value="idle">
                  <StatusFilterItem status="idle" label="Idle" />
                </SelectItem>
                <SelectItem value="busy">
                  <StatusFilterItem status="busy" label="Busy" />
                </SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Attention</SelectLabel>
                <SelectItem value="interrupted">
                  <StatusFilterItem
                    status="interrupted"
                    label="Interrupted"
                    badge={interruptedCount}
                  />
                </SelectItem>
                <SelectItem value="error">
                  <StatusFilterItem status="error" label="Error" />
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close conversations sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-0 flex-1">
        {error && <ErrorState message={error.message} />}

        {!error && isLoading && <LoadingState />}

        {!error && !isLoading && isEmpty && <EmptyState />}

        {!error && !isEmpty && (
          <div className="w-full px-3 py-2">
            {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map(
              (group) => {
                const groupConversations = grouped[group];
                if (groupConversations.length === 0) return null;

                return (
                  <div key={group} className="mb-5">
                    <h4 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {GROUP_LABELS[group]}
                    </h4>
                    <div className="flex flex-col">
                      {groupConversations.map((conv, index) => {
                        const isSelected = currentCid === conv.cid;
                        const isLast = index === groupConversations.length - 1;
                        return (
                          <div
                            key={conv.cid}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelect(conv.cid)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelect(conv.cid);
                              }
                            }}
                            className={cn(
                              "group relative cursor-pointer px-3 py-3 text-left transition-all duration-150",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                              !isLast && "border-b border-border/50",
                              isSelected
                                ? "bg-primary/8"
                                : "hover:bg-muted/50"
                            )}
                            aria-current={isSelected}
                          >
                            {/* 选中指示器 */}
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                            )}
                            
                            <div className="min-w-0 pl-1">
                              {/* Title + Status Row */}
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  {/* 状态指示器 */}
                                  <div
                                    className={cn(
                                      "h-2 w-2 flex-shrink-0 rounded-full",
                                      getStatusColor(conv.status)
                                    )}
                                    title={conv.status}
                                  />
                                  {/* 编辑模式或显示模式 */}
                                  {editingId === conv.cid ? (
                                    <form 
                                      onSubmit={handleSaveTitle}
                                      className="flex min-w-0 flex-1 items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Input
                                        ref={editInputRef}
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={handleEditKeyDown}
                                        onBlur={() => {
                                          // 延迟取消，以便点击保存按钮时不会立即取消
                                          setTimeout(() => {
                                            if (!isSavingTitle) {
                                              handleCancelEdit();
                                            }
                                          }, 150);
                                        }}
                                        className="h-7 min-w-0 flex-1 text-sm"
                                        placeholder="Enter title..."
                                        disabled={isSavingTitle}
                                      />
                                      <button
                                        type="submit"
                                        disabled={isSavingTitle}
                                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10"
                                        title="Save"
                                      >
                                        {isSavingTitle ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </form>
                                  ) : (
                                    <h3 className={cn(
                                      "truncate text-sm font-medium",
                                      isSelected
                                        ? "text-primary"
                                        : "text-foreground"
                                    )}>
                                      {conv.title}
                                    </h3>
                                  )}
                                </div>
                                {/* 操作按钮 - 只在非编辑模式显示 */}
                                {editingId !== conv.cid && (
                                  <div className="flex flex-shrink-0 items-center gap-1">
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatTime(conv.updatedAt)}
                                    </span>
                                    {/* 编辑按钮 */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleStartEdit(e, conv)}
                                      className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded opacity-0 transition-all",
                                        "group-hover:opacity-100",
                                        "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                      )}
                                      title="Edit title"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    {/* 删除按钮 */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleDelete(e, conv.cid)}
                                      disabled={deletingId === conv.cid}
                                      className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded opacity-0 transition-all",
                                        "group-hover:opacity-100",
                                        "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                      )}
                                      title="Delete conversation"
                                    >
                                      {deletingId === conv.cid ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                              {/* Description Row */}
                              <p className="line-clamp-1 pl-4 text-xs text-muted-foreground">
                                {conv.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}

            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
