"use client";

import type { ChatMessage } from "@/hooks/use-chat";

const RECORD_ICONS: Record<string, string> = {
  organization: "corporate_fare",
  person: "person",
  interaction: "handshake",
  opportunity: "trending_up",
  affiliation: "link",
};

export function DraftCard({
  message,
  onApprove,
  onDiscard,
}: {
  message: ChatMessage;
  onApprove: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
}) {
  const draft = message.draftPayload;
  if (!draft) return null;

  const records = draft.records ?? [];
  const summary = draft.summary ?? "";
  const isPending = message.draftStatus === "pending";
  const statusLabel =
    message.draftStatus === "approved"
      ? "Approved"
      : message.draftStatus === "discarded"
        ? "Discarded"
        : message.draftStatus === "edited"
          ? "Edited & Approved"
          : null;

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
          Draft Record
        </span>
        {statusLabel && (
          <span
            className="text-[10px] font-[Space_Grotesk] uppercase px-2 py-0.5 rounded"
            style={{
              background:
                message.draftStatus === "discarded" ? "#ef444420" : "#22c55e20",
              color:
                message.draftStatus === "discarded" ? "#ef4444" : "#22c55e",
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Records */}
      <div className="px-4 py-3 space-y-2">
        {records.map((record: any, i: number) => (
          <div key={i} className="flex items-start gap-3">
            <span
              className="material-symbols-outlined text-sm mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {RECORD_ICONS[record.type] ?? "note"}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {record.action} {record.type}
              </span>
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                {record.data?.name ??
                  record.data?.fullName ??
                  record.data?.full_name ??
                  record.data?.organizationName ??
                  record.data?.contactName ??
                  "Record"}
                {record.data?.title && (
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {" "}
                    · {record.data.title}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {summary && (
        <div
          className="px-4 py-2 text-xs"
          style={{
            color: "var(--text-secondary)",
            borderTop: "1px solid #262a31",
          }}
        >
          {summary}
        </div>
      )}

      {/* Actions */}
      {isPending && message.draftId && (
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderTop: "1px solid #262a31" }}
        >
          <button
            onClick={() => onApprove(message.draftId!)}
            className="flex-1 py-2 rounded text-xs font-[Space_Grotesk] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#22c55e20", color: "#22c55e" }}
          >
            Approve
          </button>
          <button
            onClick={() => onDiscard(message.draftId!)}
            className="flex-1 py-2 rounded text-xs font-[Space_Grotesk] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#262a31", color: "var(--text-tertiary)" }}
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
