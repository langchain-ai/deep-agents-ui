# DeepAgents 后端 API 规范文档

## 概述

本文档定义了 DeepAgents 前端与后端之间的完整 API 接口规范，包括 REST API 和 WebSocket/SSE 实时通信接口。

## 技术栈建议

- **Web 框架**: FastAPI (Python) / Express (Node.js) / Gin (Go)
- **数据库**: PostgreSQL
- **缓存**: Redis
- **消息队列**: Redis Pub/Sub 或 RabbitMQ
- **认证**: JWT (JSON Web Token)

---

## 一、数据模型

### 1.1 用户 (User)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string; // ISO 8601
}
```

### 1.2 用户设置 (UserSettings)

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    main_agent_model VARCHAR(100) DEFAULT 'gpt-4',
    sub_agent_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    enabled_tools JSONB DEFAULT '[]'::jsonb,
    theme VARCHAR(20) DEFAULT 'light',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
interface UserSettings {
  mainAgentModel: string;
  subAgentModel: string;
  enabledTools: string[];
  theme: 'light' | 'dark';
}
```

### 1.3 会话 (Conversation)

```sql
CREATE TABLE conversations (
    cid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'New Conversation',
    status VARCHAR(20) DEFAULT 'idle', -- idle, busy, interrupted, error
    message_count INTEGER DEFAULT 0,
    last_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

```typescript
interface Conversation {
  cid: string;
  title: string;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 1.4 消息 (Message)

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cid UUID NOT NULL REFERENCES conversations(cid) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system, tool
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    tool_calls JSONB DEFAULT NULL,
    tool_call_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_cid ON messages(cid);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

```typescript
interface Message {
  id: string;
  cid: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
  };
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolCallId?: string;
  createdAt: string;
}
```

### 1.5 任务 (Todo)

```sql
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cid UUID NOT NULL REFERENCES conversations(cid) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_todos_cid ON todos(cid);
```

```typescript
interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}
```

### 1.6 文件 (File)

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cid UUID NOT NULL REFERENCES conversations(cid) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cid, path)
);

CREATE INDEX idx_files_cid ON files(cid);
```

```typescript
interface FileItem {
  path: string;
  content: string;
  language?: string;
  updatedAt: string;
}
```

### 1.7 可用模型 (Model)

```sql
CREATE TABLE models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}
```

### 1.8 可用工具 (Tool)

```sql
CREATE TABLE tools (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
interface ToolOption {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}
```

---

## 二、REST API 接口

### 2.1 认证接口

#### POST /api/auth/register

用户注册。

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**响应 (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": null
  },
  "settings": {
    "mainAgentModel": "gpt-4",
    "subAgentModel": "gpt-3.5-turbo",
    "enabledTools": [],
    "theme": "light"
  }
}
```

**错误响应 (400):**
```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already registered"
  }
}
```

---

#### POST /api/auth/login

用户登录，返回 JWT token。

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应 (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://..."
  },
  "settings": {
    "mainAgentModel": "gpt-4",
    "subAgentModel": "gpt-3.5-turbo",
    "enabledTools": ["web_search", "code_interpreter"],
    "theme": "light"
  }
}
```

**错误响应 (401):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

#### POST /api/auth/logout

用户登出，使当前 token 失效。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true
}
```

#### GET /api/auth/me

