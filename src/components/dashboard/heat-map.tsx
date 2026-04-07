"use client";

import Link from "next/link";
import { getWarmthLevel } from "@/lib/constants";
import type { OrgWithMeta } from "@/db/queries/organizations";

/**
 * Relationship Heat Map — Affinity-inspired grid.
 * Each cell = one LP, colored by warmth. Scannable in 2 seconds.
 */
export function HeatMap({ orgs }: { orgs: OrgWithMeta[] }) {
  // Filter out passed/closed for heat map
  const active = orgs.filter(
    (o) => o.stage !== "passed" && o.stage !== "closed"
  );

  if (active.length === 0) {
    return (
      <div
        className="p-6 rounded-xl text-center text-sm"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        No active LPs in pipeline
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Relationship Heat Map
        </h3>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            Hot (&lt;7d)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#eab308" }} />
            Warm
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#f97316" }} />
            Cooling
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
            Cold (30d+)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {active.map((org) => {
          const warmth = getWarmthLevel(org.daysSinceInteraction);
          return (
            <Link
              key={org.id}
              href={`/organizations/${org.id}`}
              className="group relative"
              title={`${org.name} — ${warmth.label}${
                org.daysSinceInteraction !== null
                  ? ` (${org.daysSinceInteraction}d)`
                  : ""
              }`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-medium transition-transform group-hover:scale-110"
                style={{
                  background: `${warmth.color}20`,
                  border: `1.5px solid ${warmth.color}50`,
                  color: warmth.color,
                }}
              >
                {org.name
                  .split(/[\s-]+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
