"use client";

import { useState } from "react";
import type { ChatMessage } from "@/hooks/use-chat";
import { usePageBridge } from "@/lib/chat/page-bridge";

const PREVIEW_LIMIT = 220;

export function ProposalCard({
  message,
  onApplied,
  onDismissed,
}: {
  message: ChatMessage;
  onApplied: (messageId: string) => void;
  onDismissed: (messageId: string) => void;
}) {
  const bridge = usePageBridge();
  const [expanded, setExpanded] = useState(false);
  const proposal = message.proposalPayload;
  if (!proposal) return null;

  const field = bridge.fields.find((f) => f.name === proposal.field);
  const label = field?.label ?? proposal.field;
  const status = message.proposalStatus ?? "pending";
  const isPending = status === "pending";

  const value = proposal.value ?? "";
  const showExpand = value.length > PREVIEW_LIMIT;
  const displayed = expanded || !showExpand ? value : value.slice(0, PREVIEW_LIMIT) + "…";

  const statusLabel =
    status === "applied" ? "Applied" : status === "dismissed" ? "Dismissed" : null;

  const handleApply = () => {
    const ok = bridge.applyFieldUpdate(proposal.field, proposal.value);
    if (ok) onApplied(message.id);
  };

  return (
    <div
      className="mx-4 rounded-lg overflow-hidden"
      style={{
        background: "#181c22",
        borderLeft: "3px solid var(--accent)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #262a31" }}
      >
        <span
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider font-bold"
          style={{ color: "var(--accent)" }}
        >
          Page Proposal · {label}
        </span>
        {statusLabel && (
          <span
            className="text-[10px] font-[Space_Grotesk] uppercase px-2 py-0.5 rounded"
            style={{
              background:
                status === "dismissed" ? "#ef444420" : "#22c55e20",
              color: status === "dismissed" ? "#ef4444" : "#22c55e",
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Proposed value */}
      <div
        className="px-4 py-3 text-sm whitespace-pre-wrap"
        style={{ color: "var(--text-primary)" }}
      >
        {displayed}
        {showExpand && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="block mt-2 text-[11px] font-[Space_Grotesk] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Reasoning */}
      {proposal.reasoning && (
        <div
          className="px-4 py-2 text-xs italic"
          style={{
            color: "var(--text-secondary)",
            borderTop: "1px solid #262a31",
          }}
        >
          Why: {proposal.reasoning}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderTop: "1px solid #262a31" }}
        >
          <button
            onClick={handleApply}
            disabled={!field}
            className="flex-1 py-2 rounded text-xs font-[Space_Grotesk] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#22c55e20", color: "#22c55e" }}
            title={field ? undefined : `Field "${proposal.field}" not on current page`}
          >
            Apply
          </button>
          <button
            onClick={() => onDismissed(message.id)}
            className="flex-1 py-2 rounded text-xs font-[Space_Grotesk] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#262a31", color: "var(--text-tertiary)" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
