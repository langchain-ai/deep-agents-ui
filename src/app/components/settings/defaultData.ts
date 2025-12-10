import type { ModelOption, ToolOption } from "@/app/types/types";

// 默认模型数据（当 API 不可用时使用）
export function getDefaultModels(): ModelOption[] {
  return [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", description: "Most capable model with vision", contextWindow: 128000 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", description: "Fast and cost-effective", contextWindow: 128000 },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", description: "Fast and powerful", contextWindow: 128000 },
    { id: "o1", name: "O1", provider: "openai", description: "Advanced reasoning model", contextWindow: 128000 },
    { id: "o1-mini", name: "O1 Mini", provider: "openai", description: "Fast reasoning model", contextWindow: 128000 },
    
    { id: "gpt-4o-azure", name: "GPT-4o", provider: "azure", description: "Azure OpenAI GPT-4o", contextWindow: 128000 },
    { id: "gpt-4-turbo-azure", name: "GPT-4 Turbo", provider: "azure", description: "Azure OpenAI GPT-4 Turbo", contextWindow: 128000 },
    { id: "gpt-35-turbo-azure", name: "GPT-3.5 Turbo", provider: "azure", description: "Azure OpenAI GPT-3.5", contextWindow: 16385 },
    { id: "o1-azure", name: "O1", provider: "azure", description: "Azure OpenAI O1", contextWindow: 128000 },
    
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", description: "Most capable Claude", contextWindow: 200000 },
    { id: "claude-3-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic", description: "Balanced performance", contextWindow: 200000 },
    { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "anthropic", description: "Fastest Claude", contextWindow: 200000 },
    
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", description: "Google's flagship model", contextWindow: 1000000 },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", description: "Fast Gemini model", contextWindow: 1000000 },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", description: "Latest Gemini model", contextWindow: 1000000 },
    
    { id: "pplx-7b-online", name: "Perplexity 7B Online", provider: "perplexity", description: "Real-time search model", contextWindow: 4096 },
    { id: "pplx-70b-online", name: "Perplexity 70B Online", provider: "perplexity", description: "Advanced search model", contextWindow: 4096 },
  ];
}

// 默认工具数据
export function getDefaultTools(): ToolOption[] {
  return [
    { id: "web_search", name: "Web Search", category: "Search", description: "Search the web using Tavily", enabled: true },
    { id: "perplexity_search", name: "Perplexity Search", category: "Search", description: "AI-powered search with citations", enabled: true },
    { id: "keyword_research", name: "Keyword Research", category: "Search", description: "Research keywords with volume and difficulty", enabled: false },
    { id: "eeat_evaluation", name: "EEAT-CORE Evaluation", category: "Search", description: "Evaluate page quality using EEAT-CORE", enabled: false },
    { id: "serp_analysis", name: "SERP Analysis", category: "Search", description: "Analyze search result page structure", enabled: false },
    { id: "code_interpreter", name: "Code Interpreter", category: "Code", description: "Execute Python code", enabled: true },
    { id: "code_analyzer", name: "Code Analyzer", category: "Code", description: "Analyze and review code", enabled: true },
    { id: "file_reader", name: "File Reader", category: "File", description: "Read various file formats", enabled: true },
    { id: "file_writer", name: "File Writer", category: "File", description: "Create and modify files", enabled: true },
    { id: "image_generator", name: "Image Generator", category: "Image", description: "Generate images using AI", enabled: false },
    { id: "image_analyzer", name: "Image Analyzer", category: "Image", description: "Analyze and describe images", enabled: true },
    { id: "database_query", name: "Database Query", category: "Database", description: "Execute SQL queries", enabled: false },
    { id: "api_caller", name: "API Caller", category: "Web", description: "Make HTTP requests", enabled: true },
    { id: "terminal", name: "Terminal", category: "Terminal", description: "Execute shell commands", enabled: false },
    { id: "calculator", name: "Calculator", category: "General", description: "Perform calculations", enabled: true },
    { id: "datetime", name: "Date & Time", category: "General", description: "Get current date and time", enabled: true },
    { id: "json_parser", name: "JSON Parser", category: "General", description: "Parse and format JSON", enabled: true },
    { id: "markdown_renderer", name: "Markdown Renderer", category: "General", description: "Render markdown to HTML", enabled: true },
  ];
}

