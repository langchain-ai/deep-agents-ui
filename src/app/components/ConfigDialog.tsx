"use client";

import { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandaloneConfig } from "@/lib/config";
import { buildSubagentTemplatesByAssistantId } from "@/lib/subagentTemplates";
import { cn } from "@/lib/utils";

function validateSubagentOverridesJson(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return 'Value must be a JSON object (e.g. {"subagent-name": "model-id"}).';
    }
    return null;
  } catch {
    return "Invalid JSON.";
  }
}

interface Project {
  value: string;
  label: string;
}

interface Deployment {
  value: string;
  label: string;
}

interface LLMModel {
  value: string;
  label: string;
}

interface Assistant {
  value: string;
  label: string;
  /** Default subagent → model map for this assistant (from config.json). */
  subagentModelOverrideTemplates?: Record<string, string>;
}

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: ConfigDialogProps) {
  const DEFAULT_LLM_MODEL_NAME = "litellm:openai/gpt-5-mini";

  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || ""
  );
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || ""
  );
  const [llmModelName, setLlmModelName] = useState(
    initialConfig?.llmModelName || DEFAULT_LLM_MODEL_NAME
  );
  const [project, setProject] = useState(
    initialConfig?.project || ""
  );
  const [subagentModelOverrides, setSubagentModelOverrides] = useState("");
  const [subagentModelOverridesError, setSubagentModelOverridesError] = useState<
    string | null
  >(null);
  const [overridesByAssistant, setOverridesByAssistant] = useState<
    Record<string, string>
  >({});
  const [subagentModelOverrideTemplates, setSubagentModelOverrideTemplates] =
    useState<Record<string, Record<string, string>>>({});
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);

  const assistantIdRef = useRef(assistantId);
  const overridesMapRef = useRef(overridesByAssistant);
  assistantIdRef.current = assistantId;
  overridesMapRef.current = overridesByAssistant;

  useEffect(() => {
    if (open && initialConfig) {
      setDeploymentUrl(initialConfig.deploymentUrl);
      setAssistantId(initialConfig.assistantId);
      setLlmModelName(initialConfig.llmModelName || DEFAULT_LLM_MODEL_NAME);
      setProject(initialConfig.project || "");
      const map = { ...(initialConfig.subagentModelOverridesByAssistant ?? {}) };
      const id = initialConfig.assistantId;
      setOverridesByAssistant(map);
      const editor =
        map[id] !== undefined
          ? map[id]!
          : JSON.stringify({}, null, 2);
      setSubagentModelOverrides(editor);
      setSubagentModelOverridesError(null);
    }
  }, [open, initialConfig]);

  // When config.json templates load, hydrate empty "{}" editor from template for this assistant.
  useEffect(() => {
    if (!open) return;
    const id = assistantIdRef.current;
    const map = overridesMapRef.current;
    setSubagentModelOverrides((cur) => {
      if (map[id] !== undefined) {
        return map[id]!;
      }
      const tmpl = subagentModelOverrideTemplates[id] ?? {};
      if (Object.keys(tmpl).length === 0) {
        return cur;
      }
      const compact = cur.trim().replace(/\s/g, "");
      if (compact !== "" && compact !== "{}") {
        return cur;
      }
      return JSON.stringify(tmpl, null, 2);
    });
  }, [subagentModelOverrideTemplates, open]);

  // Load projects and LLM models from config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setDeployments(data.deployments || []);
          setProjects(data.projects || []);
          setLlmModels(data.models || []);
          setAssistants(data.assistants || []);
          setSubagentModelOverrideTemplates(
            buildSubagentTemplatesByAssistantId(data),
          );
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };

    if (open) {
      loadConfig();
    }
  }, [open]);

  const handleSave = () => {
    if (!deploymentUrl || !assistantId || !llmModelName) {
      alert("Please fill in all required fields");
      return;
    }

    if (subagentModelOverridesError) {
      alert("Please fix the JSON in subagent model overrides before saving.");
      return;
    }

    const mergedOverrides = {
      ...overridesByAssistant,
      [assistantId]: subagentModelOverrides,
    };
    onSave({
      ...(initialConfig ?? {}),
      deploymentUrl,
      assistantId,
      llmModelName,
      project: project || undefined,
      subagentModelOverridesByAssistant: mergedOverrides,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Configure your LangGraph deployment settings. These settings are
            saved in your browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deploymentUrl">Deployment URL</Label>
            <Select
              value={deploymentUrl}
              onValueChange={setDeploymentUrl}
            >
              <SelectTrigger id="deploymentUrl">
                <SelectValue placeholder="Select a deployment URL" />
              </SelectTrigger>
              <SelectContent>
                {[
                  ...deployments,
                  ...(deploymentUrl &&
                  !deployments.some((deployment) => deployment.value === deploymentUrl)
                    ? [{ value: deploymentUrl, label: deploymentUrl }]
                    : []),
                ].map((deployment) => (
                  <SelectItem key={deployment.value} value={deployment.value}>
                    {deployment.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistantId">Assistant ID</Label>
            <Select
              value={assistantId}
              onValueChange={(newAssistantId) => {
                const next = {
                  ...overridesByAssistant,
                  [assistantId]: subagentModelOverrides,
                };
                setOverridesByAssistant(next);
                const editor =
                  next[newAssistantId] !== undefined
                    ? next[newAssistantId]!
                    : JSON.stringify(
                        subagentModelOverrideTemplates[newAssistantId] ?? {},
                        null,
                        2,
                      );
                setSubagentModelOverrides(editor);
                setSubagentModelOverridesError(
                  validateSubagentOverridesJson(editor),
                );
                setAssistantId(newAssistantId);
              }}
            >
              <SelectTrigger id="assistantId">
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                {[
                  ...assistants,
                  ...(assistantId && !assistants.some((a) => a.value === assistantId)
                    ? [{ value: assistantId, label: assistantId }]
                    : []),
                ].map((assistant) => (
                  <SelectItem key={assistant.value} value={assistant.value}>
                    {assistant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project">
              Project{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Select
              value={project}
              onValueChange={setProject}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj) => (
                  <SelectItem key={proj.value} value={proj.value}>
                    {proj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="llmModelName">LLM Model Name</Label>
            <Select
              value={llmModelName}
              onValueChange={setLlmModelName}
            >
              <SelectTrigger id="llmModelName">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {llmModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="subagentModelOverrides">
                Subagent model overrides{" "}
                <span className="text-muted-foreground">(JSON, optional)</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  Object.keys(
                    subagentModelOverrideTemplates[assistantId] ?? {},
                  ).length === 0
                }
                title={
                  Object.keys(
                    subagentModelOverrideTemplates[assistantId] ?? {},
                  ).length === 0
                    ? "Add subagentModelOverrideTemplates for this assistant in config.json"
                    : undefined
                }
                onClick={() => {
                  const model = llmModelName;
                  const tmplKeys = Object.keys(
                    subagentModelOverrideTemplates[assistantId] ?? {},
                  );
                  const template = Object.fromEntries(
                    tmplKeys.map((k) => [k, model]),
                  );
                  const value = JSON.stringify(template, null, 2);
                  setSubagentModelOverrides(value);
                  setSubagentModelOverridesError(null);
                }}
              >
                Use current model for all
              </Button>
            </div>
            <div
              className={cn(
                "w-full overflow-hidden rounded-md border text-xs font-mono",
                subagentModelOverridesError
                  ? "border-destructive"
                  : "border-input",
              )}
            >
              <CodeMirror
                value={subagentModelOverrides}
                height="140px"
                theme={oneDark}
                basicSetup={{ lineNumbers: false }}
                placeholder={`{\n  "subagent-name": "model-id"\n}`}
                extensions={[jsonLang()]}
                className="w-full"
                onChange={(value) => {
                  setSubagentModelOverrides(value);
                  setSubagentModelOverridesError(
                    validateSubagentOverridesJson(value),
                  );
                }}
              />
            </div>
            {subagentModelOverridesError ? (
              <p className="text-xs text-destructive">
                {subagentModelOverridesError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Per-assistant overrides: defaults come from each entry in{" "}
                <code className="text-xs">config.json</code>{" "}
                <code className="text-xs">assistants</code> via optional{" "}
                <code className="text-xs">subagentModelOverrideTemplates</code>
                ; omitted or empty uses{" "}
                <code className="text-xs">{"{}"}</code>.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
