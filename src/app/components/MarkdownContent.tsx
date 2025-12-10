"use client";

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Copy, Check, ExternalLink, ZoomIn } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// 预处理 Markdown 内容，修复常见问题
function preprocessMarkdown(content: string): string {
  if (!content) return "";
  
  let processed = content;
  
  // 1. 处理转义字符
  // 始终处理转义的换行符，因为内容可能混合了真正的换行符和转义的换行符
  if (processed.includes("\\n")) {
    processed = processed
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "")
      .replace(/\\\\/g, "\\");
  }
  
  // 2. 清理多余的空行
  processed = processed.replace(/\n{3,}/g, "\n\n");
  
  // 3. 处理嵌套的 markdown 代码块
  // Markdown 标准不支持嵌套代码块，需要将 ```markdown 内部的内容提取出来
  processed = unwrapMarkdownCodeBlocks(processed);
  
  // 4. 修复表格格式问题
  // 有时表格行之间缺少换行符，导致整个表格被当作一行文本
  processed = fixTableFormat(processed);
  
  // 5. 标准化表格分隔行格式
  // 某些格式如 |------- | 可能不被所有解析器识别
  // 标准化为 | --- | 格式
  processed = normalizeTableSeparators(processed);
  
  return processed.trim();
}

/**
 * 标准化表格分隔行格式
 * 将 |------- | 格式转换为 | --- | 格式
 */
function normalizeTableSeparators(content: string): string {
  if (!content.includes('|')) return content;
  
  const lines = content.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    // 检查是否是分隔行（只包含 |、-、:、空格）
    const trimmed = line.trim();
    if (/^\|[\s:|-]+\|$/.test(trimmed) && trimmed.includes('-')) {
      // 这是一个分隔行，标准化它
      // 将每个单元格标准化为 --- 或 :---: 等
      const normalized = trimmed
        .split('|')
        .filter(cell => cell !== '') // 移除空字符串
        .map(cell => {
          const trimmedCell = cell.trim();
          if (!trimmedCell || !/^[\s:|-]+$/.test(trimmedCell)) {
            return cell; // 不是分隔符单元格，保持原样
          }
          // 检查对齐方式
          const hasLeftColon = trimmedCell.startsWith(':');
          const hasRightColon = trimmedCell.endsWith(':');
          if (hasLeftColon && hasRightColon) {
            return ':---:'; // 居中
          } else if (hasRightColon) {
            return '---:'; // 右对齐
          } else if (hasLeftColon) {
            return ':---'; // 左对齐
          } else {
            return '---'; // 默认
          }
        })
        .join(' | ');
      result.push('| ' + normalized + ' |');
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * 修复 Markdown 表格格式问题
 * 
 * 问题：后端返回的表格内容可能将多行合并成一行
 * 例如：| H1 | H2 ||------||------|| V1 | V2 |
 * 应该是：
 * | H1 | H2 |
 * |------|------|
 * | V1 | V2 |
 * 
 * 核心思路：
 * 1. 找到表格分隔行（|---|---|），在其前后添加换行符
 * 2. 处理 || 模式（表格行结束后紧跟下一行开始）
 * 3. 确保表格与其他内容之间有换行符分隔
 */
function fixTableFormat(content: string): string {
  if (!content || !content.includes('|')) return content;
  
  // 找到所有表格分隔行的位置
  const separatorPattern = /\|[\s:]*-{2,}[\s:]*(?:\|[\s:]*-{2,}[\s:]*)*\|/g;
  
  let result = content;
  let match;
  const separators: Array<{ start: number; end: number; text: string }> = [];
  
  while ((match = separatorPattern.exec(content)) !== null) {
    separators.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    });
  }
  
  if (separators.length === 0) return content;
  
  // 从后向前处理每个分隔行（避免索引偏移问题）
  for (let i = separators.length - 1; i >= 0; i--) {
    const sep = separators[i];
    
    // 在分隔行前添加换行符（如果前面是 |）
    if (sep.start > 0 && result[sep.start - 1] === '|') {
      result = result.slice(0, sep.start) + '\n' + result.slice(sep.start);
      sep.end += 1;
    }
    
    // 在分隔行后添加换行符（如果后面是 |）
    if (sep.end < result.length && result[sep.end] === '|') {
      result = result.slice(0, sep.end) + '\n' + result.slice(sep.end);
    }
  }
  
  // 处理数据行之间的 ||（多次处理直到没有变化）
  let prevResult;
  do {
    prevResult = result;
    // 匹配：| + 内容（不含 | 和换行） + || + 非分隔符字符
    result = result.replace(/(\|[^|\n]+\|)(\|[^-\n])/g, '$1\n$2');
  } while (result !== prevResult);
  
  // 处理分隔行后的 || (变成 |\n|)
  result = result.replace(/\n\|\|/g, '\n|');
  
  // 处理特殊情况：单元格内容后缺少空格直接跟 | 的情况
  // 例如：采集范围| 中     | 应该变成 采集范围 | 中     |
  // 这种情况下，| 前面缺少空格，我们需要添加空格
  result = result.replace(/([^\s|])\|(\s)/g, '$1 |$2');
  
  // 确保表格前有换行（与前面的文本分隔）
  // 匹配：中文/英文/数字/标点 + | + 非分隔符内容
  result = result.replace(/([\u4e00-\u9fa5a-zA-Z0-9。！？，、])(\|[^\n|]+\|)/g, '$1\n\n$2');
  
  // 确保表格后有换行（与后面的文本分隔）
  result = result.replace(/(\|[^\n|]+\|)([\u4e00-\u9fa5a-zA-Z0-9])/g, '$1\n\n$2');
  
  return result;
}

