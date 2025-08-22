# Deep Agents UI

Deep Agents are generic AI agents that are capable of handling tasks of varying complexity. This is a UI intended to be used alongside the [`deep-agents`](https://github.com/hwchase17/deepagents?ref=blog.langchain.com) package from LangChain.

If the term "Deep Agents" is new to you, check out these videos!
[What are Deep Agents?](https://www.youtube.com/watch?v=433SmtTc0TA)
[Implementing Deep Agents](https://www.youtube.com/watch?v=TTMYJAw5tiA&t=701s)


And check out this [video](https://youtu.be/0CE_BhdnZZI) for a walkthrough of this UI.

## Features

- **Multi-Agent Support**: Switch between different AI agents with completely isolated contexts
- **Agent-Scoped State**: Each agent maintains its own threads, todos, and files
- **Real-time Streaming**: Live updates from agent execution
- **Task Management**: Visual todo lists and file tracking per agent
- **Sub-Agent Visualization**: See spawned sub-agents and their status

## Configuration

### Connecting to a Local LangGraph Server

Create a `.env.local` file and set the server URL:

```env
NEXT_PUBLIC_DEPLOYMENT_URL="http://127.0.0.1:2024" # Or your server URL
```

### Connecting to a Production LangGraph Deployment on LGP

Create a `.env.local` file and set the deployment URL and API key:

```env
NEXT_PUBLIC_DEPLOYMENT_URL="your agent server URL"
NEXT_PUBLIC_LANGSMITH_API_KEY=<langsmith-api-key>
```

### Managing Available Agents

Agents are configured in `src/lib/agents/config.ts`. You can modify the `AVAILABLE_AGENTS` array to add, remove, or update agent configurations:

```typescript
export const AVAILABLE_AGENTS: Agent[] = [
  {
    id: "deepagent",
    name: "Deep Agent",
    description: "General purpose AI agent for complex tasks",
    color: "#3B82F6",
  },
  // Add more agents here...
];
```

Each agent must have a corresponding agent ID configured in your LangGraph server.

Once you have your environment variables set, install all dependencies and run your app.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to test out your deep agent!
