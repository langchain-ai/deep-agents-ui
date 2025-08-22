"use client";

import React, { useState } from "react";
import { ChevronDown, Bot, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import styles from "./AgentSelector.module.scss";
import type { Agent } from "../../types/types";

interface AgentSelectorProps {
  availableAgents: Agent[];
  currentAgent: Agent;
  onAgentChange: (agent: Agent) => void;
  disabled?: boolean;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  availableAgents,
  currentAgent,
  onAgentChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAgentSelect = (agent: Agent) => {
    if (agent.id !== currentAgent.id) {
      onAgentChange(agent);
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={styles.trigger}
      >
        <div className={styles.currentAgent}>
          <div
            className={styles.agentColor}
            style={{ backgroundColor: currentAgent.color }}
          />
          <Bot className={styles.icon} />
          <span className={styles.agentName}>{currentAgent.name}</span>
        </div>
        <ChevronDown
          className={`${styles.chevron} ${isOpen ? styles.open : ""}`}
        />
      </Button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownContent}>
            {availableAgents.map((agent) => (
              <button
                key={agent.id}
                className={`${styles.agentOption} ${
                  agent.id === currentAgent.id ? styles.selected : ""
                }`}
                onClick={() => handleAgentSelect(agent)}
              >
                <div className={styles.agentInfo}>
                  <div
                    className={styles.agentColor}
                    style={{ backgroundColor: agent.color }}
                  />
                  <div className={styles.agentDetails}>
                    <span className={styles.agentName}>{agent.name}</span>
                    {agent.description && (
                      <span className={styles.agentDescription}>
                        {agent.description}
                      </span>
                    )}
                  </div>
                </div>
                {agent.id === currentAgent.id && (
                  <Check className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
