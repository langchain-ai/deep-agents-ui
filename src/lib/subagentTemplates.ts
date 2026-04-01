/** Parse one assistant's subagentModelOverrideTemplates object from config.json. */
export function parseAssistantTemplateObject(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const inner: Record<string, string> = {};
  for (const [subKey, modelId] of Object.entries(raw)) {
    if (typeof modelId === "string") {
      inner[subKey] = modelId;
    }
  }
  return inner;
}

/**
 * Templates from assistants[].subagentModelOverrideTemplates (keyed by assistant value/id).
 */
export function buildSubagentTemplatesByAssistantId(data: {
  assistants?: unknown;
}): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  const list = data.assistants;
  if (!Array.isArray(list)) {
    return out;
  }
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const id = rec.value;
    if (typeof id !== "string") continue;
    const tmpl = parseAssistantTemplateObject(rec.subagentModelOverrideTemplates);
    if (Object.keys(tmpl).length > 0) {
      out[id] = tmpl;
    }
  }
  return out;
}

/** Parse saved per-assistant JSON override string; invalid or empty → undefined. */
export function parseSubagentOverridesRaw(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Merge config.json template with optional localStorage override for one assistant.
 * Saved keys override template keys.
 */
export function mergeSubagentModelsForAssistant(
  template: Record<string, string>,
  rawOverride: string | undefined,
): Record<string, string> {
  const user = parseSubagentOverridesRaw(rawOverride);
  if (!user) {
    return { ...template };
  }
  return { ...template, ...user };
}
