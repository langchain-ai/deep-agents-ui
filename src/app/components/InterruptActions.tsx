"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { Interrupt } from "@langchain/langgraph-sdk";
import { HumanInterrupt, HumanResponse } from "@/app/types/inbox";
import { cn } from "@/lib/utils";

interface InterruptActionsProps {
  interrupt: Interrupt;
  onSubmit: (responses: HumanResponse[]) => void;
  isLoading?: boolean;
}

type DecisionMode = "idle" | "edit" | "reject";

interface InterruptDecision {
  mode: DecisionMode;
  editedArgs?: Record<string, any>;
  rejectMessage?: string;
}

/**
 * InterruptActions Component
 * 
 * A default component for rendering LangGraph interrupts that require human approval.
 * This component supports the standard interrupt workflow for deep agents:
 * - Approve: Execute the tool call as-is
 * - Edit: Modify tool arguments before execution
 * - Reject: Cancel the tool call with feedback
 * 
 * The component automatically handles multiple tool calls in a single interrupt
 * and respects the permissions configured in the interrupt config.
 */
export const InterruptActions = React.memo<InterruptActionsProps>(
  ({ interrupt, onSubmit, isLoading = false }) => {
    // Parse interrupts from the interrupt value
    const interrupts = useMemo(() => {
      try {
        const value = interrupt.value as any;
        
        if (!value) {
          return [];
        }
        
        // Handle Deep Agents/LangGraph format: { action_requests: [], review_configs: [] }
        if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          Array.isArray(value.action_requests) &&
          Array.isArray(value.review_configs)
        ) {
          const parsed = value.action_requests.map((actionReq: any, idx: number) => {
            const reviewConfig = value.review_configs[idx] || {};
            const allowedDecisions = reviewConfig.allowed_decisions || [];
            
            return {
              action_request: {
                action: actionReq.name || actionReq.action || "Unknown Action",
                args: actionReq.args || actionReq.arguments || {},
              },
              config: {
                allow_accept: allowedDecisions.includes('approve'),
                allow_edit: allowedDecisions.includes('edit'),
                allow_respond: allowedDecisions.includes('reject'),
                allow_ignore: allowedDecisions.includes('ignore'),
              },
              description: actionReq.description,
            };
          }) as HumanInterrupt[];
          return parsed;
        }
        
        // If it's an array of standard format interrupts
        if (Array.isArray(value)) {
          const filtered = value.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.action_request &&
              typeof item.action_request === "object"
          ) as HumanInterrupt[];
          return filtered;
        }
        
        // If it's a single object in standard format
        if (
          typeof value === "object" &&
          value.action_request &&
          typeof value.action_request === "object"
        ) {
          return [value] as HumanInterrupt[];
        }
        
        return [];
      } catch (error) {
        console.error("Error parsing interrupt:", error);
        return [];
      }
    }, [interrupt]);

    // State for managing decisions for each interrupt
    const [decisions, setDecisions] = useState<Record<number, InterruptDecision>>(
      {}
    );

    // Start with all arguments collapsed for cleaner UI
    const [expandedArgs, setExpandedArgs] = useState<
      Record<number, Record<string, boolean>>
    >({});

    // Toggle argument expansion for a specific interrupt and argument key
    const toggleArgExpanded = useCallback((interruptIdx: number, argKey: string) => {
      setExpandedArgs((prev) => ({
        ...prev,
        [interruptIdx]: {
          ...(prev[interruptIdx] || {}),
          [argKey]: !prev[interruptIdx]?.[argKey],
        },
      }));
    }, []);

    // Set decision mode for a specific interrupt
    const setDecisionMode = useCallback(
      (idx: number, mode: DecisionMode, initialArgs?: Record<string, any>) => {
        setDecisions((prev) => ({
          ...prev,
          [idx]: {
            mode,
            editedArgs: mode === "edit" ? initialArgs : undefined,
            rejectMessage: mode === "reject" ? "" : undefined,
          },
        }));
      },
      []
    );

    // Update reject message for a specific interrupt
    const updateRejectMessage = useCallback((idx: number, message: string) => {
      setDecisions((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] || { mode: "reject" as DecisionMode }),
          rejectMessage: message,
        },
      }));
    }, []);

    // Update edited arguments for a specific interrupt
    const updateEditedArgs = useCallback(
      (idx: number, key: string, value: string) => {
        setDecisions((prev) => {
          const current = prev[idx] || { mode: "edit" as DecisionMode };
          const currentArgs = current.editedArgs || {};
          
          // Try to parse as JSON if it looks like JSON, otherwise use as string
          let parsedValue: any = value;
          try {
            if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
              parsedValue = JSON.parse(value);
            }
          } catch {
            // Keep as string if not valid JSON
            parsedValue = value;
          }

          return {
            ...prev,
            [idx]: {
              ...current,
              editedArgs: {
                ...currentArgs,
                [key]: parsedValue,
              },
            },
          };
        });
      },
      []
    );


    // Handle submission of all decisions
    const handleSubmit = useCallback(() => {
      const responses: HumanResponse[] = interrupts.map((interrupt, idx) => {
        // Skip invalid interrupts
        if (!interrupt?.action_request) {
          return { type: "approve" as const };
        }

        const decision = decisions[idx];

        if (!decision || decision.mode === "idle") {
          // Default to approve if no decision made
          return { type: "approve" as const };
        }

        if (decision.mode === "edit") {
          return {
            type: "edit" as const,
            edited_action: {
              name: interrupt.action_request.action || "unknown",
              args: decision.editedArgs || interrupt.action_request.args || {},
            },
          };
        }

        if (decision.mode === "reject") {
          const userMessage = decision.rejectMessage?.trim() || "";
          // Prepend "Rejected by user: " to the message
          const fullMessage = userMessage 
            ? `Rejected by user: ${userMessage}`
            : "Rejected by user";
          return {
            type: "reject" as const,
            message: fullMessage,
          };
        }

        return { type: "approve" as const };
      });

      onSubmit(responses);
    }, [interrupts, decisions, onSubmit]);

    if (interrupts.length === 0) {
      return null;
    }

    return (
      <div className="w-full space-y-4 rounded-lg border-2 border-orange-300 bg-orange-50/80 p-4 dark:border-orange-700 dark:bg-orange-950/30">
        {interrupts.map((humanInterrupt, idx) => {
          // Defensive checks for interrupt structure
          if (!humanInterrupt || !humanInterrupt.action_request) {
            return null;
          }

          const { action_request, config, description } = humanInterrupt;
          const decision = decisions[idx];
          const isEditing = decision?.mode === "edit";
          const isRejecting = decision?.mode === "reject";

          // Provide defaults for config if missing
          const safeConfig = config || {
            allow_accept: true,
            allow_edit: true,
            allow_respond: true,
            allow_ignore: false,
          };

          // Provide defaults for action_request
          const safeActionRequest = {
            action: action_request.action || "Unknown Action",
            args: action_request.args || {},
          };

          return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border-2 bg-card p-4 shadow-sm transition-colors",
                  isEditing && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                  isRejecting && "border-red-500 bg-red-50/50 dark:bg-red-950/20",
                  !isEditing && !isRejecting && "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                )}
              >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      APPROVAL REQUIRED
                    </span>
                    {interrupts.length > 1 && (
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {idx + 1} of {interrupts.length}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {safeActionRequest.action}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Review the tool arguments below and choose an action
                  </p>
                </div>
              </div>

              {/* Tool Arguments */}
              <div className="mb-4 space-y-2">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Arguments
                </h4>
                {isEditing ? (
                  <div className="space-y-2">
                    {Object.entries(safeActionRequest.args).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-sm border border-border"
                        >
                          <div className="bg-muted/30 p-2">
                            <label className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                              {key}
                            </label>
                          </div>
                        <div className="p-2">
                          <Textarea
                            value={
                              decision.editedArgs?.[key] !== undefined
                                ? typeof decision.editedArgs[key] === "string"
                                  ? decision.editedArgs[key]
                                  : JSON.stringify(decision.editedArgs[key], null, 2)
                                : typeof value === "string"
                                ? value
                                : JSON.stringify(value, null, 2)
                            }
                            onChange={(e) =>
                              updateEditedArgs(idx, key, e.target.value)
                            }
                            className="min-h-[60px] font-mono text-xs"
                            placeholder={`Enter ${key}...`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(safeActionRequest.args).map(([key, value]) => {
                      const isExpanded = expandedArgs[idx]?.[key];
                      const stringValue =
                        typeof value === "string"
                          ? value
                          : JSON.stringify(value, null, 2);
                      const isLong = stringValue.length > 200;
                      const preview = isLong ? stringValue.slice(0, 100) + "..." : stringValue;

                      return (
                        <div
                          key={key}
                          className="rounded-md border border-border bg-card"
                        >
                          <button
                            onClick={() => toggleArgExpanded(idx, key)}
                            className="flex w-full items-center justify-between bg-muted p-3 text-left transition-colors hover:bg-muted/80"
                          >
                            <span className="font-mono text-sm font-semibold">{key}</span>
                            {(isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            ))}
                          </button>
                          {isExpanded ? (
                            <div className="border-t border-border p-3">
                              <pre className="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                                {stringValue}
                              </pre>
                            </div>
                          ) : (
                            <div className="border-t border-border p-3">
                              <p className="m-0 truncate font-mono text-sm">
                                {preview}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reject Message Input */}
              {isRejecting && (
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Feedback to Agent (Optional)
                  </label>
                  <Textarea
                    value={decision.rejectMessage || ""}
                    onChange={(e) => updateRejectMessage(idx, e.target.value)}
                    placeholder="Explain why this action should not be performed and what the agent should do instead..."
                    className="min-h-[80px]"
                  />
                  <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                    This feedback will be added to the conversation to help guide the agent.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {safeConfig.allow_accept && !isEditing && !isRejecting && (
                  <Button
                    onClick={
                      interrupts.length === 1
                        ? handleSubmit
                        : () => setDecisionMode(idx, "idle")
                    }
                    variant="default"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={isLoading}
                  >
                    <CheckCircle size={14} />
                    <span className="font-semibold">Approve</span>
                  </Button>
                )}

                {safeConfig.allow_edit && !isRejecting && (
                  <Button
                    onClick={() => {
                      if (isEditing) {
                        // Submit the edited version
                        if (interrupts.length === 1) {
                          handleSubmit();
                        } else {
                          // For multiple interrupts, just mark as ready to submit
                          setDecisionMode(idx, "idle");
                        }
                      } else {
                        // Enter edit mode
                        setDecisionMode(idx, "edit", safeActionRequest.args);
                      }
                    }}
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    disabled={isLoading}
                    className={isEditing ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  >
                    <Edit3 size={14} />
                    <span className="font-semibold">
                      {isEditing ? (interrupts.length === 1 ? "Submit Edit" : "Done Editing") : "Edit"}
                    </span>
                  </Button>
                )}

                {safeConfig.allow_respond && !isEditing && (
                  <Button
                    onClick={() => {
                      if (isRejecting) {
                        // Submit the rejection
                        if (interrupts.length === 1) {
                          handleSubmit();
                        } else {
                          // For multiple interrupts, just mark as ready to submit
                          setDecisionMode(idx, "idle");
                        }
                      } else {
                        // Enter reject mode
                        setDecisionMode(idx, "reject");
                      }
                    }}
                    variant={isRejecting ? "default" : "outline"}
                    size="sm"
                    className={
                      isRejecting
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                    }
                    disabled={isLoading}
                  >
                    <XCircle size={14} />
                    <span className="font-semibold">
                      {isRejecting ? (interrupts.length === 1 ? "Submit Rejection" : "Confirm Reject") : "Reject"}
                    </span>
                  </Button>
                )}

                {(isEditing || isRejecting) && (
                  <Button
                    onClick={() => setDecisionMode(idx, "idle")}
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    className="text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                  >
                    <span className="font-semibold">Cancel</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Submit All Button (for multiple interrupts) */}
        {interrupts.length > 1 && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              {isLoading ? (
                "Submitting..."
              ) : (
                <>
                  Submit All Decisions ({interrupts.length})
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

InterruptActions.displayName = "InterruptActions";

