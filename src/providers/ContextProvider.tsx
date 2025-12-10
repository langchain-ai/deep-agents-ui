"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { apiClient, type ContextFile, type ContextListResponse, type ContextSearchResult, type ContextContentResponse, type ContextChunksResponse } from "@/lib/api/client";
import { useAuth } from "./AuthProvider";

// ============ 类型定义 ============

interface ContextState {
  files: ContextFile[];
  totalSize: number;
  maxSize: number;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

interface ContextContextValue extends ContextState {
  // 操作方法
  loadFiles: () => Promise<void>;
  uploadFile: (file: File, filename?: string) => Promise<ContextFile | null>;
  deleteFile: (contextId: string) => Promise<boolean>;
  searchContext: (query: string, options?: {
    top_k?: number;
    similarity_threshold?: number;
  }) => Promise<ContextSearchResult[]>;
  getFileContent: (contextId: string) => Promise<ContextContentResponse | null>;
  getFileChunks: (contextId: string) => Promise<ContextChunksResponse | null>;
  downloadFile: (contextId: string, filename: string) => Promise<void>;
  // 计算属性
  usagePercent: number;
  readyFilesCount: number;
}

// ============ Context ============

const ContextContext = createContext<ContextContextValue | null>(null);

// ============ 常量 ============

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = [".txt", ".md", ".pdf", ".docx"];

// ============ Provider ============

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
  const { isAuthenticated } = useAuth();

  const [state, setState] = useState<ContextState>({
    files: [],
    totalSize: 0,
    maxSize: 50 * 1024 * 1024, // 50 MB default
    isLoading: false,
    isUploading: false,
    error: null,
  });

  // 防止重复加载的 ref
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: ContextListResponse = await apiClient.getContextFiles();
      setState((prev) => ({
        ...prev,
        files: response.contexts || [],
        totalSize: response.totalSize || 0,
        maxSize: response.maxSize || 50 * 1024 * 1024,
        isLoading: false,
      }));
    } catch (error) {
      console.error("[ContextProvider] Failed to load files:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load files",
      }));
    }
  }, [isAuthenticated]);

  // 初始加载 - 使用 ref 防止重复调用
  useEffect(() => {
    // 防止重复加载（React Strict Mode 或依赖变化导致的重复执行）
    if (!isAuthenticated || hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    const doLoad = async () => {
      isLoadingRef.current = true;
      try {
        await loadFiles();
        hasLoadedRef.current = true;
      } finally {
        isLoadingRef.current = false;
      }
    };

    doLoad();
  }, [isAuthenticated, loadFiles]);

  // 上传文件
  const uploadFile = useCallback(async (file: File, filename?: string): Promise<ContextFile | null> => {
    // 验证文件类型
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_TYPES.includes(ext)) {
      setState((prev) => ({
        ...prev,
        error: `Unsupported file type. Supported: ${SUPPORTED_TYPES.join(", ")}`,
      }));
      return null;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      setState((prev) => ({
        ...prev,
        error: `File too large. Maximum size: 5 MB`,
      }));
      return null;
    }

    // 检查存储空间
    if (state.totalSize + file.size > state.maxSize) {
      setState((prev) => ({
        ...prev,
        error: `Not enough storage space`,
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isUploading: true, error: null }));
    try {
      const newFile = await apiClient.uploadContextFile(file, filename);
      setState((prev) => ({
        ...prev,
        files: [...prev.files, newFile],
        totalSize: prev.totalSize + file.size,
        isUploading: false,
      }));
      return newFile;
    } catch (error) {
      console.error("[ContextProvider] Failed to upload file:", error);
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      }));
      return null;
    }
  }, [state.totalSize, state.maxSize]);

  // 删除文件
  const deleteFile = useCallback(async (contextId: string): Promise<boolean> => {
    try {
      await apiClient.deleteContextFile(contextId);
      const deletedFile = state.files.find((f) => f.id === contextId);
      setState((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== contextId),
        totalSize: deletedFile ? prev.totalSize - deletedFile.fileSize : prev.totalSize,
      }));
      return true;
    } catch (error) {
      console.error("[ContextProvider] Failed to delete file:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete file",
      }));
      return false;
    }
  }, [state.files]);

  // 搜索上下文
  const searchContext = useCallback(async (
    query: string,
    options?: { top_k?: number; similarity_threshold?: number }
  ): Promise<ContextSearchResult[]> => {
    try {
      const response = await apiClient.searchContext(query, options);
      return response.results;
    } catch (error) {
      console.error("[ContextProvider] Failed to search context:", error);
      return [];
    }
  }, []);

  // 获取文件内容
  const getFileContent = useCallback(async (contextId: string): Promise<ContextContentResponse | null> => {
    try {
      return await apiClient.getContextFileContent(contextId);
    } catch (error) {
      console.error("[ContextProvider] Failed to get file content:", error);
      return null;
    }
  }, []);

  // 获取文件分块
  const getFileChunks = useCallback(async (contextId: string): Promise<ContextChunksResponse | null> => {
    try {
      return await apiClient.getContextFileChunks(contextId);
    } catch (error) {
      console.error("[ContextProvider] Failed to get file chunks:", error);
      return null;
    }
  }, []);

  // 下载文件
  const downloadFile = useCallback(async (contextId: string, filename: string): Promise<void> => {
    try {
      await apiClient.downloadContextFile(contextId, filename);
    } catch (error) {
      console.error("[ContextProvider] Failed to download file:", error);
      throw error;
    }
  }, []);

  // 计算属性
  const usagePercent = useMemo(() => {
    return state.maxSize > 0 ? (state.totalSize / state.maxSize) * 100 : 0;
  }, [state.totalSize, state.maxSize]);

  const readyFilesCount = useMemo(() => {
    return state.files.filter((f) => f.status === "ready").length;
  }, [state.files]);

  // Context value
  const value = useMemo<ContextContextValue>(() => ({
    ...state,
    loadFiles,
    uploadFile,
    deleteFile,
    searchContext,
    getFileContent,
    getFileChunks,
    downloadFile,
    usagePercent,
    readyFilesCount,
  }), [state, loadFiles, uploadFile, deleteFile, searchContext, getFileContent, getFileChunks, downloadFile, usagePercent, readyFilesCount]);

  return (
    <ContextContext.Provider value={value}>
      {children}
    </ContextContext.Provider>
  );
}

// ============ Hook ============

export function useContextFiles(): ContextContextValue {
  const context = useContext(ContextContext);
  if (!context) {
    throw new Error("useContextFiles must be used within ContextProvider");
  }
  return context;
}

