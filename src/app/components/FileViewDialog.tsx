"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { FileText, Copy, Download, Edit, Save, X, Loader2, Plus, Trash2, Table, Code } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import type { FileItem } from "@/app/types/types";
import useSWRMutation from "swr/mutation";

// CSV 解析函数
const parseCSV = (content: string): string[][] => {
  const lines = content.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.some(cell => cell !== ''));
};

// CSV 生成函数
const generateCSV = (data: string[][]): string => {
  return data.map(row => 
    row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
};

// CSV 表格组件
const CSVTableView = React.memo<{
  data: string[][];
  isEditing: boolean;
  onDataChange: (data: string[][]) => void;
}>(({ data, isEditing, onDataChange }) => {
  const headers = data[0] || [];
  const rows = data.slice(1);

  const handleCellChange = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex + 1] = [...newData[rowIndex + 1]];
    newData[rowIndex + 1][colIndex] = value;
    onDataChange(newData);
  }, [data, onDataChange]);

  const handleHeaderChange = useCallback((colIndex: number, value: string) => {
    const newData = [...data];
    newData[0] = [...newData[0]];
    newData[0][colIndex] = value;
    onDataChange(newData);
  }, [data, onDataChange]);

  const addRow = useCallback(() => {
    const newRow = new Array(headers.length).fill('');
    onDataChange([...data, newRow]);
  }, [data, headers.length, onDataChange]);

  const addColumn = useCallback(() => {
    const newData = data.map((row, index) => [...row, index === 0 ? 'New Column' : '']);
    onDataChange(newData);
  }, [data, onDataChange]);

  const deleteRow = useCallback((rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex + 1);
    onDataChange(newData);
  }, [data, onDataChange]);

  const deleteColumn = useCallback((colIndex: number) => {
    const newData = data.map(row => row.filter((_, index) => index !== colIndex));
    onDataChange(newData);
  }, [data, onDataChange]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-gray-400">No data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isEditing && (
        <div className="flex gap-2">
          <Button onClick={addRow} variant="outline" size="sm" className="h-8 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100">
            <Plus size={14} className="mr-1" />
            Add Row
          </Button>
          <Button onClick={addColumn} variant="outline" size="sm" className="h-8 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100">
            <Plus size={14} className="mr-1" />
            Add Column
          </Button>
        </div>
      )}
      <div className="overflow-auto rounded-lg border border-gray-300 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-12 border-b-2 border-r border-teal-200 bg-teal-600 px-3 py-3 text-center text-xs font-semibold text-white">
                #
              </th>
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="min-w-[180px] border-b-2 border-r border-teal-500 bg-teal-600 px-4 py-3 text-left text-sm font-semibold text-white last:border-r-0"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                        className="w-full rounded border border-teal-400 bg-teal-500 px-2 py-1.5 text-sm font-semibold text-white placeholder-teal-200 focus:border-white focus:outline-none"
                      />
                      <button
                        onClick={() => deleteColumn(colIndex)}
                        className="rounded p-1.5 text-teal-200 hover:bg-teal-500 hover:text-white"
                        title="Delete column"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    header
                  )}
                </th>
              ))}
              {isEditing && <th className="w-12 border-b-2 border-teal-200 bg-teal-600"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={`transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-teal-50`}
              >
                <td className="border-b border-r border-gray-200 bg-gray-100 px-3 py-2.5 text-center text-xs font-medium text-gray-500">
                  {rowIndex + 1}
                </td>
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="border-b border-r border-gray-200 px-4 py-2.5 last:border-r-0"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={row[colIndex] || ''}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{row[colIndex] || ''}</span>
                    )}
                  </td>
                ))}
                {isEditing && (
                  <td className="border-b border-gray-200 bg-gray-50 px-2 py-2.5">
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500"
                      title="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{rows.length} rows × {headers.length} columns</span>
        <span className="text-gray-500">Scroll horizontally to see more columns</span>
      </div>
    </div>
  );
});

CSVTableView.displayName = "CSVTableView";

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
};

