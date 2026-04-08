"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrganizations } from "@/hooks/use-organizations";
import { StageBadge } from "@/components/shared/stage-badge";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { Sparkline } from "@/components/shared/sparkline";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { formatMoney, formatRelativeDate } from "@/lib/format";
import { PIPELINE_STAGES, LP_TYPES } from "@/lib/constants";

export default function OrganizationsPage() {
  const [stageFilter, setStageFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: orgs } = useOrganizations({
    stage: stageFilter || undefined,
    lpType: typeFilter || undefined,
    q: search || undefined,
  });
  const { data: pipeline } = usePipelineSummary();

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const sorted = orgs
    ? [...orgs].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name) * dir;
          case "stage":
            return (a.primaryOpportunity?.stage ?? "").localeCompare(b.primaryOpportunity?.stage ?? "") * dir;
          case "target":
            return (
              (parseFloat(a.targetCommitment ?? "0") -
                parseFloat(b.targetCommitment ?? "0")) *
              dir
            );
          case "lastTouch":
            return (
              ((a.daysSinceInteraction ?? 999) -
                (b.daysSinceInteraction ?? 999)) *
              dir
            );
          default:
            return 0;
        }
      })
    : [];

  const SortHeader = ({
    col,
    label,
    align,
  }: {
    col: string;
    label: string;
    align?: string;
  }) => (
    <th
      className={`px-3 py-2 text-xs font-medium cursor-pointer select-none ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: "var(--text-tertiary)" }}
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortBy === col && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Organizations
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {orgs?.length ?? 0} LP organizations
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm w-64 outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">All types</option>
          {Object.entries(LP_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <SortHeader col="name" label="Organization" />
              <SortHeader col="stage" label="Stage" />
              <th
                className="px-3 py-2 text-xs font-medium text-left"
                style={{ color: "var(--text-tertiary)" }}
              >
                Type
              </th>
              <SortHeader col="target" label="Target" align="right" />
              <th
                className="px-3 py-2 text-xs font-medium text-left"
                style={{ color: "var(--text-tertiary)" }}
              >
                Contact
              </th>
              <th
                className="px-3 py-2 text-xs font-medium text-left"
                style={{ color: "var(--text-tertiary)" }}
              >
                Owner
              </th>
              <SortHeader col="lastTouch" label="Last Touch" />
              <th
                className="px-3 py-2 text-xs font-medium text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((org) => (
              <tr
                key={org.id}
                className="transition-colors cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "var(--bg-surface-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                onClick={() =>
                  (window.location.href = `/organizations/${org.id}`)
                }
              >
                <td className="px-3 py-2.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {org.name}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <StageBadge stage={org.primaryOpportunity?.stage ?? "prospect"} />
                </td>
                <td
                  className="px-3 py-2.5 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {LP_TYPES[org.lpType ?? ""] ?? "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-sm text-right tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatMoney(org.targetCommitment)}
                </td>
                <td
                  className="px-3 py-2.5 text-xs truncate max-w-[150px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {org.primaryContact ?? "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-xs uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {org.relationshipOwner ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <WarmthDot
                    daysSinceTouch={org.daysSinceInteraction}
                    showLabel
                  />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Sparkline
                    data={pipeline?.sparklines?.[org.id] ?? []}
                    width={52}
                    height={14}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No organizations found
          </div>
        )}
      </div>
    </div>
  );
}
