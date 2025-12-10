"use client";

import React, { useMemo } from "react";
import { FileEdit, ChevronDown, ChevronRight } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { FileItem } from "@/app/types/types";

// 语言映射
const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  xml: "xml",
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  dockerfile: "dockerfile",
  makefile: "makefile",
  md: "markdown",
  markdown: "markdown",
};

// 检测语言
function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_MAP[ext] || "text";
}

// 简单的 diff 行类型
type DiffLineType = "unchanged" | "added" | "removed";

interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// 简单的行级 diff 算法
function computeLineDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const result: DiffLine[] = [];

  // 使用简单的 LCS 算法
  const m = oldLines.length;
  const n = newLines.length;

  // 构建 LCS 表
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯构建 diff
  let i = m;
  let j = n;
  const tempResult: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      tempResult.unshift({
        type: "unchanged",
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempResult.unshift({
        type: "added",
        content: newLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0) {
      tempResult.unshift({
        type: "removed",
        content: oldLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  return tempResult;
}

interface FileDiffViewProps {
  file: FileItem;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: "light" | "dark";
}

export const FileDiffView = React.memo<FileDiffViewProps>(
  ({ file, collapsed = false, onToggleCollapse, theme = "light" }) => {
    const { path, content, oldContent, lineStart, lineEnd, language } = file;

    const detectedLanguage = language || detectLanguage(path);
    const syntaxStyle = theme === "dark" ? oneDark : oneLight;

    // 计算 diff
    const diffLines = useMemo(() => {
      if (!oldContent) return null;
      return computeLineDiff(oldContent, content);
    }, [oldContent, content]);

    // 统计变更
    const stats = useMemo(() => {
      if (!diffLines) return null;
      const added = diffLines.filter((l) => l.type === "added").length;
      const removed = diffLines.filter((l) => l.type === "removed").length;
      return { added, removed };
    }, [diffLines]);

    const fileName = path.split("/").pop() || path;
    const dirPath = path.includes("/")
      ? path.substring(0, path.lastIndexOf("/"))
      : "";

    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div
          className="flex cursor-pointer items-center justify-between border-b border-border bg-muted/50 px-3 py-2"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              collapsed ? (
                <ChevronRight size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )
            )}
            <FileEdit size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {fileName}
            </span>
            {dirPath && (
              <span className="text-xs text-muted-foreground">
                {dirPath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lineStart && lineEnd && (
              <span className="text-xs text-muted-foreground">
                Lines {lineStart}-{lineEnd}
              </span>
            )}
            {stats && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400">
                  +{stats.added}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  -{stats.removed}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="max-h-[400px] overflow-auto">
            {diffLines ? (
              // Diff 视图
              <div className="font-mono text-xs">
                {diffLines.map((line, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      line.type === "added"
                        ? "bg-green-50 dark:bg-green-900/20"
                        : line.type === "removed"
                        ? "bg-red-50 dark:bg-red-900/20"
                        : ""
                    }`}
                  >
                    {/* 行号 */}
                    <div className="flex w-20 flex-shrink-0 select-none border-r border-border bg-muted/30 text-muted-foreground">
                      <span className="w-10 px-2 py-0.5 text-right">
                        {line.oldLineNumber || ""}
                      </span>
                      <span className="w-10 px-2 py-0.5 text-right">
                        {line.newLineNumber || ""}
                      </span>
                    </div>
                    {/* 变更标记 */}
                    <div
                      className={`w-5 flex-shrink-0 select-none py-0.5 text-center font-bold ${
                        line.type === "added"
                          ? "text-green-600 dark:text-green-400"
                          : line.type === "removed"
                          ? "text-red-600 dark:text-red-400"
                          : "text-transparent"
                      }`}
                    >
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </div>
                    {/* 内容 */}
                    <pre className="flex-1 overflow-x-auto px-2 py-0.5 whitespace-pre">
                      {line.content || " "}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              // 普通代码视图
              <SyntaxHighlighter
                language={detectedLanguage}
                style={syntaxStyle}
                customStyle={{
                  margin: 0,
                  fontSize: "0.75rem",
                  backgroundColor: "transparent",
                }}
                showLineNumbers
                lineNumberStyle={{
                  minWidth: "2.5em",
                  paddingRight: "1em",
                  color: "var(--muted-foreground)",
                }}
              >
                {content}
              </SyntaxHighlighter>
            )}
          </div>
        )}
      </div>
    );
  }
);

FileDiffView.displayName = "FileDiffView";

