"use client";

import { useState } from "react";
import type { ActionRequest, ReviewConfig } from "@/app/types/types";

interface ToolApprovalInterruptProps {
  actionRequests: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
  onResume: (value: any) => void;
  isLoading?: boolean;
}

export function ToolApprovalInterrupt({
  actionRequests,
  reviewConfigs,
  onResume,
  isLoading,
}: ToolApprovalInterruptProps) {
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(
    null
  );
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>({});
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  // Validate interrupt data
  if (!actionRequests || actionRequests.length === 0) {
    return null;
  }

  const actionRequest = actionRequests[0]; // Handle first action request
  const reviewConfig = reviewConfigs?.find(
    (config) => config.actionName === actionRequest.name
  );
  const allowedDecisions = reviewConfig?.allowedDecisions || [
    "approve",
    "reject",
    "edit",
  ];

  const handleApprove = () => {
    onResume({
      decisions: [{ type: "approve" }],
    });
  };

  const handleReject = () => {
    if (showRejectionInput) {
      onResume({
        decisions: [
          {
            type: "reject",
            ...(rejectionMessage.trim() && {
              message: rejectionMessage.trim(),
            }),
          },
        ],
      });
    } else {
      setShowRejectionInput(true);
    }
  };

  const handleRejectConfirm = () => {
    onResume({
      decisions: [
        {
          type: "reject",
          ...(rejectionMessage.trim() && { message: rejectionMessage.trim() }),
        },
      ],
    });
  };

  const handleEdit = () => {
    if (editingActionIndex !== null) {
      onResume({
        decisions: [
          {
            type: "edit",
            edited_action: {
              name: actionRequest.name,
              args: editedArgs,
            },
          },
        ],
      });
      setEditingActionIndex(null);
      setEditedArgs({});
    }
  };

  const startEditing = () => {
    setEditingActionIndex(0);
    setEditedArgs(JSON.parse(JSON.stringify(actionRequest.args)));
    setShowRejectionInput(false);
  };

  const cancelEditing = () => {
    setEditingActionIndex(null);
    setEditedArgs({});
  };

  const updateEditedArg = (key: string, value: string) => {
    try {
      // Try to parse as JSON if it looks like JSON
      const parsedValue =
        value.trim().startsWith("{") || value.trim().startsWith("[")
          ? JSON.parse(value)
          : value;
      setEditedArgs((prev) => ({ ...prev, [key]: parsedValue }));
    } catch {
      // If parsing fails, use as string
      setEditedArgs((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="mt-4 flex justify-start">
      <div className="max-w-[80%] rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-500 dark:bg-yellow-900/20">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-yellow-700 dark:text-yellow-300">
              ⚠️ Approval Required
            </span>
          </div>

          {/* Description */}
          {actionRequest.description && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {actionRequest.description}
              </p>
            </div>
          )}

          {/* Tool Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tool Name
              </span>
              <p className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                {actionRequest.name}
              </p>
            </div>

            {editingActionIndex === null ? (
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Arguments
                </span>
                <pre className="mt-2 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {JSON.stringify(actionRequest.args, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Edit Arguments
                </span>
                <div className="mt-2 space-y-3">
                  {Object.entries(actionRequest.args).map(([key, value]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        {key}
                      </label>
                      <textarea
                        value={
                          editedArgs[key] !== undefined
                            ? typeof editedArgs[key] === "string"
                              ? (editedArgs[key] as string)
                              : JSON.stringify(editedArgs[key], null, 2)
                            : typeof value === "string"
                            ? value
                            : JSON.stringify(value, null, 2)
                        }
                        onChange={(e) => updateEditedArg(key, e.target.value)}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        rows={
                          typeof value === "string" && value.length < 100
                            ? 2
                            : 6
                        }
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rejection Message Input */}
          {showRejectionInput && editingActionIndex === null && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejection Message (optional)
              </label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Explain why you're rejecting this action..."
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {editingActionIndex !== null ? (
              <>
                <button
                  onClick={cancelEditing}
                  disabled={isLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel Edit
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save & Approve"
                  )}
                </button>
              </>
            ) : showRejectionInput ? (
              <>
                <button
                  onClick={() => {
                    setShowRejectionInput(false);
                    setRejectionMessage("");
                  }}
                  disabled={isLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={isLoading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Rejecting...
                    </>
                  ) : (
                    "Confirm Reject"
                  )}
                </button>
              </>
            ) : (
              <>
                {allowedDecisions.includes("reject") && (
                  <button
                    onClick={handleReject}
                    disabled={isLoading}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {allowedDecisions.includes("edit") && (
                  <button
                    onClick={startEditing}
                    disabled={isLoading}
                    className="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                )}
                {allowedDecisions.includes("approve") && (
                  <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Approving...
                      </>
                    ) : (
                      "Approve"
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
