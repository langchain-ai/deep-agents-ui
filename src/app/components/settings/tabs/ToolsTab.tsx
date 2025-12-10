"use client";

import React from "react";
import { useSettings } from "../SettingsContext";
import { ToolSelector } from "../components/ToolSelector";

export function ToolsTab() {
  const {
    tools,
    toolsByCategory,
    toolConfigs,
    toggleTool,
    setToolModel,
    expandedCategories,
    toggleCategory,
    models,
    modelsByProvider,
    subAgents,
    mainAgentConfig,
  } = useSettings();

  return (
    <ToolSelector
      tools={tools}
      toolsByCategory={toolsByCategory}
      toolConfigs={toolConfigs}
      onToggleTool={toggleTool}
      onSetToolModel={setToolModel}
      expandedCategories={expandedCategories}
      onToggleCategory={toggleCategory}
      models={models}
      modelsByProvider={modelsByProvider}
      showModelSelector={true}
      subAgents={subAgents}
      directTools={mainAgentConfig.directTools}
    />
  );
}

