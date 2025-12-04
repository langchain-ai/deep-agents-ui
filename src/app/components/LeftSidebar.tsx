"use client";

import React, { useMemo } from "react";
import { Plus, CheckCircle, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from "@/app/types/types";

interface LeftSidebarProps {
  todos: TodoItem[];
}

const getStatusIcon = (status: TodoItem["status"], className?: string) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle
          size={14}
          className={cn("text-emerald-500", className)}
        />
      );
    case "in_progress":
      return (
        <Clock
          size={14}
          className={cn("text-amber-500", className)}
        />
      );
    default:
      return (
        <Circle
          size={14}
          className={cn("text-gray-400", className)}
        />
      );
  }
};

export const LeftSidebar = React.memo<LeftSidebarProps>(({ todos }) => {
  const groupedTodos = useMemo(() => {
    return {
      in_progress: todos.filter((t) => t.status === "in_progress"),
      pending: todos.filter((t) => t.status === "pending"),
      completed: todos.filter((t) => t.status === "completed"),
    };
  }, [todos]);

  const activeCount = groupedTodos.in_progress.length + groupedTodos.pending.length;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Context Section - Takes up ~50% of height */}
      <div className="flex h-1/2 flex-shrink-0 flex-col border-b border-gray-100 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Context</span>
          </div>
          <button className="rounded p-1 hover:bg-gray-100">
            <Plus size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-xs text-gray-400">
            Context library coming soon
          </p>
        </div>
      </div>

      {/* Tasks Section - Takes up all remaining space */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-2 flex flex-shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Tasks</span>
          </div>
          <span className="text-xs text-gray-400">{activeCount} active</span>
        </div>

        {/* Tasks List - Scrollable, no horizontal scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {todos.length === 0 ? (
            <p className="py-2 text-center text-xs text-gray-400">No tasks yet</p>
          ) : (
            <div className="space-y-2 pr-1">
              {/* In Progress */}
              {groupedTodos.in_progress.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    IN PROGRESS
                  </div>
                  <div className="space-y-1">
                    {groupedTodos.in_progress.map((todo, index) => (
                      <div
                        key={`in_progress_${todo.id}_${index}`}
                        className="flex min-w-0 items-start gap-2"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(todo.status)}
                        </div>
                        <span className="min-w-0 break-words text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere]">
                          {todo.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {groupedTodos.pending.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    PENDING
                  </div>
                  <div className="space-y-1">
                    {groupedTodos.pending.map((todo, index) => (
                      <div
                        key={`pending_${todo.id}_${index}`}
                        className="flex min-w-0 items-start gap-2"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(todo.status)}
                        </div>
                        <span className="min-w-0 break-words text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere]">
                          {todo.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {groupedTodos.completed.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    COMPLETED
                  </div>
                  <div className="space-y-1">
                    {groupedTodos.completed.map((todo, index) => (
                      <div
                        key={`completed_${todo.id}_${index}`}
                        className="flex min-w-0 items-start gap-2"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(todo.status)}
                        </div>
                        <span className="min-w-0 break-words text-xs leading-relaxed text-gray-400 line-through [overflow-wrap:anywhere]">
                          {todo.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LeftSidebar.displayName = "LeftSidebar";
