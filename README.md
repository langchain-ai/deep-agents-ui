# Deep Agents UI

Deep Agents are generic AI agents that are capable of handling tasks of varying complexity. This is a UI intended to be used alongside the [`deep-agents`](https://github.com/hwchase17/deepagents?ref=blog.langchain.com) package from LangChain.

If the term "Deep Agents" is new to you, check out these videos!
[What are Deep Agents?](https://www.youtube.com/watch?v=433SmtTc0TA)
[Implementing Deep Agents](https://www.youtube.com/watch?v=TTMYJAw5tiA&t=701s)

### Getting Started

Install all dependencies and run your app.

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to configure and test out your deep agent!

### Connecting to a Deep Agent

When you open the app for the first time, you will be prompted to configure your deployment settings. All settings are saved in your browser's local storage.

**Required Fields:**

- **Deployment URL**: The URL for the LangGraph deployment you are connecting to
- **Assistant ID**: The ID of the assistant or agent you want to use

**Optional Field:**

- **LangSmith API Key**: Your LangSmith API key (format: `lsv2_pt_...`). This may be required for accessing deployed LangGraph applications. You can also provide this via the `NEXT_PUBLIC_LANGSMITH_API_KEY` environment variable.

You can edit these settings at any time by clicking on the Settings button in the header.

### Optional: Environment Variables

You can optionally set environment variables instead of using the settings dialog:

```env
NEXT_PUBLIC_LANGSMITH_API_KEY="lsv2_xxxx"
```

**Note:** Settings configured in the UI take precedence over environment variables.

### Usage

You can run your Deep Agents in Debug Mode, which will execute the agent step by step. This will allow you to re-run the specific steps of the agent. This is intended to be used alongside the optimizer.

You can also turn off Debug Mode to run the full agent end-to-end.