获取当前登录用户信息。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://..."
  },
  "settings": {
    "mainAgentModel": "gpt-4",
    "subAgentModel": "gpt-3.5-turbo",
    "enabledTools": ["web_search", "code_interpreter"],
    "theme": "light"
  }
}
```

---

### 2.2 会话接口

#### GET /api/conversations

获取用户的会话列表（分页）。

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| offset | number | 否 | 0 | 偏移量 |
| limit | number | 否 | 20 | 每页数量 |
| status | string | 否 | - | 状态过滤 (idle/busy/interrupted/error) |

**响应 (200):**
```json
{
  "items": [
    {
      "cid": "uuid",
      "title": "Conversation Title",
      "status": "idle",
      "messageCount": 10,
      "lastMessage": "Last message preview...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 0,
  "pageSize": 20,
  "hasMore": true
}
```

#### POST /api/conversations

创建新会话。

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "title": "Optional Title"
}
```

**响应 (201):**
```json
{
  "cid": "uuid",
  "conversation": {
    "cid": "uuid",
    "title": "New Conversation",
    "status": "idle",
    "messageCount": 0,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/conversations/:cid

获取会话详情（包含消息历史）。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "cid": "uuid",
  "title": "Conversation Title",
  "status": "idle",
  "messageCount": 10,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Hello",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "createdAt": "2024-01-01T00:00:01Z"
    }
  ],
  "todos": [
    {
      "id": "uuid",
      "content": "Task 1",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "files": {
    "path/to/file.py": "file content..."
  }
}
```

#### PATCH /api/conversations/:cid

更新会话信息。

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "title": "New Title",
  "status": "idle"
}
```

**响应 (200):**
```json
{
  "conversation": {
    "cid": "uuid",
    "title": "New Title",
    "status": "idle",
    ...
  }
}
```

#### DELETE /api/conversations/:cid

删除会话。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true
}
```

#### PUT /api/conversations/:cid/files

更新会话中的文件。

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "files": {
    "path/to/file.py": "new content...",
    "path/to/another.js": "another content..."
  }
}
```

**响应 (200):**
```json
{
  "success": true
}
```

#### POST /api/conversations/:cid/continue

继续生成（用于工具调用后继续）。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true
}
```

#### POST /api/conversations/:cid/resolve

标记会话为已解决。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true
}
```

---

### 2.3 设置接口

#### GET /api/settings

获取用户设置。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "mainAgentModel": "gpt-4",
  "subAgentModel": "gpt-3.5-turbo",
  "enabledTools": ["web_search", "code_interpreter"],
  "theme": "light"
}
```

#### PUT /api/settings

更新用户设置。

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "mainAgentModel": "gpt-4-turbo",
  "subAgentModel": "gpt-4",
  "enabledTools": ["web_search", "code_interpreter", "file_browser"],
  "theme": "dark"
}
```

**响应 (200):**
```json
{
  "mainAgentModel": "gpt-4-turbo",
  "subAgentModel": "gpt-4",
  "enabledTools": ["web_search", "code_interpreter", "file_browser"],
  "theme": "dark"
}
```

---

### 2.4 模型和工具接口

#### GET /api/models

获取可用模型列表。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "models": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "OpenAI",
      "description": "Most capable GPT-4 model"
    },
    {
      "id": "gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "provider": "OpenAI",
      "description": "Faster GPT-4 model with 128k context"
    },
    {
      "id": "claude-3-opus",
      "name": "Claude 3 Opus",
      "provider": "Anthropic",
      "description": "Most capable Claude model"
    }
  ]
}
```

#### GET /api/tools

获取可用工具列表。

**请求头:**
```
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "tools": [
    {
      "id": "web_search",
      "name": "Web Search",
      "description": "Search the web for information",
      "enabled": true
    },
    {
      "id": "code_interpreter",
      "name": "Code Interpreter",
      "description": "Execute Python code",
      "enabled": true
    },
    {
      "id": "file_browser",
      "name": "File Browser",
      "description": "Browse and manage files",
      "enabled": false
    }
  ]
}
```

---

## 三、WebSocket 实时通信接口

### 3.1 连接

**URL:** `ws://backend/api/chat/stream?cid={cid}&token={token}`

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cid | string | 是 | 会话 ID |
| token | string | 是 | JWT token |

### 3.2 客户端 → 服务端消息

#### 发送用户消息