/**
 * 解包 markdown 代码块
 * 将 ```markdown...``` 转换为实际的 markdown 内容
 * 
 * 这是必要的，因为 Markdown 不支持嵌套代码块。
 * 当 ```markdown 内部包含 ```python 等代码块时，
 * 解析器会在遇到第一个 ``` 时就认为代码块结束了。
 * 
 * 注意：这个函数也处理行内的 ```markdown（即不在行首的情况）
 * 
 * 重要：流式输出时，内容可能不完整（只有开始的 ```markdown 但没有结束的 ```）
 * 需要同时处理完整和不完整的情况
 */
function unwrapMarkdownCodeBlocks(content: string): string {
  let processed = content;
  
  // 1. 首先处理完整的 markdown 代码块
  // 匹配 ```markdown 或 ```md（可能不在行首）
  const completeBlockPattern = /```(?:markdown|md)\s*\n([\s\S]*?)```/g;
  processed = processed.replace(completeBlockPattern, (match, innerContent) => {
    // 返回内部内容，前后添加换行确保分隔
    return '\n\n' + innerContent.trim() + '\n\n';
  });
  
  // 2. 处理不完整的 markdown 代码块（流式输出时可能只有开始没有结束）
  // 匹配 ```markdown 或 ```md 后面跟着内容但没有结束的 ```
  // 这种情况下，直接移除开始标记，让内容正常显示
  const incompleteBlockPattern = /```(?:markdown|md)\s*\n([\s\S]*)$/;
  const incompleteMatch = processed.match(incompleteBlockPattern);
  if (incompleteMatch) {
    // 检查内容中是否有其他代码块（如 ```python）
    // 如果有，需要小心处理，避免破坏它们
    const innerContent = incompleteMatch[1];
    
    // 检查是否有未闭合的其他代码块
    const codeBlockStarts = (innerContent.match(/```\w+/g) || []).length;
    const codeBlockEnds = (innerContent.match(/```(?!\w)/g) || []).length;
    
    // 如果代码块开始和结束数量相等，说明内部代码块是完整的
    // 可以安全地移除外层的 ```markdown
    if (codeBlockStarts === codeBlockEnds) {
      processed = processed.replace(incompleteBlockPattern, '\n\n' + innerContent);
    }
    // 如果不相等，保持原样，等待更多内容
  }
  
  // 3. 处理只有 ```markdown 标记但后面没有换行的情况（流式输出的最开始）
  // 例如：```markdown（刚开始输出）
  processed = processed.replace(/```(?:markdown|md)\s*$/, '');
  
  // 清理可能产生的多余空行
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  return processed;
}

// 图片预览模态框
const ImagePreviewModal = React.memo<{
  src: string;
  alt: string;
  onClose: () => void;
}>(({ src, alt, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]">
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-lg hover:bg-muted"
        >
          ×
        </button>
      </div>
    </div>
  );
});
ImagePreviewModal.displayName = "ImagePreviewModal";

// 代码块复制按钮
const CopyButton = React.memo<{ code: string }>(({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-muted/80 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
});
CopyButton.displayName = "CopyButton";

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "" }) => {
    const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

    // 检测当前主题
    const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

    return (
      <>
        <div
          className={cn(
            // 基础样式 - 使用主题颜色
            "prose prose-sm min-w-0 max-w-full overflow-hidden break-words leading-relaxed",
            "text-foreground dark:prose-invert",
            // 标题样式 - 使用主题颜色
            "[&_h1:first-child]:mt-0 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-primary",
            "[&_h2:first-child]:mt-0 [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-primary",
            "[&_h3:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary/90",
            "[&_h4:first-child]:mt-0 [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-foreground",
            "[&_h5:first-child]:mt-0 [&_h5]:mb-2 [&_h5]:mt-3 [&_h5]:text-sm [&_h5]:font-medium [&_h5]:text-foreground",
            "[&_h6:first-child]:mt-0 [&_h6]:mb-2 [&_h6]:mt-3 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:text-muted-foreground",
            // 段落和文本样式
            "[&_p:last-child]:mb-0 [&_p]:mb-3 [&_p]:text-foreground",
            "[&_strong]:font-semibold [&_strong]:text-foreground",
            "[&_em]:text-foreground/90",
            "[&_li]:text-foreground",
            // 分割线
            "[&_hr]:my-4 [&_hr]:border-border",
            className
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 代码块
              code({
                inline,
                className: codeClassName,
                children,
                ...props
              }: {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              }) {
                const match = /language-(\w+)/.exec(codeClassName || "");
                const codeString = String(children).replace(/\n$/, "");
                
                return !inline && match ? (
                  <div className="group relative my-4 last:mb-0">
                    <div className="absolute left-3 top-0 -translate-y-1/2 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
                      {match[1]}
                    </div>
                    <CopyButton code={codeString} />
                    <SyntaxHighlighter
                      style={isDark ? oneDark : oneLight}
                      language={match[1]}
                      PreTag="div"
                      className="!mt-0 max-w-full rounded-lg border border-border text-sm"
                      wrapLines={true}
                      wrapLongLines={true}
                      lineProps={{
                        style: {
                          wordBreak: "break-all",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "break-word",
                        },
                      }}
                      customStyle={{
                        margin: 0,
                        padding: "1rem",
                        paddingTop: "1.5rem",
                        maxWidth: "100%",
                        overflowX: "auto",
                        fontSize: "0.875rem",
                        borderRadius: "0.5rem",
                        background: isDark ? "#1e1e1e" : "#f8f8f8",
                      }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code
                    className="rounded border border-border/50 bg-background px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              // 预格式化文本
              pre({ children }: { children?: React.ReactNode }) {
                return (
                  <div className="my-4 max-w-full overflow-hidden last:mb-0">
                    {children}
                  </div>
                );
              },
              // 链接
              a({
                href,
                children,
              }: {
                href?: string;
                children?: React.ReactNode;
              }) {
                const isExternal = href?.startsWith("http");
                return (
                  <a
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-0.5 text-primary no-underline hover:underline"
                  >
                    {children}
                    {isExternal && <ExternalLink size={12} className="ml-0.5" />}
                  </a>
                );
              },
              // 引用块
              blockquote({ children }: { children?: React.ReactNode }) {
                return (
                  <blockquote className="my-4 border-l-4 border-primary/30 bg-muted/30 py-1 pl-4 pr-2 italic text-muted-foreground">
                    {children}
                  </blockquote>
                );
              },
              // 无序列表
              ul({ children }: { children?: React.ReactNode }) {
                return (
                  <ul className="my-3 list-disc pl-6 marker:text-muted-foreground [&>li:last-child]:mb-0 [&>li]:mb-1">
                    {children}
                  </ul>
                );
              },
              // 有序列表
              ol({ children }: { children?: React.ReactNode }) {
                return (
                  <ol className="my-3 list-decimal pl-6 marker:text-muted-foreground [&>li:last-child]:mb-0 [&>li]:mb-1">
                    {children}
                  </ol>
                );
              },
              // 表格 - 优化显示
              table({ children }: { children?: React.ReactNode }) {
                return (
                  <div className="my-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }: { children?: React.ReactNode }) {
                return (
                  <thead className="bg-muted/50">
                    {children}
                  </thead>
                );
              },
              th({ children }: { children?: React.ReactNode }) {
                return (
                  <th className="border-b border-border px-4 py-2 text-left font-semibold text-foreground">
                    {children}
                  </th>
                );
              },
              td({ children }: { children?: React.ReactNode }) {
                return (
                  <td className="border-b border-border px-4 py-2 text-foreground">
                    {children}
                  </td>
                );
              },
              tr({ children }: { children?: React.ReactNode }) {
                return (
                  <tr className="transition-colors hover:bg-muted/30 [&:last-child>td]:border-b-0">
                    {children}
                  </tr>
                );
              },
              // 图片 - 支持点击放大
              img(props) {
                const src = typeof props.src === 'string' ? props.src : undefined;
                const alt = props.alt || "";
                if (!src) return null;
                return (
                  <span className="group relative my-4 block">
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full cursor-pointer rounded-lg shadow-sm transition-shadow hover:shadow-md"
                      loading="lazy"
                      onClick={() => setPreviewImage({ src, alt })}
                    />
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn size={12} />
                      Click to zoom
                    </span>
                  </span>
                );
              },
              // 删除线
              del({ children }: { children?: React.ReactNode }) {
                return (
                  <del className="text-muted-foreground line-through">
                    {children}
                  </del>
                );
              },
              // 任务列表
              input({ checked, ...props }: { checked?: boolean }) {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-2 h-4 w-4 rounded border-border accent-primary"
                    {...props}
                  />
                );
              },
            }}
          >
            {preprocessMarkdown(content)}
          </ReactMarkdown>
        </div>

        {/* 图片预览模态框 */}
        {previewImage && (
          <ImagePreviewModal
            src={previewImage.src}
            alt={previewImage.alt}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </>
    );
  }
);

MarkdownContent.displayName = "MarkdownContent";
