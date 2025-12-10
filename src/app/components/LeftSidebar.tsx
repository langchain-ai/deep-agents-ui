"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { Plus, CheckCircle, Circle, Clock, XCircle, FileText, File, Loader2, Trash2, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from "@/app/types/types";
import { useContextFiles } from "@/providers/ContextProvider";
import { toast } from "sonner";
import { ContextFilePreview } from "./ContextFilePreview";
import type { ContextFile } from "@/lib/api/client";

// 文件类型图标映射
const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  txt: <FileText className="h-3.5 w-3.5 text-gray-500" />,
  md: <FileText className="h-3.5 w-3.5 text-blue-500" />,
  pdf: <File className="h-3.5 w-3.5 text-red-500" />,
  docx: <File className="h-3.5 w-3.5 text-blue-600" />,
};

// 状态图标映射
const FILE_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3 text-yellow-500" />,
  processing: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
  ready: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  error: <AlertCircle className="h-3 w-3 text-red-500" />,
};

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface LeftSidebarProps {
  todos: TodoItem[];
}

const getStatusIcon = (status: TodoItem["status"], className?: string) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle
          size={14}
          className={cn("text-green-500 dark:text-green-400", className)}
        />
      );
    case "in_progress":
      return (
        <Clock
          size={14}
          className={cn("text-amber-500 dark:text-amber-400", className)}
        />
      );
    case "failed":
      return (
        <XCircle
          size={14}
          className={cn("text-red-500 dark:text-red-400", className)}
        />
      );
    default:
      return (
        <Circle
          size={14}
          className={cn("text-muted-foreground", className)}
        />
      );
  }
};

export const LeftSidebar = React.memo<LeftSidebarProps>(({ todos }) => {
  const {
    files,
    isLoading: isLoadingFiles,
    isUploading,
    uploadFile,
    deleteFile,
    readyFilesCount,
  } = useContextFiles();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ContextFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];
    const result = await uploadFile(file);
    
    if (result) {
      toast.success("File uploaded successfully");
    } else {
      toast.error("Failed to upload file");
    }

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFile]);

  const handleDelete = useCallback(async (contextId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(contextId);
    const success = await deleteFile(contextId);
    if (success) {
      toast.success("File deleted");
    } else {
      toast.error("Failed to delete file");
    }
    setDeletingId(null);
  }, [deleteFile]);

  const handleFileClick = useCallback((file: ContextFile) => {
    if (file.status === "ready") {
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  }, []);

  const groupedTodos = useMemo(() => {
    return {
      in_progress: todos.filter((t) => t.status === "in_progress"),
      pending: todos.filter((t) => t.status === "pending"),
      completed: todos.filter((t) => t.status === "completed"),
      failed: todos.filter((t) => t.status === "failed"),
    };
  }, [todos]);

  const activeCount = groupedTodos.in_progress.length + groupedTodos.pending.length;

  return (
    <>
    <div className="flex h-full flex-col bg-card">
      {/* Context Section - Takes up ~50% of height */}
      <div className="flex h-1/2 flex-shrink-0 flex-col border-b border-border p-4">
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
              className="text-muted-foreground"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span className="text-sm font-medium text-foreground">Context</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded p-1 hover:bg-accent disabled:opacity-50"
            title="Upload file"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            ) : (
              <Plus size={16} className="text-muted-foreground" />
            )}
          </button>
        </div>
        
        {/* Context Files List */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {isLoadingFiles ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-center text-xs text-muted-foreground">
                No documents yet
              </p>
              <p className="mt-1 text-center text-[10px] text-muted-foreground/70">
                Click + to upload
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={cn(
                    "group flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/50",
                    file.status === "ready" && "cursor-pointer"
                  )}
                >
                  <div className="flex-shrink-0">
                    {FILE_TYPE_ICONS[file.fileType] || <File className="h-3.5 w-3.5 text-gray-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      {FILE_STATUS_ICONS[file.status]}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {file.status === "ready" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(file);
                        }}
                        className="rounded p-0.5 hover:bg-accent"
                        title="View content"
                      >
                        <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(file.id, e)}
                      disabled={deletingId === file.id}
                      className="rounded p-0.5 hover:bg-destructive/10"
                      title="Delete file"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {readyFilesCount > 0 && (
                <p className="pt-1 text-center text-[10px] text-muted-foreground">
                  {readyFilesCount} file{readyFilesCount !== 1 ? 's' : ''} ready
                </p>
              )}
            </div>
          )}
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
              className="text-muted-foreground"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="text-sm font-medium text-foreground">Tasks</span>
          </div>
          <span className="text-xs text-muted-foreground">{activeCount} active</span>
        </div>

        {/* Tasks List - Scrollable, no horizontal scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {todos.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No tasks yet</p>
          ) : (
            <div className="space-y-2 pr-1">
              {/* In Progress */}
              {groupedTodos.in_progress.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        <span className="min-w-0 break-words text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
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
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        <span className="min-w-0 break-words text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                          {todo.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed */}
              {groupedTodos.failed.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                    FAILED
                  </div>
                  <div className="space-y-1">
                    {groupedTodos.failed.map((todo, index) => (
                      <div
                        key={`failed_${todo.id}_${index}`}
                        className="flex min-w-0 items-start gap-2"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(todo.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="break-words text-xs leading-relaxed text-red-600 dark:text-red-400 [overflow-wrap:anywhere]">
                            {todo.content}
                          </span>
                          {todo.error && (
                            <p className="mt-0.5 text-[10px] text-red-500/80 dark:text-red-400/80">
                              {todo.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {groupedTodos.completed.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        <span className="min-w-0 break-words text-xs leading-relaxed text-muted-foreground line-through [overflow-wrap:anywhere]">
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

    {/* File Preview Dialog */}
    <ContextFilePreview
      file={previewFile}
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    />
    </>
  );
});

LeftSidebar.displayName = "LeftSidebar";
