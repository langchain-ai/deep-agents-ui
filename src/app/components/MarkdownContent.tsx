"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "" }) => {
    return (
      <div
        className={cn(
          "prose min-w-0 max-w-full overflow-hidden break-words text-sm leading-relaxed text-gray-600",
          "[&_h1:first-child]:mt-0 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-blue-600",
          "[&_h2:first-child]:mt-0 [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-blue-600",
          "[&_h3:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-blue-500",
          "[&_h4:first-child]:mt-0 [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-gray-700",
          "[&_h5:first-child]:mt-0 [&_h5]:mb-2 [&_h5]:mt-3 [&_h5]:text-sm [&_h5]:font-medium [&_h5]:text-gray-700",
          "[&_h6:first-child]:mt-0 [&_h6]:mb-2 [&_h6]:mt-3 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:text-gray-600",
          "[&_p:last-child]:mb-0 [&_p]:mb-3 [&_p]:text-gray-600",
          "[&_strong]:font-semibold [&_strong]:text-gray-700",
          "[&_li]:text-gray-600",
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
                  className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-700"
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
                  className="text-blue-500 no-underline hover:underline"
                >
                  {children}
                </a>
              );
            },
            blockquote({ children }: { children?: React.ReactNode }) {
              return (
                <blockquote className="my-4 border-l-4 border-blue-200 pl-4 italic text-gray-500">
                  {children}
                </blockquote>
              );
            },
            ul({ children }: { children?: React.ReactNode }) {
              return (
                <ul className="my-3 list-disc pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1">
                  {children}
                </ul>
              );
            },
            ol({ children }: { children?: React.ReactNode }) {
              return (
                <ol className="my-3 list-decimal pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1">
                  {children}
                </ol>
              );
            },
            table({ children }: { children?: React.ReactNode }) {
              return (
                <div className="my-4 overflow-x-auto">
                  <table className="w-full border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_td]:text-gray-600 [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-700">
                    {children}
                  </table>
                </div>
              );
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
