"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, MessageSquare, X, Trash2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useConversations, type ConversationItem, useDeleteConversation } from "@/app/hooks/useConversations";
import { useAuth } from "@/providers/AuthProvider";
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
  idle: "bg-green-500",
  busy: "bg-blue-500",
  interrupted: "bg-orange-500",
  error: "bg-red-600",
};

function getStatusColor(status: Conversation["status"]): string {
  return STATUS_COLORS[status] ?? "bg-gray-400";
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
      <p className="text-sm text-red-600">Failed to load conversations</p>
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
      <MessageSquare className="mb-2 h-12 w-12 text-gray-300" />
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

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header */}
      <div className="grid flex-shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-b border-border p-4">
        <h2 className="text-lg font-semibold tracking-tight">Conversations</h2>
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
          <div className="box-border w-full max-w-full overflow-hidden p-2">
            {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map(
              (group) => {
                const groupConversations = grouped[group];
                if (groupConversations.length === 0) return null;

                return (
                  <div key={group} className="mb-4">
                    <h4 className="m-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {GROUP_LABELS[group]}
                    </h4>
                    <div className="flex flex-col gap-1">
                      {groupConversations.map((conv) => (
                        <button
                          key={conv.cid}
                          type="button"
                          onClick={() => onSelect(conv.cid)}
                          className={cn(
                            "group grid w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-200",
                            "hover:bg-accent",
                            currentCid === conv.cid
                              ? "border border-primary bg-accent hover:bg-accent"
                              : "border border-transparent bg-transparent"
                          )}
                          aria-current={currentCid === conv.cid}
                        >
                          <div className="min-w-0 flex-1">
                            {/* Title + Timestamp Row */}
                            <div className="mb-1 flex items-center justify-between">
                              <h3 className="truncate text-sm font-semibold">
                                {conv.title}
                              </h3>
                              <div className="ml-2 flex items-center gap-2">
                                <span className="flex-shrink-0 text-xs text-muted-foreground">
                                  {formatTime(conv.updatedAt)}
                                </span>
                                <button
                                  onClick={(e) => handleDelete(e, conv.cid)}
                                  disabled={deletingId === conv.cid}
                                  className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete conversation"
                                >
                                  {deletingId === conv.cid ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {/* Description + Status Row */}
                            <div className="flex items-center justify-between">
                              <p className="flex-1 truncate text-sm text-muted-foreground">
                                {conv.description}
                              </p>
                              <div className="ml-2 flex-shrink-0">
                                <div
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    getStatusColor(conv.status)
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
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
