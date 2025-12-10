"use client";

import React, { useCallback } from "react";
import { Check, Sun, Moon, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "../SettingsContext";

export function AppearanceTab() {
  const { theme, setTheme, userModelSettings, setUserModelSettings } = useSettings();

  // 默认开启 token 显示
  const showTokenUsage = userModelSettings.showTokenUsage !== false;

  const toggleShowTokenUsage = useCallback((checked: boolean) => {
    setUserModelSettings((prev) => {
      const newSettings = {
        ...prev,
        showTokenUsage: checked,
      };
      // 同步保存到 localStorage，以便 ChatMessage 组件可以读取
      try {
        localStorage.setItem("userSettings", JSON.stringify(newSettings));
      } catch {
        // 忽略存储错误
      }
      return newSettings;
    });
  }, [setUserModelSettings]);

  return (
    <div className="space-y-8">
      {/* Theme Section */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Theme</h3>

        <div className="grid grid-cols-2 gap-4">
          <label
            className={cn(
              "relative flex cursor-pointer flex-col items-center rounded-xl border-2 p-6 transition-all",
              theme === "light"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
              className="sr-only"
            />
            <div className="mb-3 flex h-16 w-24 items-center justify-center rounded-lg border border-border bg-white shadow-sm dark:bg-gray-100">
              <Sun className="h-6 w-6 text-amber-500" />
            </div>
            <span className="font-medium text-foreground">Light</span>
            {theme === "light" && (
              <div className="absolute right-3 top-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
          </label>

          <label
            className={cn(
              "relative flex cursor-pointer flex-col items-center rounded-xl border-2 p-6 transition-all",
              theme === "dark"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
              className="sr-only"
            />
            <div className="mb-3 flex h-16 w-24 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 shadow-sm">
              <Moon className="h-6 w-6 text-blue-400" />
            </div>
            <span className="font-medium text-foreground">Dark</span>
            {theme === "dark" && (
              <div className="absolute right-3 top-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
          </label>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Choose your preferred color scheme. The theme will be applied
          immediately and saved for future sessions.
        </p>
      </div>

      {/* Display Options Section */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Display Options</h3>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Show Token Usage</label>
                <p className="text-xs text-muted-foreground">Display token count and cost for each message</p>
              </div>
            </div>
            <Switch
              checked={showTokenUsage}
              onCheckedChange={toggleShowTokenUsage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

