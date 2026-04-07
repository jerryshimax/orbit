"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { useInteractions } from "@/hooks/use-interactions";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StageBadge } from "@/components/shared/stage-badge";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { Sparkline } from "@/components/shared/sparkline";
import { formatMoney } from "@/lib/format";
import {
  FUND_TARGET_MM,
  STRATEGIC_CATEGORIES,
  STRATEGIC_CATEGORY_MAP,
  inferStrategicCategory,
} from "@/lib/constants";
import type { OrgWithMeta } from "@/db/queries/organizations";

function CategoryTable({
  category,
  orgs,
  sparklines,
}: {
  category: (typeof STRATEGIC_CATEGORIES)[number];
  orgs: OrgWithMeta[];
  sparklines: Record<string, number[]>;
}) {
  if (orgs.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Category header */}
      <div
        className="px-4 py-3 flex items-center gap-2.5 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span
          className="material-symbols-rounded text-[20px]"
          style={{ color: category.color }}
        >
          {category.icon}
        </span>
        <div className="flex-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {category.label}
          </span>
          <span
            className="text-xs ml-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {orgs.length}
          </span>
        </div>
        <span
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {category.description}
        </span>
      </div>

      {/* Rows */}
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {["Organization", "Stage", "Contact", "HQ", "Notes", "Warmth", "Activity"].map((h) => (
              <th
                key={h}
                className="px-3 py-1.5 text-[11px] font-medium text-left"
                style={{ color: "var(--text-tertiary)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr
              key={org.id}
              className="transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              onClick={() =>
                (window.location.href = `/organizations/${org.id}`)
              }
            >
              <td className="px-3 py-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {org.name}
                </span>
              </td>
              <td className="px-3 py-2">
                <StageBadge stage={org.stage} />
              </td>
              <td
                className="px-3 py-2 text-xs truncate max-w-[120px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {org.primaryContact ?? "—"}
              </td>
              <td
                className="px-3 py-2 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                {org.headquarters ?? "—"}
              </td>
              <td
                className="px-3 py-2 text-xs truncate max-w-[200px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {org.notes?.slice(0, 60) ?? "—"}
                {org.notes && org.notes.length > 60 ? "..." : ""}
              </td>
              <td className="px-3 py-2">
                <WarmthDot daysSinceTouch={org.daysSinceInteraction} size={6} />
              </td>
              <td className="px-3 py-2">
                <Sparkline
                  data={sparklines[org.id] ?? []}
                  width={48}
                  height={12}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { data: orgs } = useOrganizations();
  const { data: pipeline } = usePipelineSummary();
  const { data: recentInteractions } = useInteractions({ limit: 10 });

  const committedPct = pipeline
    ? Math.round((pipeline.totalCommitted / FUND_TARGET_MM) * 100)
    : 0;

  // Group orgs by strategic category
  const categorizedOrgs = useMemo(() => {
    if (!orgs) return {};
    const groups: Record<string, OrgWithMeta[]> = {};
    for (const org of orgs) {
      const cat = inferStrategicCategory(org);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(org);
    }
    return groups;
  }, [orgs]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header with trip context */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Orbit
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {orgs?.length ?? 0} organizations across{" "}
            {Object.keys(categorizedOrgs).length} categories
          </p>
        </div>
        <Link
          href="/briefing"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <span className="material-symbols-rounded text-[18px]">
            strategy
          </span>
          Trip Briefing
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Pipeline"
          value={String(orgs?.length ?? 0)}
          subtext={`${Object.keys(categorizedOrgs).filter(k => k !== "uncategorized").length} strategic categories`}
          icon="hub"
        />
        <StatCard
          label="Committed"
          value={pipeline ? formatMoney(pipeline.totalCommitted) : "—"}
          subtext={`${committedPct}% of $${FUND_TARGET_MM}M`}
          icon="verified"
          accent={committedPct > 0 ? "#22c55e" : undefined}
        />
        <StatCard
          label="Stale (14d+)"
          value={String(pipeline?.staleCount ?? 0)}
          subtext="Need follow-up"
          icon="schedule"
          accent={
            pipeline && pipeline.staleCount > 5 ? "#f97316" : undefined
          }
        />
        <StatCard
          label="Recent Touches"
          value={String(recentInteractions?.length ?? 0)}
          subtext="Last 10 interactions"
          icon="touch_app"
        />
      </div>

      {/* Category Tables — the main view */}
      <div className="space-y-4">
        {STRATEGIC_CATEGORIES.filter((c) => c.key !== "uncategorized").map(
          (category) => (
            <CategoryTable
              key={category.key}
              category={category}
              orgs={categorizedOrgs[category.key] ?? []}
              sparklines={pipeline?.sparklines ?? {}}
            />
          )
        )}

        {/* Uncategorized at bottom */}
        {categorizedOrgs["uncategorized"] &&
          categorizedOrgs["uncategorized"].length > 0 && (
            <CategoryTable
              category={STRATEGIC_CATEGORY_MAP["uncategorized"]}
              orgs={categorizedOrgs["uncategorized"]}
              sparklines={pipeline?.sparklines ?? {}}
            />
          )}
      </div>

      {/* Recent Activity — compact, at the bottom */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
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
            Recent Activity
          </h3>
        </div>
        {recentInteractions && (
          <RecentActivity interactions={recentInteractions} />
        )}
      </div>
    </div>
  );
}