export const FileViewDialog = React.memo<{
  file: FileItem | null;
  onSaveFile: (fileName: string, content: string) => Promise<void>;
  onClose: () => void;
  editDisabled: boolean;
}>(({ file, onSaveFile, onClose, editDisabled }) => {
  const [isEditingMode, setIsEditingMode] = useState(file === null);
  const [fileName, setFileName] = useState(String(file?.path || ""));
  const [fileContent, setFileContent] = useState(String(file?.content || ""));
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');

  const fileUpdate = useSWRMutation(
    { kind: "files-update", fileName, fileContent },
    async ({ fileName, fileContent }) => {
      if (!fileName || !fileContent) return;
      return await onSaveFile(fileName, fileContent);
    },
    {
      onSuccess: () => setIsEditingMode(false),
      onError: (error) => toast.error(`Failed to save file: ${error}`),
    }
  );

  useEffect(() => {
    setFileName(String(file?.path || ""));
    setFileContent(String(file?.content || ""));
    setIsEditingMode(file === null);
    // 解析 CSV 数据
    const ext = String(file?.path || "").split(".").pop()?.toLowerCase();
    if (ext === 'csv') {
      setCsvData(parseCSV(String(file?.content || "")));
    }
  }, [file]);

  const fileExtension = useMemo(() => {
    const fileNameStr = String(fileName || "");
    return fileNameStr.split(".").pop()?.toLowerCase() || "";
  }, [fileName]);

  const isCSV = useMemo(() => {
    return fileExtension === "csv";
  }, [fileExtension]);

  const isMarkdown = useMemo(() => {
    return fileExtension === "md" || fileExtension === "markdown";
  }, [fileExtension]);

  const language = useMemo(() => {
    return LANGUAGE_MAP[fileExtension] || "text";
  }, [fileExtension]);

  const handleCSVDataChange = useCallback((newData: string[][]) => {
    setCsvData(newData);
    setFileContent(generateCSV(newData));
  }, []);

  const handleCopy = useCallback(() => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
    }
  }, [fileContent]);

  const handleDownload = useCallback(() => {
    if (fileContent && fileName) {
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [fileContent, fileName]);

  const handleEdit = useCallback(() => {
    setIsEditingMode(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (file === null) {
      onClose();
    } else {
      setFileName(String(file.path));
      setFileContent(String(file.content));
      setIsEditingMode(false);
    }
  }, [file, onClose]);

  const fileNameIsValid = useMemo(() => {
    // 如果是编辑现有文件，文件名已经有效（来自服务器）
    if (file !== null) {
      return fileName.trim() !== "";
    }
    // 新建文件时，检查文件名格式
    return (
      fileName.trim() !== "" &&
      !fileName.includes("/") &&
      !fileName.includes(" ")
    );
  }, [fileName, file]);

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
    >
      <DialogContent className="flex h-[80vh] max-h-[80vh] min-w-[60vw] flex-col p-6">
        <DialogTitle className="sr-only">
          {file?.path || "New File"}
        </DialogTitle>
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-gray-500" />
            {isEditingMode && file === null ? (
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter filename..."
                className="text-base font-medium text-gray-800"
                aria-invalid={!fileNameIsValid}
              />
            ) : (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium text-gray-800">
                {file?.path}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* CSV 视图切换按钮 */}
            {isCSV && !isEditingMode && (
              <div className="mr-2 flex rounded-md border border-gray-300 bg-white">
                <Button
                  onClick={() => setViewMode('table')}
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-r-none px-3 text-gray-600 hover:bg-gray-100 ${viewMode === 'table' ? 'bg-teal-50 text-teal-700' : ''}`}
                >
                  <Table size={16} className="mr-1" />
                  Table
                </Button>
                <Button
                  onClick={() => setViewMode('raw')}
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-l-none border-l border-gray-300 px-3 text-gray-600 hover:bg-gray-100 ${viewMode === 'raw' ? 'bg-teal-50 text-teal-700' : ''}`}
                >
                  <Code size={16} className="mr-1" />
                  Raw
                </Button>
              </div>
            )}
            {!isEditingMode && (
              <>
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  disabled={editDisabled}
                >
                  <Edit
                    size={16}
                    className="mr-1"
                  />
                  Edit
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                >
                  <Copy
                    size={16}
                    className="mr-1"
                  />
                  Copy
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                >
                  <Download
                    size={16}
                    className="mr-1"
                  />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {isEditingMode ? (
            isCSV ? (
              <ScrollArea className="h-full rounded-md bg-white">
                <div className="p-4">
                  <CSVTableView
                    data={csvData}
                    isEditing={true}
                    onDataChange={handleCSVDataChange}
                  />
                </div>
              </ScrollArea>
            ) : (
              <Textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="Enter file content..."
                className="h-full min-h-[400px] resize-none font-mono text-sm"
              />
            )
          ) : (
            <ScrollArea className="h-full rounded-md bg-gray-50">
              <div className="p-4">
                {fileContent ? (
                  isMarkdown ? (
                    <div className="rounded-md p-6">
                      <MarkdownContent content={fileContent} />
                    </div>
                  ) : isCSV && viewMode === 'table' ? (
                    <CSVTableView
                      data={csvData}
                      isEditing={false}
                      onDataChange={() => {}}
                    />
                  ) : (
                    <SyntaxHighlighter
                      language={language}
                      style={oneLight}
                      customStyle={{
                        margin: 0,
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        backgroundColor: "#fafafa",
                      }}
                      showLineNumbers
                      wrapLines={true}
                      lineProps={{
                        style: {
                          whiteSpace: "pre-wrap",
                        },
                      }}
                    >
                      {fileContent}
                    </SyntaxHighlighter>
                  )
                ) : (
                  <div className="flex items-center justify-center p-12">
                    <p className="text-sm text-muted-foreground">
                      File is empty
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        {isEditingMode && (
          <div className="mt-4 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white px-4 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <X
                size={16}
                className="mr-1.5"
              />
              Cancel
            </Button>
            <Button
              onClick={() => fileUpdate.trigger()}
              size="sm"
              className="bg-teal-600 px-4 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
              disabled={
                fileUpdate.isMutating ||
                !fileName.trim() ||
                !fileNameIsValid
              }
            >
              {fileUpdate.isMutating ? (
                <Loader2
                  size={16}
                  className="mr-1.5 animate-spin"
                />
              ) : (
                <Save
                  size={16}
                  className="mr-1.5"
                />
              )}
              Save
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

FileViewDialog.displayName = "FileViewDialog";
