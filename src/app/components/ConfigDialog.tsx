"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandaloneConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Project {
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
  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || ""
  );
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || ""
  );
  const [llmModelName, setLlmModelName] = useState(
    initialConfig?.llmModelName
  );
  const [project, setProject] = useState(
    initialConfig?.project || ""
  );
  const [subagentModelOverrides, setSubagentModelOverrides] = useState(
    initialConfig?.subagentModelOverrides || ""
  );
  const [subagentModelOverridesError, setSubagentModelOverridesError] = useState<
    string | null
  >(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);

  useEffect(() => {
    if (open && initialConfig) {
      setDeploymentUrl(initialConfig.deploymentUrl);
      setAssistantId(initialConfig.assistantId);
      setLlmModelName(initialConfig.llmModelName);
      setProject(initialConfig.project || "");
      setSubagentModelOverrides(initialConfig.subagentModelOverrides || "");
      setSubagentModelOverridesError(null);
    }
  }, [open, initialConfig]);

  // Load projects and LLM models from config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
          setLlmModels(data.models || []);
          setAssistants(data.assistants || []);
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
    if (!deploymentUrl || !assistantId) {
      alert("Please fill in all required fields");
      return;
    }

    if (subagentModelOverridesError) {
      alert("Please fix the JSON in subagent model overrides before saving.");
      return;
    }

    onSave({
      deploymentUrl,
      assistantId,
      llmModelName: llmModelName || undefined,
      project: project || undefined,
      subagentModelOverrides: subagentModelOverrides || undefined,
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
            <Input
              id="deploymentUrl"
              placeholder="https://<deployment-url>"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistantId">Assistant ID</Label>
            <Select
              value={assistantId}
              onValueChange={setAssistantId}
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
            <Label htmlFor="llmModelName">
              LLM Model Name{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
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
                onClick={() => {
                  const model = llmModelName;
                  const template = {
                    "default-researcher": model,
                    "qa-requirements-researcher": model,
                    "ba-requirements-reviewer": model,
                    "business-story-to-ba-specification-developer": model,
                  };
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
                placeholder={`{\n  "default-researcher": "openai:gpt-5.4",\n  "qa-requirements-researcher": "openai:gpt-5.4"\n}`}
                extensions={[jsonLang()]}
                className="w-full"
                onChange={(value) => {
                  setSubagentModelOverrides(value);
                  if (!value.trim()) {
                    setSubagentModelOverridesError(null);
                    return;
                  }
                  try {
                    const parsed = JSON.parse(value);
                    if (
                      !parsed ||
                      typeof parsed !== "object" ||
                      Array.isArray(parsed)
                    ) {
                      setSubagentModelOverridesError(
                        "Value must be a JSON object (e.g. {\"default-researcher\": \"model-id\"}).",
                      );
                    } else {
                      setSubagentModelOverridesError(null);
                    }
                  } catch {
                    setSubagentModelOverridesError("Invalid JSON.");
                  }
                }}
              />
            </div>
            {subagentModelOverridesError ? (
              <p className="text-xs text-destructive">
                {subagentModelOverridesError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Provide a JSON object mapping research subagent names to model
                IDs. Keys must match existing subagents.
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
