"use client";

import React, { useState, useCallback, useMemo } from "react";
import { FileText, BookOpen, Wrench, Settings2, Activity, Search } from "lucide-react";
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
      return <BookOpen size={20} className="text-gray-500" />;
    case "Build":
      return <Wrench size={20} className="text-gray-500" />;
    case "Optimize":
      return <Settings2 size={20} className="text-gray-500" />;
    case "Monitor":
      return <Activity size={20} className="text-gray-500" />;
  }
};

export const RightSidebar = React.memo<RightSidebarProps>(
  ({ files, setFiles, isLoading, interrupt }) => {
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fileCount = Object.keys(files).length;

    const handleSaveFile = useCallback(
      async (fileName: string, content: string) => {
        await setFiles({ ...files, [fileName]: content });
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
      <div className="flex h-full flex-col bg-white">
        {/* Playbooks Section */}
        <div className="flex-shrink-0 border-b border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2">
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Playbooks</span>
          </div>

          {/* Playbooks Grid */}
          <div className="grid grid-cols-2 gap-2">
            {playbooks.map((playbook) => (
              <button
                key={playbook}
                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              >
                <PlaybookIcon type={playbook} />
                <span className="mt-1.5 text-xs font-medium text-gray-600">
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
              <FileText size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Artefacts</span>
            </div>
            {fileCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-medium text-white">
                {fileCount}
              </span>
            )}
          </div>

          {/* Search Input */}
          {fileCount > 0 && (
            <div className="relative mb-3 flex-shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Files List - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {fileCount === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">
                No artefacts created yet
              </p>
            ) : filteredFiles.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">
                No files matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const filePath = String(file);
                  const rawContent = files[file];
                  let fileContent: string;
                  if (
                    typeof rawContent === "object" &&
                    rawContent !== null &&
                    "content" in rawContent
                  ) {
                    const contentArray = (rawContent as { content: unknown })
                      .content;
                    if (Array.isArray(contentArray)) {
                      fileContent = contentArray.join("\n");
                    } else {
                      fileContent = String(contentArray || "");
                    }
                  } else {
                    fileContent = String(rawContent || "");
                  }

                  return (
                    <button
                      key={filePath}
                      type="button"
                      onClick={() =>
                        setSelectedFile({ path: filePath, content: fileContent })
                      }
                      className="flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <FileText size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-700">
                          {filePath.split("/").pop()}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          /{filePath}
                        </p>
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