```json
{
  "type": "user_message",
  "data": {
    "content": "Hello, how are you?",
    "attachments": [
      {
        "type": "file",
        "name": "document.pdf",
        "content": "base64..."
      }
    ]
  },
  "timestamp": 1704067200000
}
```

#### 恢复中断

```json
{
  "type": "resume_interrupt",
  "data": {
    "interruptId": "interrupt-uuid",
    "decision": {
      "action": "approve",
      "reason": "User approved the action"
    }
  },
  "timestamp": 1704067200000
}
```

#### 停止生成

```json
{
  "type": "stop",
  "timestamp": 1704067200000
}
```

#### 心跳

```json
{
  "type": "ping",
  "timestamp": 1704067200000
}
```

### 3.3 服务端 → 客户端事件

#### connected - 连接成功

```json
{
  "type": "connected",
  "data": {
    "cid": "conversation-uuid"
  },
  "timestamp": 1704067200000
}
```

#### message_start - 消息开始

```json
{
  "type": "message_start",
  "data": {
    "messageId": "message-uuid",
    "role": "assistant"
  },
  "timestamp": 1704067200000
}
```

#### message_delta - 消息增量

```json
{
  "type": "message_delta",
  "data": {
    "messageId": "message-uuid",
    "delta": "Hello! "
  },
  "timestamp": 1704067200001
}
```

#### message_end - 消息结束

```json
{
  "type": "message_end",
  "data": {
    "messageId": "message-uuid",
    "content": "Hello! How can I help you today?"
  },
  "timestamp": 1704067200100
}
```

#### tool_call_start - 工具调用开始

```json
{
  "type": "tool_call_start",
  "data": {
    "toolCallId": "tool-call-uuid",
    "toolName": "web_search",
    "args": {
      "query": "latest news"
    }
  },
  "timestamp": 1704067200200
}
```

#### tool_call_result - 工具调用结果

```json
{
  "type": "tool_call_result",
  "data": {
    "toolCallId": "tool-call-uuid",
    "result": "Search results: ...",
    "error": null
  },
  "timestamp": 1704067200500
}
```

#### subagent_start - 子 Agent 开始

```json
{
  "type": "subagent_start",
  "data": {
    "subAgentId": "subagent-uuid",
    "subAgentName": "research_agent",
    "input": {
      "task": "Research the topic",
      "context": "..."
    }
  },
  "timestamp": 1704067200600
}
```

#### subagent_update - 子 Agent 更新

```json
{
  "type": "subagent_update",
  "data": {
    "subAgentId": "subagent-uuid",
    "status": "running",
    "progress": "Analyzing data..."
  },
  "timestamp": 1704067200700
}
```

#### subagent_end - 子 Agent 结束

```json
{
  "type": "subagent_end",
  "data": {
    "subAgentId": "subagent-uuid",
    "output": {
      "result": "Research completed",
      "findings": ["..."]
    },
    "error": null
  },
  "timestamp": 1704067200800
}
```

#### todo_update - 任务更新

```json
{
  "type": "todo_update",
  "data": {
    "todos": [
      {
        "id": "todo-uuid-1",
        "content": "Task 1",
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:01:00Z"
      },
      {
        "id": "todo-uuid-2",
        "content": "Task 2",
        "status": "in_progress",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:02:00Z"
      }
    ]
  },
  "timestamp": 1704067200900
}
```

#### file_update - 文件更新

```json
{
  "type": "file_update",
  "data": {
    "path": "src/main.py",
    "content": "print('Hello, World!')",
    "language": "python"
  },
  "timestamp": 1704067201000
}
```

#### state_update - 完整状态更新

用于恢复会话或同步状态。

```json
{
  "type": "state_update",
  "data": {
    "messages": [...],
    "todos": [...],
    "files": {
      "path/to/file.py": "content..."
    }
  },
  "timestamp": 1704067201100
}
```

#### interrupt - 需要用户确认

