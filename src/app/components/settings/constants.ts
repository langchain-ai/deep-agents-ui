import React from "react";
import {
  Sparkles,
  Bot,
  Globe,
  Cpu,
  Zap,
  MessageSquare,
  Brain,
  Search,
  Code,
  FileText,
  Database,
  Image as ImageIcon,
  Terminal,
  Wrench,
} from "lucide-react";

// 提供商图标映射
export const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  openai: React.createElement(Sparkles, { className: "h-4 w-4" }),
  anthropic: React.createElement(Bot, { className: "h-4 w-4" }),
  google: React.createElement(Globe, { className: "h-4 w-4" }),
  azure: React.createElement(Cpu, { className: "h-4 w-4" }),
  mistral: React.createElement(Zap, { className: "h-4 w-4" }),
  cohere: React.createElement(MessageSquare, { className: "h-4 w-4" }),
  deepseek: React.createElement(Brain, { className: "h-4 w-4" }),
  perplexity: React.createElement(Search, { className: "h-4 w-4" }),
  default: React.createElement(Cpu, { className: "h-4 w-4" }),
};

// 提供商颜色 - 支持深色模式
export const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  anthropic: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  google: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  azure: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  mistral: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  cohere: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800",
  deepseek: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
  perplexity: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
  default: "bg-muted text-muted-foreground border-border",
};

// 工具分类图标
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Search: React.createElement(Search, { className: "h-4 w-4" }),
  Code: React.createElement(Code, { className: "h-4 w-4" }),
  File: React.createElement(FileText, { className: "h-4 w-4" }),
  Database: React.createElement(Database, { className: "h-4 w-4" }),
  Web: React.createElement(Globe, { className: "h-4 w-4" }),
  Image: React.createElement(ImageIcon, { className: "h-4 w-4" }),
  Terminal: React.createElement(Terminal, { className: "h-4 w-4" }),
  General: React.createElement(Wrench, { className: "h-4 w-4" }),
};

// 提供商显示名称
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  azure: "Azure",
  mistral: "Mistral",
  cohere: "Cohere",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
};

