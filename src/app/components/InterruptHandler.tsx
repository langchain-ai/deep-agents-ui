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

/**
 * Generic interrupt handler for node-level interrupts (not tool call interrupts).
 * Tool call interrupts are handled by ToolCallBox with ToolApprovalInterrupt.
 */
export const InterruptHandler = React.memo<InterruptHandlerProps>(
  ({ interrupt, onResume, isLoading }) => {
    const [resumeValue, setResumeValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Display the interrupt value
    const displayValue = useMemo(() => {
      const value = interrupt.value;
      
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

      if (!resumeValue.trim()) {
        setError("Please enter a response value");
        return;
      }

      try {
        const parsed = JSON.parse(resumeValue);
        onResume(parsed);
        return;
      } catch {
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
            "rounded-lg border-2 border-yellow-400 bg-yellow-50/50 p-4 dark:border-yellow-500 dark:bg-yellow-900/20"
          )}
        >
          {/* Interrupt Banner */}
          <div className="mb-3 flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
            <AlertCircle size={18} />
            <span className="font-semibold">Waiting for Input</span>
          </div>

          {/* Display Interrupt Value */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
              Interrupt Message
            </h4>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-yellow-200 bg-white p-3 font-mono text-xs leading-relaxed text-gray-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-gray-200">
              {displayValue}
            </pre>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Resume Input */}
          <div className="mb-3">
            <label
              htmlFor="resume-input"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300"
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
              className="min-h-[120px] resize-y border-yellow-300 bg-white font-mono text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700 dark:bg-gray-900 dark:text-gray-100"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Tip:</strong> Press Cmd/Ctrl + Enter to submit. Valid JSON
              will be parsed automatically.
            </p>

            {/* Resume Button */}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleResume}
                disabled={isLoading}
                className="bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} />
                    Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InterruptHandler.displayName = "InterruptHandler";
