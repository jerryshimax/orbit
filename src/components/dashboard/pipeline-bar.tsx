"use client";

import { PIPELINE_STAGES } from "@/lib/constants";

type StageData = {
  stage: string;
  count: number;
  totalTarget: number;
};

/**
 * Horizontal stacked bar showing pipeline distribution by stage.
 */
export function PipelineBar({ stages }: { stages: StageData[] }) {
  const total = stages.reduce((s, r) => s + r.count, 0);
  if (total === 0) return null;

  // Filter out passed for the bar
  const activeStages = stages.filter((s) => s.stage !== "passed");
  const activeTotal = activeStages.reduce((s, r) => s + r.count, 0);

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h3
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        Pipeline Distribution
      </h3>

      {/* Bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--bg-surface-active)" }}>
        {PIPELINE_STAGES.filter((s) => s.key !== "passed").map((stageDef) => {
          const data = activeStages.find((s) => s.stage === stageDef.key);
          if (!data || data.count === 0) return null;
          const pct = (data.count / activeTotal) * 100;
          return (
            <div
              key={stageDef.key}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: stageDef.color,
                minWidth: pct > 0 ? "4px" : 0,
              }}
              title={`${stageDef.label}: ${data.count}`}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {PIPELINE_STAGES.filter((s) => s.key !== "passed").map((stageDef) => {
          const data = activeStages.find((s) => s.stage === stageDef.key);
          if (!data || data.count === 0) return null;
          return (
            <div
              key={stageDef.key}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: stageDef.color }}
              />
              {stageDef.label}
              <span className="tabular-nums font-medium">{data.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
