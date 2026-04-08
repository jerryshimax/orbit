"use client";

import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { useInteractions } from "@/hooks/use-interactions";
import { PIPELINE_STAGES, FUND_TARGET_MM, getWarmthLevel } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export default function AnalyticsPage() {
  const { data: orgs } = useOrganizations();
  const { data: pipeline } = usePipelineSummary();
  const { data: interactions } = useInteractions({ limit: 500 });

  const committedPct = pipeline
    ? Math.round((pipeline.totalCommitted / FUND_TARGET_MM) * 100)
    : 0;

  // Intro network data
  const introEdges: { from: string; to: string }[] = [];
  const connectors: Record<string, number> = {};
  if (orgs) {
    for (const org of orgs) {
      // Use notes field to find introduced_by patterns
      // For now, this is placeholder — real data comes from contacts
    }
  }

  // Stage conversion: count orgs per stage (stage now lives on primaryOpportunity)
  const getStage = (o: { primaryOpportunity?: { stage: string } | null }) =>
    o.primaryOpportunity?.stage ?? "prospect";

  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: orgs?.filter((o) => getStage(o) === s.key).length ?? 0,
    target: orgs
      ?.filter((o) => getStage(o) === s.key)
      .reduce((sum, o) => sum + parseFloat(o.targetCommitment ?? "0"), 0) ?? 0,
  }));

  // Team activity
  const teamActivity: Record<string, number> = {};
  if (interactions) {
    for (const i of interactions) {
      teamActivity[i.teamMember] = (teamActivity[i.teamMember] ?? 0) + 1;
    }
  }

  // Warmth distribution
  const warmthDist = { hot: 0, warm: 0, cooling: 0, cold: 0, unknown: 0 };
  if (orgs) {
    for (const o of orgs) {
      const oStage = getStage(o);
      if (oStage === "passed" || oStage === "closed") continue;
      const w = getWarmthLevel(o.daysSinceInteraction);
      warmthDist[w.level]++;
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Pipeline metrics and relationship intelligence
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Commitment Gauge */}
        <div
          className="p-5 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h3
            className="text-sm font-medium mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Fund I Progress
          </h3>
          <div className="flex items-end gap-2">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{
                color:
                  committedPct >= 50
                    ? "#22c55e"
                    : committedPct >= 20
                    ? "#eab308"
                    : "var(--text-primary)",
              }}
            >
              {committedPct}%
            </span>
            <span
              className="text-sm mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              of ${FUND_TARGET_MM}M
            </span>
          </div>
          <div
            className="h-3 rounded-full mt-3 overflow-hidden"
            style={{ background: "var(--bg-surface-active)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(committedPct, 100)}%`,
                background:
                  committedPct >= 50
                    ? "#22c55e"
                    : committedPct >= 20
                    ? "#eab308"
                    : "var(--accent)",
              }}
            />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Committed</span>
              <span
                className="tabular-nums font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {formatMoney(pipeline?.totalCommitted ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>
                Pipeline Target
              </span>
              <span
                className="tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatMoney(pipeline?.totalTarget ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Funnel */}
        <div
          className="p-5 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h3
            className="text-sm font-medium mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Pipeline Funnel
          </h3>
          <div className="space-y-2">
            {stageCounts
              .filter((s) => s.key !== "passed")
              .map((s) => {
                const maxCount = Math.max(...stageCounts.map((x) => x.count), 1);
                const pct = (s.count / maxCount) * 100;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <span
                      className="text-xs w-20 truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {s.label}
                    </span>
                    <div
                      className="flex-1 h-5 rounded overflow-hidden"
                      style={{ background: "var(--bg-surface-active)" }}
                    >
                      <div
                        className="h-full rounded transition-all duration-500 flex items-center px-2"
                        style={{
                          width: `${Math.max(pct, 8)}%`,
                          background: s.color,
                        }}
                      >
                        <span className="text-[10px] font-medium text-white">
                          {s.count}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] tabular-nums w-12 text-right"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {formatMoney(s.target)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Warmth Distribution */}
        <div
          className="p-5 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h3
            className="text-sm font-medium mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Relationship Warmth
          </h3>
          <div className="space-y-3">
            {[
              { key: "hot", label: "Hot (<7d)", color: "#22c55e" },
              { key: "warm", label: "Warm (7-14d)", color: "#eab308" },
              { key: "cooling", label: "Cooling (15-30d)", color: "#f97316" },
              { key: "cold", label: "Cold (30d+)", color: "#ef4444" },
              { key: "unknown", label: "No contact", color: "#9ca3af" },
            ].map((w) => {
              const count = warmthDist[w.key as keyof typeof warmthDist];
              const total = Object.values(warmthDist).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={w.key} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: w.color }}
                  />
                  <span
                    className="text-xs flex-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {w.label}
                  </span>
                  <span
                    className="text-xs tabular-nums font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {count}
                  </span>
                  <div
                    className="w-16 h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-surface-active)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: w.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Activity */}
      <div
        className="p-5 rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Team Activity (Last 100 Interactions)
        </h3>
        <div className="flex gap-6">
          {Object.entries(teamActivity)
            .sort(([, a], [, b]) => b - a)
            .map(([member, count]) => {
              const maxCount = Math.max(...Object.values(teamActivity), 1);
              return (
                <div key={member} className="flex-1">
                  <div className="flex items-end gap-1 h-24">
                    <div
                      className="flex-1 rounded-t transition-all duration-500"
                      style={{
                        height: `${(count / maxCount) * 100}%`,
                        background: "var(--accent)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <div
                      className="text-lg font-bold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {count}
                    </div>
                    <div
                      className="text-xs uppercase"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {member}
                    </div>
                  </div>
                </div>
              );
            })}
          {Object.keys(teamActivity).length === 0 && (
            <div
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              No interactions logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
