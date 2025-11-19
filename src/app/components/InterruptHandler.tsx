"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Interrupt } from "@langchain/langgraph-sdk";

interface InterruptHandlerProps {
  interrupt: Interrupt;
  onResume: (value: any) => void;
  isLoading?: boolean;
}

export const InterruptHandler = React.memo<InterruptHandlerProps>(
  ({ interrupt, onResume, isLoading }) => {
    // Detect if this is a deep agent tool approval interrupt and provide smart default
    const suggestedResponse = useMemo(() => {
      const value = interrupt.value;
      
      // Check if this is a deep agent tool approval interrupt
      if (
        value &&
        typeof value === "object" &&
        "action_requests" in value &&
        "review_configs" in value
      ) {
        // Get the tool name and args from the interrupt for the edit template
        const actionRequest = (value as any).action_requests?.[0];
        const toolName = actionRequest?.name || "tool_name";
        const toolArgs = actionRequest?.args || { modified: "values" };
        
        // This is a tool approval interrupt - suggest edit format
        return JSON.stringify(
          {
            decisions: [
              {
                type: "edit",
                edited_action: {
                  name: toolName,
                  args: toolArgs,
                },
              },
            ],
          },
          null,
          2
        );
      }
      
      return "";
    }, [interrupt.value]);

    const [resumeValue, setResumeValue] = useState(suggestedResponse);
    const [error, setError] = useState<string | null>(null);
    const [showModify, setShowModify] = useState(false);

    // Update resume value when suggested response changes
    React.useEffect(() => {
      if (suggestedResponse && !resumeValue) {
        setResumeValue(suggestedResponse);
      }
    }, [suggestedResponse, resumeValue]);

    // Display the interrupt value
    const displayValue = useMemo(() => {
      const value = interrupt.value;
      
      // Log to console for debugging
      console.log("Interrupt data:", {
        value,
        type: typeof value,
        ns: (interrupt as any)?.ns,
        scope: (interrupt as any)?.scope,
      });
      
      if (typeof value === "string") {
        return value;
      }
      
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }, [interrupt]);

    const handleResume = useCallback(() => {
      setError(null);

      // If no input provided, send empty string
      if (!resumeValue.trim()) {
        setError("Please enter a response value");
        return;
      }

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(resumeValue);
        console.log("=== Interrupt Resume Debug ===");
        console.log("Raw input:", resumeValue);
        console.log("Parsed value:", parsed);
        console.log("Parsed type:", typeof parsed);
        console.log("Parsed keys:", Object.keys(parsed));
        console.log("Has 'decisions' key:", "decisions" in parsed);
        console.log("Calling onResume with:", parsed);
        console.log("=============================");
        onResume(parsed);
        return;
      } catch (error) {
        // Not JSON, send as plain string
        console.warn("Failed to parse JSON resume value, sending string instead", error);
        console.log("Resuming with string value:", resumeValue.trim());
        onResume(resumeValue.trim());
      }
    }, [resumeValue, onResume]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleResume();
        }
      },
      [handleResume]
    );

    return (
      <div className="my-4 w-full">
        <div
          className={cn(
            "rounded-lg border-2 border-purple-500 bg-purple-50/50 p-4 dark:bg-purple-950/20"
          )}
        >
          {/* Interrupt Banner */}
          <div className="mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <AlertCircle size={18} />
            <span className="font-semibold">Waiting for Input</span>
          </div>

          {/* Display Interrupt Value */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Interrupt Message
            </h4>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-purple-200 bg-white p-3 font-mono text-xs leading-relaxed text-gray-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-gray-200">
              {displayValue}
            </pre>
            <p className="mt-2 text-xs italic text-gray-600 dark:text-gray-400">
              Check the browser console for full interrupt details
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Quick Actions for Tool Approvals */}
          {suggestedResponse && (
            <div className="mb-3 rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-700 dark:bg-purple-900/30">
              <p className="mb-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                Quick Actions:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const approveValue = {
                      decisions: [{ type: "approve" }],
                    };
                    console.log("Quick action: Approve", approveValue);
                    onResume(approveValue);
                  }}
                  disabled={isLoading}
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    const rejectValue = {
                      decisions: [{ type: "reject" }],
                    };
                    console.log("Quick action: Reject", rejectValue);
                    onResume(rejectValue);
                  }}
                  disabled={isLoading}
                  size="sm"
                  variant="destructive"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => setShowModify(!showModify)}
                  disabled={isLoading}
                  size="sm"
                  className="!bg-[#7C3AED] !text-white hover:!bg-[#6D28D9] focus-visible:ring-purple-500"
                >
                  {showModify ? "Hide" : "Modify"}
                </Button>
              </div>
            </div>
          )}

          {/* Resume Input - Only show if no quick actions OR modify is toggled */}
          {(showModify || !suggestedResponse) && (
            <div className="mb-3">
              <label
                htmlFor="resume-input"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400"
              >
                Your Response (JSON or Text)
              </label>
              <Textarea
                id="resume-input"
                value={resumeValue}
                onChange={(e) => setResumeValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Enter response. Examples:
Plain text: "approved"
Simple value: true
Object: {"key": "value"}'
                className="min-h-[120px] resize-y border-purple-300 bg-white font-mono text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-purple-700 dark:bg-gray-900 dark:text-gray-100"
                disabled={isLoading}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  <strong>Tip:</strong> Press Cmd/Ctrl + Enter to submit. Valid JSON will be parsed automatically.
                </p>
                <details className="text-xs text-purple-600 dark:text-purple-400">
                  <summary className="cursor-pointer hover:text-purple-700 dark:hover:text-purple-300">
                    Response formats & examples
                  </summary>
                  <div className="mt-2 space-y-2 pl-2">
                    <div className="rounded bg-purple-50 p-2 dark:bg-purple-950/50">
                      <div className="mb-1 font-semibold">Approve:</div>
                      <code className="block whitespace-pre text-[10px] leading-tight">{`{"decisions": [{"type": "approve"}]}`}</code>
                    </div>
                    <div className="rounded bg-purple-50 p-2 dark:bg-purple-950/50">
                      <div className="mb-1 font-semibold">Reject:</div>
                      <code className="block whitespace-pre text-[10px] leading-tight">{`{"decisions": [{"type": "reject"}]}`}</code>
                    </div>
                    <div className="rounded bg-purple-50 p-2 dark:bg-purple-950/50">
                      <div className="mb-1 font-semibold">Edit (modify args):</div>
                      <code className="block whitespace-pre text-[10px] leading-tight">{`{
  "decisions": [{
    "type": "edit",
    "edited_action": {
      "name": "tool_name",
      "args": { "modified": "values" }
    }
  }]
}`}</code>
                    </div>
                  </div>
                </details>
              </div>
              
              {/* Resume Button */}
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={handleResume}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} />
                      Resume with Custom Value
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

InterruptHandler.displayName = "InterruptHandler";

