"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type QueueItem = {
  id: string;
  source: string;
  sourceId: string | null;
  eventType: string;
  payload: Record<string, any>;
  status: string;
  entityTags: string[] | null;
  createdAt: string;
};

export default function SyncSettingsPage() {
  const { data: queue, isLoading } = useSWR<QueueItem[]>(
    "/api/sync-queue?status=pending",
    fetcher,
    { refreshInterval: 10_000 }
  );
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, number> | null>(
    null
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/brain/sync", { method: "POST" });
      const result = await res.json();
      setLastResult(result);
      mutate("/api/sync-queue?status=pending");
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "dismiss") => {
      await fetch(`/api/sync-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      mutate("/api/sync-queue?status=pending");
    },
    []
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 md:pb-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-[Manrope] text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Brain Sync
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sync Brain notes into Orbit — people, deals, meetings, research
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#412d00" }}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Last Sync Result */}
      {lastResult && (
        <div
          className="p-4 rounded-lg space-y-2"
          style={{ background: "#181c22" }}
        >
          <div
            className="text-xs font-[Space_Grotesk] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last Sync Result
          </div>
          <div className="flex gap-4 text-sm">
            {[
              { label: "Scanned", value: lastResult.scanned, color: "var(--text-secondary)" },
              { label: "Created", value: lastResult.created, color: "#34d399" },
              { label: "Updated", value: lastResult.updated, color: "#5b9cf5" },
              { label: "Queued", value: lastResult.queued, color: "#d4a017" },
              { label: "Errors", value: lastResult.errors, color: "#ef4444" },
            ].map((s) => (
              <div key={s.label}>
                <span style={{ color: s.color }} className="font-bold">
                  {s.value}
                </span>{" "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  {s.label.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Pending Approval
          </h2>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {queue?.length ?? 0} items
          </span>
        </div>

        {isLoading && (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Loading...
          </div>
        )}

        {queue?.length === 0 && !isLoading && (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No pending items. Run a sync to discover new Brain files.
          </div>
        )}

        {queue?.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg space-y-3"
            style={{
              background: "#181c22",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold font-[Space_Grotesk] uppercase"
                    style={{
                      background:
                        item.eventType === "new_opportunity"
                          ? "#d4a01720"
                          : "#5b9cf520",
                      color:
                        item.eventType === "new_opportunity"
                          ? "#d4a017"
                          : "#5b9cf5",
                    }}
                  >
                    {item.eventType.replace("new_", "")}
                  </span>
                  {item.entityTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[10px] font-[Space_Grotesk]"
                      style={{
                        background: "#262a31",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div
                  className="text-sm font-medium mt-1.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.payload?.company ??
                    item.payload?.fullName ??
                    item.payload?.title ??
                    "Unknown"}
                </div>
                {item.payload?.stage && (
                  <div
                    className="text-[10px] mt-0.5 font-[Space_Grotesk] uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    stage: <span style={{ color: "var(--text-secondary)" }}>{item.payload.stage}</span>
                  </div>
                )}
                {item.payload?.summary && (
                  <div
                    className="text-xs mt-1 line-clamp-3"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.payload.summary}
                  </div>
                )}
                <div
                  className="text-[10px] mt-1.5 truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.sourceId}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(item.id, "approve")}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:brightness-110"
                  style={{ background: "#34d39920", color: "#34d399" }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(item.id, "dismiss")}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:brightness-110"
                  style={{ background: "#ef444420", color: "#ef4444" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
