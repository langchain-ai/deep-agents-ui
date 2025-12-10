"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  File,
  Loader2,
  Download,
  X,
  Layers,
  FileType,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContextFiles } from "@/providers/ContextProvider";
import type { ContextFile } from "@/lib/api/client";
import { toast } from "sonner";

// 文件类型图标映射
const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  txt: <FileText className="h-5 w-5 text-gray-500" />,
  md: <FileText className="h-5 w-5 text-blue-500" />,
  pdf: <File className="h-5 w-5 text-red-500" />,
  docx: <File className="h-5 w-5 text-blue-600" />,
};

interface ContextFilePreviewProps {
  file: ContextFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewMode = "content" | "chunks";

export function ContextFilePreview({ file, open, onOpenChange }: ContextFilePreviewProps) {
  const { getFileContent, getFileChunks, downloadFile } = useContextFiles();
  
  const [viewMode, setViewMode] = useState<ViewMode>("content");
  const [content, setContent] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Array<{ index: number; content: string }> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 加载文件内容
  const loadContent = useCallback(async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (viewMode === "content") {
        const response = await getFileContent(file.id);
        if (response) {
          setContent(response.content);
        } else {
          setError("Failed to load file content");
        }
      } else {
        const response = await getFileChunks(file.id);
        if (response) {
          setChunks(response.chunks);
        } else {
          setError("Failed to load file chunks");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setIsLoading(false);
    }
  }, [file, viewMode, getFileContent, getFileChunks]);

  // 当文件或视图模式变化时重新加载
  useEffect(() => {
    if (open && file) {
      setContent(null);
      setChunks(null);
      loadContent();
    }
  }, [open, file, viewMode, loadContent]);

  // 处理下载
  const handleDownload = useCallback(async () => {
    if (!file) return;
    
    setIsDownloading(true);
    try {
      await downloadFile(file.id, file.filename);
      toast.success("File downloaded successfully");
    } catch (err) {
      toast.error("Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  }, [file, downloadFile]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {FILE_TYPE_ICONS[file.fileType] || <File className="h-5 w-5 text-gray-500" />}
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {file.filename}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {file.chunkCount} chunks • {file.fileType.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* View Mode Tabs */}
        <div className="flex flex-shrink-0 gap-1 border-b border-border bg-muted/30 px-6 py-2">
          <button
            onClick={() => setViewMode("content")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "content"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileType className="h-4 w-4" />
            Full Content
          </button>
          <button
            onClick={() => setViewMode("chunks")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "chunks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
            Chunks ({file.chunkCount})
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadContent}>
                  Retry
                </Button>
              </div>
            </div>
          ) : viewMode === "content" ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
                  {content || "No content available"}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-6">
                {chunks && chunks.length > 0 ? (
                  chunks.map((chunk) => (
                    <div
                      key={chunk.index}
                      className="rounded-lg border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Chunk {chunk.index + 1}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {chunk.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    No chunks available
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

