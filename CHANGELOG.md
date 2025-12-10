# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 测试环境部署配置和脚本

---

## [0.2.0] - 2024-12-09

### Added
- 🔐 **用户认证系统**
  - 登录/注册页面
  - JWT Token 认证
  - AuthProvider 状态管理

- 💬 **聊天核心功能**
  - ChatInterface 聊天界面组件
  - ChatMessage 消息渲染（支持 Markdown）
  - ConversationList 会话列表管理
  - 实时流式响应（WebSocket/SSE）

- 🤖 **Agent 功能**
  - ToolCallBox 工具调用展示
  - ToolApprovalInterrupt 工具审批中断
  - SubAgentIndicator 子 Agent 状态指示
  - 任务（Todos）实时追踪

- 📁 **文件管理**
  - RightSidebar 文件列表展示
  - FileViewDialog 文件查看对话框
  - FileDiffView 文件差异对比
  - 代码语法高亮

- ⚙️ **设置系统**
  - SettingsDialog 设置对话框
  - MainAgentTab 主 Agent 配置
  - SubAgentsTab 子 Agent 配置
  - ToolsTab 工具配置
  - ContextTab Context/RAG 配置
  - AppearanceTab 外观设置

- 📄 **Context/RAG 功能**
  - ContextProvider 文件状态管理
  - ContextFilePreview 文件预览
  - 文件上传和管理

- 🎨 **UI 组件**
  - 基于 shadcn/ui 的组件库
  - 亮色/暗色主题支持
  - 响应式布局设计

- 🛠 **开发工具**
  - TypeScript 类型定义
  - ESLint + Prettier 代码规范
  - API Client 封装

### Changed
- 从原始 deepagents-ui 重构为 Seenos UI
- 升级 Next.js 到 14+ 版本
- 使用 App Router 替代 Pages Router

### Technical
- Next.js 14 (App Router)
- TypeScript 5.x
- Tailwind CSS 3.x
- React 19
- shadcn/ui 组件库

---

## [0.1.0] - 2024-11-01

### Added
- 项目初始化
- 基础项目结构搭建
- 初始 UI 框架

---

[Unreleased]: https://github.com/your-org/seenos-ui/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/your-org/seenos-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/seenos-ui/releases/tag/v0.1.0

