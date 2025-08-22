"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useEnvConfig } from "@/providers/EnvConfig";
import { cn } from "@/lib/utils";

interface EnvConfig {
  DEPLOYMENT_URL: string;
  ASSISTANT_ID: string;
  LANGSMITH_API_KEY: string;
}

const REQUIRED_KEYS: Array<keyof EnvConfig> = [
  "DEPLOYMENT_URL",
  "ASSISTANT_ID",
];

const OPTIONAL_KEYS: Array<keyof EnvConfig> = ["LANGSMITH_API_KEY"];

const ENV_KEYS: Array<keyof EnvConfig> = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

const ENV_LABELS: Record<keyof EnvConfig, string> = {
  DEPLOYMENT_URL: "Agent Deployment URL",
  ASSISTANT_ID: "Assistant ID",
  LANGSMITH_API_KEY: "LangSmith API Key",
};

const ENV_PLACEHOLDERS: Record<keyof EnvConfig, string> = {
  DEPLOYMENT_URL: "http://127.0.0.1:2024 for locally running agents",
  ASSISTANT_ID: "ex. asdfasdf-asdf-asdf-asdf-asdfasdfasdf",
  LANGSMITH_API_KEY: "Optional, not necessary for locally running agents",
};

interface EnvConfigDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  isSettings?: boolean;
}

export const EnvConfigDialog: React.FC<EnvConfigDialogProps> = ({
  isOpen,
  onClose,
  isSettings = false,
}) => {
  const { updateConfig } = useEnvConfig();
  const [config, setConfig] = useState<EnvConfig>({
    DEPLOYMENT_URL: "",
    ASSISTANT_ID: "",
    LANGSMITH_API_KEY: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof EnvConfig, boolean>>
  >({});

  useEffect(() => {
    const loadedConfig: Partial<EnvConfig> = {};
    ENV_KEYS.forEach((key) => {
      const storedValue = localStorage.getItem(key);
      loadedConfig[key] = storedValue || "";
    });
    setConfig(loadedConfig as EnvConfig);
  }, [isOpen]);

  const validateConfig = (): boolean => {
    const newErrors: Partial<Record<keyof EnvConfig, boolean>> = {};
    let hasErrors = false;

    REQUIRED_KEYS.forEach((key) => {
      if (!config[key] || config[key].trim() === "") {
        newErrors[key] = true;
        hasErrors = true;
      }
    });
    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSave = () => {
    if (!validateConfig()) {
      return;
    }
    updateConfig(config);
    if (onClose) {
      onClose();
    }
  };

  const handleInputChange = (key: keyof EnvConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const canClose =
    isSettings ||
    REQUIRED_KEYS.every((key) => {
      const storedValue = localStorage.getItem(key);
      return storedValue;
    });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={canClose ? onClose : undefined}
    >
      <DialogContent
        className="flex max-h-[80vh] w-[600px] max-w-[600px] flex-col bg-[var(--color-background)]"
        style={{ padding: "1.5rem" }}
        showCloseButton={canClose}
        onInteractOutside={(e) => {
          if (!canClose) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) {
            e.preventDefault();
          }
        }}
      >
        <div
          className="flex flex-col border-b border-[var(--color-border)]"
          style={{ gap: "0.5rem", paddingBottom: "1rem", marginBottom: "1rem" }}
        >
          <DialogTitle className="sr-only">
            Deep Agent Configuration
          </DialogTitle>
          <div
            className="flex min-w-0 items-center"
            style={{ gap: "0.5rem" }}
          >
            <Settings className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
            <span className="overflow-hidden text-lg font-semibold text-ellipsis whitespace-nowrap text-[var(--color-text-primary)]">
              Deep Agent Configuration
            </span>
          </div>
          <p className="m-0 text-sm leading-normal text-[var(--color-text-secondary)]">
            {isSettings
              ? "Update your agent configuration settings"
              : "Please configure the required variables to continue"}
          </p>
        </div>
        <div
          className="flex flex-1 flex-col overflow-y-auto"
          style={{ gap: "1rem", padding: "0.5rem 0" }}
        >
          {ENV_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-col"
              style={{ gap: "0.5rem" }}
            >
              <label
                htmlFor={key}
                className="text-sm font-medium"
              >
                {ENV_LABELS[key]}
                {!isSettings && REQUIRED_KEYS.includes(key) && (
                  <span
                    className="text-[var(--color-error)]"
                    style={{ marginLeft: "0.25rem" }}
                  >
                    *
                  </span>
                )}
              </label>
              <input
                id={key}
                type="text"
                value={config[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={ENV_PLACEHOLDERS[key]}
                className={cn(
                  "h-9 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] transition-all duration-200 placeholder:text-[var(--color-text-tertiary)] hover:border-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:bg-[var(--color-background)] focus:outline-none",
                  errors[key]
                    ? "border-[var(--color-error)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_2px_rgba(239,68,68,0.1)]"
                    : "",
                )}
                style={{ padding: "0.5rem 1rem", fontFamily: "inherit" }}
              />
              {errors[key] && (
                <span
                  className="text-xs text-[var(--color-error)]"
                  style={{ marginTop: "0.25rem" }}
                >
                  This field is required
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          className="flex shrink-0 justify-end border-t border-[var(--color-border)]"
          style={{ gap: "0.5rem", marginTop: "1rem", paddingTop: "1rem" }}
        >
          {isSettings && (
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center bg-transparent text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                border: "1px solid var(--color-error)",
                color: "var(--color-error)",
                gap: "0.25rem",
                padding: "0.25rem 1rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            className="flex items-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "var(--color-primary)",
              gap: "0.25rem",
              padding: "0.25rem 1rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
