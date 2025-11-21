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
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
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
  const allowedDecisions = reviewConfig?.allowedDecisions || ["approve", "reject", "edit"];

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
            ...(rejectionMessage.trim() && { message: rejectionMessage.trim() }),
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
      const parsedValue = value.trim().startsWith("{") || value.trim().startsWith("[")
        ? JSON.parse(value)
        : value;
      setEditedArgs((prev) => ({ ...prev, [key]: parsedValue }));
    } catch {
      // If parsing fails, use as string
      setEditedArgs((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="flex justify-start mt-4">
      <div className="max-w-[80%] rounded-lg border-2 border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Tool Name
              </span>
              <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {actionRequest.name}
              </p>
            </div>

            {editingActionIndex === null ? (
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Arguments
                </span>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                  {JSON.stringify(actionRequest.args, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  Edit Arguments
                </span>
                <div className="space-y-3 mt-2">
                  {Object.entries(actionRequest.args).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {key}
                      </label>
                      <textarea
                        value={
                          editedArgs[key] !== undefined
                            ? typeof editedArgs[key] === "string"
                              ? editedArgs[key] as string
                              : JSON.stringify(editedArgs[key], null, 2)
                            : typeof value === "string"
                            ? value
                            : JSON.stringify(value, null, 2)
                        }
                        onChange={(e) => updateEditedArg(key, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
                        rows={typeof value === "string" && value.length < 100 ? 2 : 6}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Message (optional)
              </label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Explain why you're rejecting this action..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel Edit
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
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
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                )}
                {allowedDecisions.includes("edit") && (
                  <button
                    onClick={startEditing}
                    disabled={isLoading}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                )}
                {allowedDecisions.includes("approve") && (
                  <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
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

