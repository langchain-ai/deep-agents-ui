"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import type { UserSettings, ModelOption, ToolOption } from "@/app/types/types";
import { Loader2, Check, X } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, getAvailableModels, getAvailableTools } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [mainAgentModel, setMainAgentModel] = useState(settings?.mainAgentModel || "");
  const [subAgentModel, setSubAgentModel] = useState(settings?.subAgentModel || "");
  const [enabledTools, setEnabledTools] = useState<string[]>(settings?.enabledTools || []);
  const [theme, setTheme] = useState<"light" | "dark">(settings?.theme || "light");

  // Available options
  const [models, setModels] = useState<ModelOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);

  // Load available models and tools
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([getAvailableModels(), getAvailableTools()])
        .then(([modelsData, toolsData]) => {
          setModels(modelsData);
          setTools(toolsData);
        })
        .catch((err) => {
          console.error("Failed to load options:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, getAvailableModels, getAvailableTools]);

  // Sync with settings
  useEffect(() => {
    if (settings) {
      setMainAgentModel(settings.mainAgentModel);
      setSubAgentModel(settings.subAgentModel);
      setEnabledTools(settings.enabledTools);
      setTheme(settings.theme);
    }
  }, [settings]);

  // Handle tool toggle
  const handleToolToggle = useCallback((toolId: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSettings({
        mainAgentModel,
        subAgentModel,
        enabledTools,
        theme,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [mainAgentModel, subAgentModel, enabledTools, theme, updateSettings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your agent models and tools preferences.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Settings saved successfully
              </div>
            )}

            {/* Main Agent Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Agent Model
              </label>
              <select
                value={mainAgentModel}
                onChange={(e) => setMainAgentModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The primary model used for main agent responses.
              </p>
            </div>

            {/* Sub Agent Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Agent Model
              </label>
              <select
                value={subAgentModel}
                onChange={(e) => setSubAgentModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The model used for sub-agent tasks and tool execution.
              </p>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Light</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Dark</span>
                </label>
              </div>
            </div>

            {/* Enabled Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enabled Tools
              </label>
              <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {tools.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No tools available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tools.map((tool) => (
                      <label
                        key={tool.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enabledTools.includes(tool.id)}
                          onChange={() => handleToolToggle(tool.id)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {tool.name}
                          </div>
                          {tool.description && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {tool.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select which tools the agent can use during conversations.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

