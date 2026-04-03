export interface StandaloneConfig {
  deploymentUrl: string;
  assistantId: string;
  langsmithApiKey?: string;
  llmModelName: string;
  project?: string;
  /** When true, show internal LLM/agent steps in the UI. */
  showInternalSteps?: boolean;
  /** Per-assistant JSON string of subagent name → model id; missing entry uses assistants[].subagentModelOverrideTemplates or {} */
  subagentModelOverridesByAssistant?: Record<string, string>;
}

const CONFIG_KEY = "deep-agent-config";

export function getConfig(): StandaloneConfig | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveConfig(config: StandaloneConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** Raw JSON string for subagent overrides for the active assistant. */
export function getSubagentOverridesRawForAssistant(
  config: StandaloneConfig,
): string | undefined {
  return config.subagentModelOverridesByAssistant?.[config.assistantId];
}
