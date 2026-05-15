"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "@/app/components/ChartRenderer";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "" }) => {
    return (
      <div
        className={cn(
          "prose min-w-0 max-w-full overflow-hidden break-words text-sm leading-relaxed text-inherit [&_h1:first-child]:mt-0 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:font-semibold [&_h2:first-child]:mt-0 [&_h2]:mb-4 [&_h2]:mt-6 [&_h2]:font-semibold [&_h3:first-child]:mt-0 [&_h3]:mb-4 [&_h3]:mt-6 [&_h3]:font-semibold [&_h4:first-child]:mt-0 [&_h4]:mb-4 [&_h4]:mt-6 [&_h4]:font-semibold [&_h5:first-child]:mt-0 [&_h5]:mb-4 [&_h5]:mt-6 [&_h5]:font-semibold [&_h6:first-child]:mt-0 [&_h6]:mb-4 [&_h6]:mt-6 [&_h6]:font-semibold [&_p:last-child]:mb-0 [&_p]:mb-4",
          className
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({
              inline,
              className,
              children,
              ...props
            }: {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            }) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  className="max-w-full rounded-md text-sm"
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
                    maxWidth: "100%",
                    overflowX: "auto",
                    fontSize: "0.875rem",
                  }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code
                  className="bg-surface rounded-sm px-1 py-0.5 font-mono text-[0.9em]"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre({ children }: { children?: React.ReactNode }) {
              return (
                <div className="my-4 max-w-full overflow-hidden last:mb-0">
                  {children}
                </div>
              );
            },
            a({
              href,
              children,
            }: {
              href?: string;
              children?: React.ReactNode;
            }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary no-underline hover:underline"
                >
                  {children}
                </a>
              );
            },
            blockquote({ children }: { children?: React.ReactNode }) {
              return (
                <blockquote className="text-primary/50 my-4 border-l-4 border-border pl-4 italic">
                  {children}
                </blockquote>
              );
            },
            ul({ children }: { children?: React.ReactNode }) {
              return (
                <ul className="my-4 pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1">
                  {children}
                </ul>
              );
            },
            ol({ children }: { children?: React.ReactNode }) {
              return (
                <ol className="my-4 pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1">
                  {children}
                </ol>
              );
            },
            table({ children }: { children?: React.ReactNode }) {
              return <TableWithChart>{children}</TableWithChart>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownContent.displayName = "MarkdownContent";

/** 递归提取 React children 中的纯文本 */
function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (React.isValidElement(node))
    return getTextContent(
      (node.props as { children?: React.ReactNode }).children
    );
  return "";
}

/** 从 table 的 React children 中提取 columns 和 rows */
function extractTableData(children: React.ReactNode): {
  columns: string[];
  rows: string[][];
} {
  const columns: string[] = [];
  const rows: string[][] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const tag = child.type as string;

    if (tag === "thead") {
      React.Children.forEach(
        (child.props as { children?: React.ReactNode }).children,
        (tr) => {
          if (!React.isValidElement(tr)) return;
          React.Children.forEach(
            (tr.props as { children?: React.ReactNode }).children,
            (th) => {
              if (!React.isValidElement(th)) return;
              columns.push(
                getTextContent(
                  (th.props as { children?: React.ReactNode }).children
                )
              );
            }
          );
        }
      );
    }

    if (tag === "tbody") {
      React.Children.forEach(
        (child.props as { children?: React.ReactNode }).children,
        (tr) => {
          if (!React.isValidElement(tr)) return;
          const row: string[] = [];
          React.Children.forEach(
            (tr.props as { children?: React.ReactNode }).children,
            (td) => {
              if (!React.isValidElement(td)) return;
              row.push(
                getTextContent(
                  (td.props as { children?: React.ReactNode }).children
                )
              );
            }
          );
          rows.push(row);
        }
      );
    }
  });

  return { columns, rows };
}

const TableWithChart = React.memo<{ children?: React.ReactNode }>(
  ({ children }) => {
    const { columns, rows } = useMemo(
      () => extractTableData(children),
      [children]
    );

    return (
      <>
        <div className="my-4 overflow-x-auto">
          <table className="[&_th]:bg-surface w-full border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold">
            {children}
          </table>
        </div>
        {columns.length > 1 && rows.length > 0 && (
          <ChartRenderer
            columns={columns}
            rows={rows}
          />
        )}
      </>
    );
  }
);
TableWithChart.displayName = "TableWithChart";
