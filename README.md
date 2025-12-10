# 🚀 Seenos UI

Seenos AI Agent 平台的前端项目，基于 Next.js 14 (App Router) + TypeScript + Tailwind CSS 构建。

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [开发指南](#开发指南)
- [部署指南](#部署指南)
- [项目结构](#项目结构)

## ✨ 功能特性

- 🤖 **多 Agent 支持** - 主 Agent 和子 Agent 协同工作
- 💬 **实时对话** - WebSocket/SSE 流式响应
- 📁 **文件管理** - 查看、编辑 Agent 生成的文件
- ✅ **任务追踪** - 实时显示 Agent 任务进度
- 🔧 **工具调用** - 可视化展示工具调用过程
- 🎨 **主题切换** - 支持亮色/暗色主题
- 📱 **响应式设计** - 适配桌面和移动端

## 🛠 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS + CSS Variables
- **UI 组件**: shadcn/ui (Radix UI primitives)
- **状态管理**: React Context + Custom Hooks
- **数据获取**: SWR
- **实时通信**: WebSocket / SSE

## 🚀 快速开始

### 前置要求

- Node.js 18.x 或更高版本
- Yarn 1.22.x 或更高版本
- 后端 API 服务 (参考 `docs/BACKEND_API_SPEC.md`)

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd seenos-ui

# 安装依赖
yarn install
```

### 本地开发

```bash
# 复制环境配置
cp env.example .env.local

# 编辑 .env.local，配置后端 API 地址
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 启动开发服务器
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## ⚙️ 环境配置

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | 是 | `http://localhost:8000` | 后端 API 基础 URL |
| `NEXT_PUBLIC_WS_URL` | 否 | - | WebSocket URL (不填则自动从 API_URL 推导) |
| `NEXT_PUBLIC_SSE_URL` | 否 | - | SSE URL (备选方案) |
| `NEXT_PUBLIC_DEFAULT_TRANSPORT` | 否 | `websocket` | 默认传输方式: `websocket` 或 `sse` |
| `NEXT_PUBLIC_DEBUG` | 否 | `false` | 是否启用调试模式 |

### 环境配置文件

- `.env.local` - 本地开发环境 (不提交到 Git)
- `.env.development` - 开发环境默认配置
- `.env.production` - 生产环境默认配置
- `.env.test` - 测试环境配置

## 📖 开发指南

### 常用命令

```bash
# 开发模式 (Turbopack)
yarn dev

# 构建生产版本
yarn build

# 启动生产服务
yarn start

# 代码检查
yarn lint
yarn lint:fix

# 代码格式化
yarn format
yarn format:check
```

### 添加新组件

```bash
# 使用 shadcn CLI 添加 UI 组件
npx shadcn-ui@latest add <component-name>
```

### 代码规范

- 使用 ESLint + Prettier 进行代码检查和格式化
- 组件使用 PascalCase 命名
- Hooks 使用 `use` 前缀
- 使用 `@/` 路径别名导入

## 🚢 部署指南

### Docker 部署 (推荐)

```bash
# 构建镜像
docker build -t seenos-ui:latest .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  --name seenos-ui \
  seenos-ui:latest
```

### Docker Compose 部署

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动部署

```bash
# 1. 安装依赖
yarn install --frozen-lockfile

# 2. 构建
yarn build

# 3. 启动
yarn start
```

### 部署脚本

```bash
# 使用部署脚本 (需要先配置)
./scripts/deploy.sh [test|staging|production]
```

## 📁 项目结构

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # 认证路由组
│   │   ├── login/page.tsx         # 登录页面
│   │   └── register/page.tsx      # 注册页面
│   ├── components/                # 业务组件
│   │   ├── ChatInterface.tsx      # 聊天界面
│   │   ├── ChatMessage.tsx        # 消息组件
│   │   ├── ConversationList.tsx   # 会话列表
│   │   ├── LeftSidebar.tsx        # 左侧边栏
│   │   ├── RightSidebar.tsx       # 右侧边栏
│   │   └── settings/              # 设置组件
│   ├── types/                     # 类型定义
│   └── globals.css                # 全局样式
├── components/ui/                 # shadcn/ui 组件
├── hooks/                         # 自定义 Hooks
├── lib/                           # 工具库
│   ├── api/client.ts              # API 客户端
│   └── stream/                    # 流处理
└── providers/                     # React Context
```

## 📚 文档

- [后端 API 规范](./docs/BACKEND_API_SPEC.md)
- [前端开发规范](./.cursorrules)

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)

## 📝 License

MIT License - 详见 [LICENSE](./LICENSE) 文件
