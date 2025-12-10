"use client";

import React, { useState, useCallback, useMemo } from "react";
import { FileText, BookOpen, Wrench, Settings2, Activity, Search, FileEdit, Eye } from "lucide-react";
import type { FileItem } from "@/app/types/types";
import { FileViewDialog } from "@/app/components/FileViewDialog";

interface RightSidebarProps {
  files: Record<string, string> | Record<string, FileItem>;
  setFiles: (files: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  interrupt: unknown;
}

type PlaybookType = "Research" | "Build" | "Optimize" | "Monitor";

const PlaybookIcon = ({ type }: { type: PlaybookType }) => {
  switch (type) {
    case "Research":
      return <BookOpen size={20} className="text-muted-foreground" />;
    case "Build":
      return <Wrench size={20} className="text-muted-foreground" />;
    case "Optimize":
      return <Settings2 size={20} className="text-muted-foreground" />;
    case "Monitor":
      return <Activity size={20} className="text-muted-foreground" />;
  }
};

export const RightSidebar = React.memo<RightSidebarProps>(
  ({ files, setFiles, isLoading, interrupt }) => {
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fileCount = Object.keys(files).length;

    const handleSaveFile = useCallback(
      async (fileName: string, content: string) => {
        // Convert files to Record<string, string> format
        const filesAsStrings: Record<string, string> = {};
        for (const [key, value] of Object.entries(files)) {
          filesAsStrings[key] = typeof value === "string" ? value : value.content;
        }
        await setFiles({ ...filesAsStrings, [fileName]: content });
        setSelectedFile({ path: fileName, content: content });
      },
      [files, setFiles]
    );

    // Filter files based on search query
    const filteredFiles = useMemo(() => {
      if (!searchQuery.trim()) return Object.keys(files);
      const query = searchQuery.toLowerCase();
      return Object.keys(files).filter((file) =>
        file.toLowerCase().includes(query)
      );
    }, [files, searchQuery]);

    const playbooks: PlaybookType[] = ["Research", "Build", "Optimize", "Monitor"];

    return (
      <div className="flex h-full flex-col bg-card">
        {/* Playbooks Section */}
        <div className="flex-shrink-0 border-b border-border p-4 pb-5">
          <div className="mb-4 flex items-center gap-2">
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="text-sm font-medium text-foreground">Playbooks</span>
          </div>

          {/* Playbooks Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {playbooks.map((playbook) => (
              <button
                key={playbook}
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-3 py-4 transition-colors hover:bg-accent"
              >
                <PlaybookIcon type={playbook} />
                <span className="mt-2 text-xs font-medium text-muted-foreground">
                  {playbook}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Artefacts Section */}
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-3 flex flex-shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Artefacts</span>
            </div>
            {fileCount > 0 && (
              <span 
                style={{ backgroundColor: 'hsl(173, 58%, 35%)' }}
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium text-white"
              >
                {fileCount}
              </span>
            )}
          </div>

          {/* Search Input */}
          {fileCount > 0 && (
            <div className="relative mb-3 flex-shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Files List - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {fileCount === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No artefacts created yet
              </p>
            ) : filteredFiles.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No files matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const filePath = String(file);
                  const rawContent = files[file];
                  let fileItem: FileItem;
                  
                  if (
                    typeof rawContent === "object" &&
                    rawContent !== null &&
                    "content" in rawContent
                  ) {
                    const rawFileItem = rawContent as FileItem;
                    const contentArray = rawFileItem.content;
                    const content = Array.isArray(contentArray)
                      ? contentArray.join("\n")
                      : String(contentArray || "");
                    
                    fileItem = {
                      path: filePath,
                      content,
                      language: rawFileItem.language,
                      editable: rawFileItem.editable,
                      lastModified: rawFileItem.lastModified,
                      oldContent: rawFileItem.oldContent,
                      lineStart: rawFileItem.lineStart,
                      lineEnd: rawFileItem.lineEnd,
                    };
                  } else {
                    fileItem = {
                      path: filePath,
                      content: String(rawContent || ""),
                    };
                  }

                  const hasChanges = !!fileItem.oldContent;
                  const isEditable = fileItem.editable !== false;

                  return (
                    <button
                      key={filePath}
                      type="button"
                      onClick={() => setSelectedFile(fileItem)}
                      className="group flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
                    >
                      {hasChanges ? (
                        <FileEdit size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                      ) : (
                        <FileText size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {filePath.split("/").pop()}
                          </p>
                          {hasChanges && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Modified
                            </span>
                          )}
                          {!isEditable && (
                            <span title="Read only">
                              <Eye size={12} className="text-muted-foreground" />
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {filePath.startsWith('/') ? filePath : `/${filePath}`}
                        </p>
                        {fileItem.lastModified && (
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {new Date(fileItem.lastModified).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedFile && (
          <FileViewDialog
            file={selectedFile}
            onSaveFile={handleSaveFile}
            onClose={() => setSelectedFile(null)}
            editDisabled={isLoading === true || interrupt !== undefined}
          />
        )}
      </div>
    );
  }
);

RightSidebar.displayName = "RightSidebar";
