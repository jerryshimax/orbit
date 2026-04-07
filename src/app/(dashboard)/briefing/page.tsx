"use client";

import { useState } from "react";
import { StageBadge } from "@/components/shared/stage-badge";

type BriefingResult = {
  orgId: string;
  orgName: string;
  contactName: string;
  contactTitle: string;
  strategicFit: number;
  reason: string;
  recommendedAsk: string;
  introPath: string;
};

export default function BriefingPage() {
  const [objective, setObjective] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BriefingResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateBriefing() {
    if (!objective.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: objective.trim(),
          location: location.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results);
      }
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  }

  const fitColor = (fit: number) => {
    if (fit >= 5) return "#22c55e";
    if (fit >= 4) return "#84cc16";
    if (fit >= 3) return "#eab308";
    if (fit >= 2) return "#f97316";
    return "#6b7280";
  };

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Strategic Briefing
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Describe your objective — get a ranked list of who to meet and why
        </p>
      </div>

      {/* Input */}
      <div
        className="p-5 rounded-xl space-y-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <label
            className="text-sm font-medium block mb-1.5"
            style={{ color: "var(--text-primary)" }}
          >
            Objective
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g., Going to Shenzhen + Shanghai next week. Goals: (1) CE Fund I LP meetings with Chinese family offices, (2) equipment partnership conversations for BTM microgrid"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              background: "var(--bg-surface-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label
              className="text-sm font-medium block mb-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Shenzhen, Shanghai"
              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-surface-hover)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <button
            onClick={generateBriefing}
            disabled={loading || !objective.trim()}
            className="px-5 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[16px] animate-spin">
                  progress_activity
                </span>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[16px]">
                  strategy
                </span>
                Generate Brief
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            background: "#ef444420",
            border: "1px solid #ef444440",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Recommended Meetings ({results.length})
            </h3>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {results.map((r, i) => (
              <div
                key={r.orgId ?? i}
                className="px-5 py-4 flex gap-4 cursor-pointer transition-colors"
                style={{}}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-surface-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                onClick={() => {
                  if (r.orgId)
                    window.location.href = `/organizations/${r.orgId}`;
                }}
              >
                {/* Fit score */}
                <div className="shrink-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold tabular-nums"
                    style={{
                      background: `${fitColor(r.strategicFit)}18`,
                      color: fitColor(r.strategicFit),
                      border: `1.5px solid ${fitColor(r.strategicFit)}40`,
                    }}
                  >
                    {r.strategicFit}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {r.orgName}
                    </span>
                    {r.contactName && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {r.contactName}
                        {r.contactTitle && ` · ${r.contactTitle}`}
                      </span>
                    )}
                  </div>

                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {r.reason}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {r.recommendedAsk && (
                      <span style={{ color: "var(--accent)" }}>
                        <span className="font-medium">Ask:</span>{" "}
                        {r.recommendedAsk}
                      </span>
                    )}
                    {r.introPath && (
                      <span style={{ color: "var(--text-tertiary)" }}>
                        <span className="font-medium">Path:</span>{" "}
                        {r.introPath}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <div
          className="p-8 rounded-xl text-center text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          No strategically relevant matches found for this objective.
        </div>
      )}
    </div>
  );
}