```json
{
  "type": "interrupt",
  "data": {
    "interruptId": "interrupt-uuid",
    "reason": "Tool requires user approval",
    "actionRequests": [
      {
        "name": "execute_code",
        "args": {
          "code": "rm -rf /"
        },
        "description": "Execute potentially dangerous code"
      }
    ],
    "reviewConfigs": [
      {
        "actionName": "execute_code",
        "allowedDecisions": ["approve", "reject", "modify"]
      }
    ],
    "value": {
      "action_requests": [...],
      "review_configs": [...]
    }
  },
  "timestamp": 1704067201200
}
```

#### error - 错误

```json
{
  "type": "error",
  "data": {
    "message": "An error occurred",
    "code": "INTERNAL_ERROR"
  },
  "timestamp": 1704067201300
}
```

#### done - 完成

```json
{
  "type": "done",
  "data": null,
  "timestamp": 1704067201400
}
```

---

## 四、SSE 备选方案

如果 WebSocket 不可用，可以使用 SSE 作为备选。

### 4.1 连接

**URL:** `GET /api/chat/stream?cid={cid}&token={token}`

**响应头:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 4.2 事件格式

```
event: message_start
data: {"messageId":"uuid","role":"assistant"}

event: message_delta
data: {"messageId":"uuid","delta":"Hello!"}

event: message_end
data: {"messageId":"uuid","content":"Hello! How can I help?"}
```

### 4.3 发送消息（HTTP）

由于 SSE 是单向的，发送消息需要通过 HTTP：

**POST /api/conversations/:cid/messages**

```json
{
  "content": "Hello",
  "attachments": []
}
```

**POST /api/conversations/:cid/interrupt/resume**

```json
{
  "interruptId": "uuid",
  "decision": {...}
}
```

**POST /api/conversations/:cid/stop**

---

## 五、错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| INVALID_CREDENTIALS | 401 | 无效的邮箱或密码 |
| UNAUTHORIZED | 401 | 未认证或 token 过期 |
| FORBIDDEN | 403 | 无权限访问 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| CONVERSATION_NOT_FOUND | 404 | 会话不存在 |
| CONVERSATION_BUSY | 409 | 会话正在处理中 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |

---

## 六、Python FastAPI 实现示例

### 6.1 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── config.py               # 配置
│   ├── database.py             # 数据库连接
│   ├── models/                 # SQLAlchemy 模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   ├── todo.py
│   │   └── file.py
│   ├── schemas/                # Pydantic 模式
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   └── settings.py
│   ├── api/                    # API 路由
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── conversations.py
│   │   ├── settings.py
│   │   └── models.py
│   ├── services/               # 业务逻辑
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── conversation_service.py
│   │   └── agent_service.py
│   ├── websocket/              # WebSocket 处理
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── handlers.py
│   └── utils/                  # 工具函数
│       ├── __init__.py
│       ├── jwt.py
│       └── password.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 6.2 主要代码示例

#### main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, conversations, settings, models
from app.websocket.manager import websocket_endpoint
from app.database import engine, Base

