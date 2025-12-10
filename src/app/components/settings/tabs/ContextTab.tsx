"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Trash2,
  FileText,
  File,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Database,
  Search,
  Settings2,
  HardDrive,
  Eye,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSettings } from "../SettingsContext";
import { useContextFiles } from "@/providers/ContextProvider";
import { ContextFilePreview } from "../../ContextFilePreview";
import type { ContextFile } from "@/lib/api/client";

// 文件类型图标映射
const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  txt: <FileText className="h-5 w-5 text-gray-500" />,
  md: <FileText className="h-5 w-5 text-blue-500" />,
  pdf: <File className="h-5 w-5 text-red-500" />,
  docx: <File className="h-5 w-5 text-blue-600" />,
};

// 状态图标映射
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  ready: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

// 状态文本映射
const STATUS_TEXT: Record<string, string> = {
  pending: "Pending",
  processing: "Processing...",
  ready: "Ready",
  error: "Error",
};

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 支持的文件类型
const SUPPORTED_TYPES = [".txt", ".md", ".pdf", ".docx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ContextTab() {
  // 从 SettingsContext 获取用户设置
  const { userModelSettings, setUserModelSettings } = useSettings();

  // 从 ContextProvider 获取共享的文件状态
  const {
    files,
    totalSize,
    maxSize,
    isLoading,
    isUploading,
    usagePercent,
    uploadFile,
    deleteFile,
    searchContext,
    downloadFile,
  } = useContextFiles();

  // 删除中的文件 ID
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  // 文件预览状态
  const [previewFile, setPreviewFile] = useState<ContextFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 从 userModelSettings 获取 context 设置
  const contextEnabled = userModelSettings.contextEnabled ?? true;
  const contextMaxChunks = userModelSettings.contextMaxChunks ?? 5;
  const contextSimilarityThreshold = userModelSettings.contextSimilarityThreshold ?? 0.7;

  // 更新 context 设置
  const updateContextSettings = useCallback((updates: {
    contextEnabled?: boolean;
    contextMaxChunks?: number;
    contextSimilarityThreshold?: number;
  }) => {
    setUserModelSettings((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [setUserModelSettings]);

  // 搜索测试状态
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    contextId: string;
    filename: string;
    chunkIndex: number;
    content: string;
    similarity: number;
  }> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
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

  // 处理文件删除
  const handleDelete = useCallback(async (contextId: string) => {
    setDeletingIds((prev) => new Set(prev).add(contextId));
    const success = await deleteFile(contextId);
    if (success) {
      toast.success("File deleted successfully");
    } else {
      toast.error("Failed to delete file");
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(contextId);
      return next;
    });
  }, [deleteFile]);

  // 处理搜索测试
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults(null);
    try {
      const results = await searchContext(searchQuery, {
        top_k: contextMaxChunks,
        similarity_threshold: contextSimilarityThreshold,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search context:", error);
      toast.error("Failed to search context");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, contextMaxChunks, contextSimilarityThreshold, searchContext]);

  // 处理文件预览
  const handlePreview = useCallback((file: ContextFile) => {
    if (file.status === "ready") {
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  }, []);

  // 处理文件下载
  const handleDownload = useCallback(async (file: ContextFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadFile(file.id, file.filename);
      toast.success("File downloaded successfully");
    } catch (error) {
      toast.error("Failed to download file");
    }
  }, [downloadFile]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Context (RAG)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents to provide context for the AI. The agent will automatically retrieve relevant content when answering your questions.
        </p>
      </div>

      {/* Settings Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h4 className="font-medium text-foreground">RAG Settings</h4>
        </div>

        <div className="space-y-6">
          {/* Enable Context */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Enable Context</label>
              <p className="text-xs text-muted-foreground">Use uploaded documents to enhance AI responses</p>
            </div>
            <Switch
              checked={contextEnabled}
              onCheckedChange={(checked) => updateContextSettings({ contextEnabled: checked })}
            />
          </div>

          {/* Max Chunks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Max Retrieved Chunks</label>
                <p className="text-xs text-muted-foreground">Number of document chunks to retrieve (1-20)</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-foreground">
                {contextMaxChunks}
              </span>
            </div>
            <Slider
              value={[contextMaxChunks]}
              onValueChange={(values: number[]) => updateContextSettings({ contextMaxChunks: values[0] })}
              min={1}
              max={20}
              step={1}
              disabled={!contextEnabled}
            />
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Similarity Threshold</label>
                <p className="text-xs text-muted-foreground">Minimum relevance score for retrieved content (0-1)</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-foreground">
                {contextSimilarityThreshold.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[contextSimilarityThreshold]}
              onValueChange={(values: number[]) => updateContextSettings({ contextSimilarityThreshold: values[0] })}
              min={0}
              max={1}
              step={0.05}
              disabled={!contextEnabled}
            />
          </div>
        </div>
      </div>

      {/* Storage Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Storage</h4>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(totalSize)} / {formatFileSize(maxSize)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300",
              usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-yellow-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>

        {/* Upload Button */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES.join(",")}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || usagePercent >= 100}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Supported: {SUPPORTED_TYPES.join(", ")} • Max size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
              <p className="text-xs text-muted-foreground/70">Upload documents to provide context for the AI</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                onClick={() => handlePreview(file)}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50",
                  file.status === "ready" && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3">
                  {FILE_TYPE_ICONS[file.fileType] || <File className="h-5 w-5 text-gray-500" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.filename}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{file.chunkCount} chunks</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {STATUS_ICONS[file.status]}
                        <span>{STATUS_TEXT[file.status]}</span>
                      </div>
                    </div>
                    {file.status === "error" && file.errorMessage && (
                      <p className="mt-1 text-xs text-red-500">{file.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {file.status === "ready" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View content"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDownload(file, e)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id);
                    }}
                    disabled={deletingIds.has(file.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Delete file"
                  >
                    {deletingIds.has(file.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Search Test Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h4 className="font-medium text-foreground">Test Search</h4>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter a search query to test retrieval..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={!contextEnabled || files.length === 0}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim() || !contextEnabled || files.length === 0}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mt-4 space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No relevant content found</p>
            ) : (
              searchResults.map((result, index) => (
                <div
                  key={`${result.contextId}-${result.chunkIndex}`}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      [{index + 1}] {result.filename}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {(result.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{result.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* File Preview Dialog */}
      <ContextFilePreview
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

