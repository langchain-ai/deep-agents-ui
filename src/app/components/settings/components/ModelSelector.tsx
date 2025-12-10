"use client";

import React from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption } from "@/app/types/types";
import { PROVIDER_ICONS, PROVIDER_COLORS, PROVIDER_DISPLAY_NAMES } from "../constants";

interface ModelSelectorProps {
  models: ModelOption[];
  modelsByProvider: Record<string, ModelOption[]>;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  expandedProviders: Set<string>;
  onToggleProvider: (provider: string) => void;
  title?: string;
  description?: string;
}

export function ModelSelector({
  modelsByProvider,
  selectedModelId,
  onSelectModel,
  expandedProviders,
  onToggleProvider,
  title,
  description,
}: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <div
            key={provider}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <button
              onClick={() => onToggleProvider(provider)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    PROVIDER_COLORS[provider] || PROVIDER_COLORS.default
                  )}
                >
                  {PROVIDER_ICONS[provider] || PROVIDER_ICONS.default}
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">
                    {PROVIDER_DISPLAY_NAMES[provider] || provider}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {providerModels.length} models
                  </span>
                </div>
              </div>
              {expandedProviders.has(provider) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expandedProviders.has(provider) && (
              <div className="grid grid-cols-2 gap-2 border-t border-border px-4 pb-4 pt-3">
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      selectedModelId === model.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          selectedModelId === model.id ? "text-primary" : "text-foreground"
                        )}>
                          {model.name}
                        </span>
                        {selectedModelId === model.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {model.contextWindow && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(model.contextWindow / 1000)}K context
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 简化版模型选择器（下拉框）
interface ModelSelectDropdownProps {
  models: ModelOption[];
  modelsByProvider: Record<string, ModelOption[]>;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  placeholder?: string;
  className?: string;
}

export function ModelSelectDropdown({
  modelsByProvider,
  selectedModelId,
  onSelectModel,
  placeholder = "Select a model",
  className,
}: ModelSelectDropdownProps) {
  return (
    <select
      value={selectedModelId}
      onChange={(e) => onSelectModel(e.target.value)}
      className={cn(
        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
        <optgroup
          key={provider}
          label={PROVIDER_DISPLAY_NAMES[provider] || provider}
        >
          {providerModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