app = FastAPI(title="DeepAgents API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(models.router, prefix="/api", tags=["models"])

# WebSocket
app.add_api_websocket_route("/api/chat/stream", websocket_endpoint)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### websocket/manager.py

```python
from fastapi import WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import json
import asyncio
from app.utils.jwt import verify_token
from app.services.agent_service import AgentService

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, cid: str):
        await websocket.accept()
        if cid not in self.active_connections:
            self.active_connections[cid] = set()
        self.active_connections[cid].add(websocket)
    
    def disconnect(self, websocket: WebSocket, cid: str):
        if cid in self.active_connections:
            self.active_connections[cid].discard(websocket)
    
    async def send_event(self, cid: str, event_type: str, data: dict):
        if cid in self.active_connections:
            message = json.dumps({
                "type": event_type,
                "data": data,
                "timestamp": int(asyncio.get_event_loop().time() * 1000)
            })
            for connection in self.active_connections[cid]:
                await connection.send_text(message)

manager = ConnectionManager()

async def websocket_endpoint(
    websocket: WebSocket,
    cid: str = Query(...),
    token: str = Query(...)
):
    # 验证 token
    try:
        user = verify_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    await manager.connect(websocket, cid)
    
    # 发送连接成功事件
    await manager.send_event(cid, "connected", {"cid": cid})
    
    agent_service = AgentService(cid, user.id, manager)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "user_message":
                await agent_service.handle_user_message(message["data"])
            elif message["type"] == "resume_interrupt":
                await agent_service.handle_resume_interrupt(message["data"])
            elif message["type"] == "stop":
                await agent_service.handle_stop()
            elif message["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, cid)
```

#### services/agent_service.py

```python
from typing import Optional
import asyncio
from app.websocket.manager import ConnectionManager
from app.models.message import Message
from app.models.conversation import Conversation
# 导入 DeepAgents 框架
# from deepagents import Agent, Tool

class AgentService:
    def __init__(self, cid: str, user_id: str, ws_manager: ConnectionManager):
        self.cid = cid
        self.user_id = user_id
        self.ws_manager = ws_manager
        self.is_running = False
        self.current_task: Optional[asyncio.Task] = None
    
    async def handle_user_message(self, data: dict):
        content = data.get("content", "")
        
        # 保存用户消息
        user_message = await self._save_message("user", content)
        
        # 启动 Agent 处理
        self.is_running = True
        self.current_task = asyncio.create_task(self._run_agent(content))
    
    async def _run_agent(self, user_input: str):
        try:
            # 发送消息开始事件
            message_id = str(uuid.uuid4())
            await self.ws_manager.send_event(self.cid, "message_start", {
                "messageId": message_id,
                "role": "assistant"
            })
            
            # 这里集成 DeepAgents 框架
            # agent = Agent(...)
            # async for chunk in agent.stream(user_input):
            #     await self._handle_agent_chunk(message_id, chunk)
            
            # 模拟流式输出
            response = "Hello! I'm processing your request..."
            for char in response:
                if not self.is_running:
                    break
                await self.ws_manager.send_event(self.cid, "message_delta", {
                    "messageId": message_id,
                    "delta": char
                })
                await asyncio.sleep(0.05)
            
            # 发送消息结束事件
            await self.ws_manager.send_event(self.cid, "message_end", {
                "messageId": message_id,
                "content": response
            })
            
            # 保存助手消息
            await self._save_message("assistant", response, message_id)
            
            # 发送完成事件
            await self.ws_manager.send_event(self.cid, "done", None)
        
        except Exception as e:
            await self.ws_manager.send_event(self.cid, "error", {
                "message": str(e),
                "code": "AGENT_ERROR"
            })
        
        finally:
            self.is_running = False
    
    async def handle_resume_interrupt(self, data: dict):
        interrupt_id = data.get("interruptId")
        decision = data.get("decision")
        # 处理中断恢复逻辑
        pass
    
    async def handle_stop(self):
        self.is_running = False
        if self.current_task:
            self.current_task.cancel()
    
    async def _save_message(self, role: str, content: str, message_id: str = None):
        # 保存消息到数据库
        pass
```

---

## 七、环境变量配置

```bash
# 服务器配置
PORT=8000
HOST=0.0.0.0

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/deepagents

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# AI 模型 API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# 前端 URL（用于 CORS）
FRONTEND_URL=http://localhost:3000
```

---

## 八、部署

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/deepagents
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=deepagents
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 九、测试

### 测试连接

```bash
# 测试 REST API
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 测试 WebSocket
wscat -c "ws://localhost:8000/api/chat/stream?cid=test-cid&token=your-token"
```

---

本文档提供了完整的后端 API 规范，包括数据模型、REST API、WebSocket 实时通信接口以及 Python FastAPI 实现示例。后端开发人员可以根据此文档直接实现相应的接口。

