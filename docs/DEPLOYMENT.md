# Seenos UI 部署指南

本文档详细说明如何在不同环境中部署 Seenos UI 前端应用。

## 目录

- [环境要求](#环境要求)
- [环境配置](#环境配置)
- [部署方式](#部署方式)
  - [Docker 部署](#docker-部署)
  - [手动部署](#手动部署)
  - [Vercel 部署](#vercel-部署)
- [环境说明](#环境说明)
- [常见问题](#常见问题)

---

## 环境要求

### 系统要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+), macOS, Windows (WSL2)
- **内存**: 最低 1GB, 推荐 2GB+
- **磁盘**: 最低 1GB 可用空间

### 软件依赖

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | 18.x+ | JavaScript 运行时 |
| Yarn | 1.22.x+ | 包管理器 |
| Docker | 20.x+ | 容器运行时 (Docker 部署) |
| Docker Compose | 2.x+ | 容器编排 (Docker 部署) |

---

## 环境配置

### 环境变量

创建 `.env.local` (本地开发) 或设置环境变量：

```bash
# 必填 - 后端 API 地址
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# 可选 - WebSocket 地址 (不填则自动推导)
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com/api/chat/stream

# 可选 - SSE 地址 (备选方案)
NEXT_PUBLIC_SSE_URL=https://api.your-domain.com/api/chat/stream

# 可选 - 传输方式: websocket 或 sse
NEXT_PUBLIC_DEFAULT_TRANSPORT=websocket

# 可选 - 调试模式
NEXT_PUBLIC_DEBUG=false
```

### 各环境配置参考

#### 本地开发

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEBUG=true
```

#### 测试环境

```bash
NEXT_PUBLIC_API_URL=https://api-test.seenos.ai
NEXT_PUBLIC_WS_URL=wss://api-test.seenos.ai/api/chat/stream
NEXT_PUBLIC_DEBUG=true
```

#### 生产环境

```bash
NEXT_PUBLIC_API_URL=https://api.seenos.ai
NEXT_PUBLIC_WS_URL=wss://api.seenos.ai/api/chat/stream
NEXT_PUBLIC_DEBUG=false
```

---

## 部署方式

### Docker 部署

推荐的部署方式，适用于大多数场景。

#### 1. 快速部署

```bash
# 克隆项目
git clone <repository-url>
cd seenos-ui

# 测试环境部署
./scripts/deploy.sh test --build

# 生产环境部署
./scripts/deploy.sh production --build
```

#### 2. 手动 Docker 命令

```bash
# 构建镜像
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  -t seenos-ui:latest .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --name seenos-ui \
  --restart unless-stopped \
  seenos-ui:latest
```

#### 3. Docker Compose

```bash
# 测试环境
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# 生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### 4. 查看日志

```bash
# 实时日志
docker logs -f seenos-ui

# 最近 100 行
docker logs --tail 100 seenos-ui
```

---

### 手动部署

适用于没有 Docker 的环境或需要更细粒度控制的场景。

#### 1. 安装依赖

```bash
# 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 安装 Yarn
npm install -g yarn
```

#### 2. 构建项目

```bash
# 克隆项目
git clone <repository-url>
cd seenos-ui

# 安装依赖
yarn install --frozen-lockfile

# 设置环境变量
export NEXT_PUBLIC_API_URL=https://api.your-domain.com

# 构建
yarn build
```

#### 3. 启动服务

```bash
# 直接启动
yarn start

# 或使用 PM2
npm install -g pm2
pm2 start yarn --name seenos-ui -- start
pm2 save
```

#### 4. Nginx 反向代理 (可选)

```nginx
server {
    listen 80;
    server_name app.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Vercel 部署

适用于快速部署和自动化 CI/CD。

#### 1. 连接仓库

1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入 Git 仓库

#### 2. 配置环境变量

在 Vercel 项目设置中添加环境变量：

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL` (可选)
- `NEXT_PUBLIC_DEFAULT_TRANSPORT` (可选)

#### 3. 部署

- 推送到 `main` 分支自动部署到生产环境
- 推送到其他分支自动创建预览部署

---

## 环境说明

### 测试环境 (test)

- **用途**: 功能测试、集成测试
- **特点**: 
  - 启用调试模式
  - 连接测试后端 API
  - 单实例部署

### 预发布环境 (staging)

- **用途**: 上线前验证
- **特点**:
  - 配置与生产环境一致
  - 使用生产数据的副本
  - 用于最终验收测试

### 生产环境 (production)

- **用途**: 正式对外服务
- **特点**:
  - 关闭调试模式
  - 多实例部署 (高可用)
  - 资源限制和健康检查

---

## 常见问题

### Q: 构建失败，提示内存不足

**A**: 增加 Node.js 内存限制：

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
yarn build
```

### Q: WebSocket 连接失败

**A**: 检查以下几点：

1. 确认 `NEXT_PUBLIC_WS_URL` 配置正确
2. 确认后端 WebSocket 服务正常运行
3. 如果使用 Nginx，确保配置了 WebSocket 支持
4. 检查防火墙是否放行 WebSocket 端口

### Q: 静态资源 404

**A**: 确保 Next.js 的 `output: 'standalone'` 配置正确，并且 `.next/static` 目录被正确复制。

### Q: 容器健康检查失败

**A**: 

1. 检查容器日志：`docker logs seenos-ui`
2. 确认应用正常启动
3. 调整健康检查参数（增加 `start_period`）

### Q: 如何回滚部署

**A**: 

```bash
# Docker 方式
docker-compose down
docker tag seenos-ui:previous seenos-ui:latest
docker-compose up -d

# 或使用之前的镜像标签
docker run -d --name seenos-ui seenos-ui:v0.1.0
```

---

## 支持

如有问题，请：

1. 查看 [GitHub Issues](https://github.com/your-org/seenos-ui/issues)
2. 提交新 Issue
3. 联系开发团队

