"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { useInteractions } from "@/hooks/use-interactions";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { formatMoney } from "@/lib/format";
import { FUND_TARGET_MM, getWarmthLevel } from "@/lib/constants";
import type { OrgWithMeta } from "@/db/queries/organizations";

/**
 * BRIEF — Morning dashboard.
 * Today's schedule + action items + meeting status + reconnect + fund pulse.
 */
export default function BriefPage() {
  const { data: orgs } = useOrganizations();
  const { data: pipeline } = usePipelineSummary();
  const { data: recentInteractions } = useInteractions({ limit: 5 });
  const { data: defaultTrip } = useDefaultTrip();
  const { data: tripData } = useTrip(defaultTrip?.id ?? null);

  const committedPct = pipeline
    ? Math.round((pipeline.totalCommitted / FUND_TARGET_MM) * 100)
    : 0;

  // Today's meetings
  const today = new Date().toISOString().split("T")[0];
  const todayMeetings = useMemo(() => {
    if (!tripData?.meetings) return [];
    return tripData.meetings
      .filter((m) => m.meetingDate === today)
      .sort((a, b) => (a.meetingTime ?? "").localeCompare(b.meetingTime ?? ""));
  }, [tripData, today]);

  // Action items from meetings
  const actionItems = useMemo(() => {
    if (!tripData?.meetings) return [];
    const items: { task: string; owner: string; due?: string; done: boolean; meetingTitle: string }[] = [];
    for (const m of tripData.meetings) {
      if (Array.isArray(m.actionItems)) {
        for (const a of m.actionItems as any[]) {
          if (!a.done) {
            items.push({ ...a, meetingTitle: m.title });
          }
        }
      }
    }
    return items.slice(0, 8);
  }, [tripData]);

  // Meeting status counts
  const meetingStatusCounts = useMemo(() => {
    if (!tripData?.meetings) return { confirmed: 0, planned: 0, total: 0 };
    const confirmed = tripData.meetings.filter((m) => m.status === "confirmed").length;
    const planned = tripData.meetings.filter((m) => m.status === "planned").length;
    return { confirmed, planned, total: tripData.meetings.length };
  }, [tripData]);

  // Reconnect — people who haven't been touched in a while
  const reconnectOrgs = useMemo(() => {
    if (!orgs) return [];
    return orgs
      .filter((o) => {
        const stage = o.primaryOpportunity?.stage;
        if (!stage || stage === "passed" || stage === "closed") return false;
        return (o.daysSinceInteraction ?? 999) > 14;
      })
      .sort((a, b) => (b.daysSinceInteraction ?? 999) - (a.daysSinceInteraction ?? 999))
      .slice(0, 8);
  }, [orgs]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-4 pt-8 pb-32 md:pb-8">
      {/* Header */}
      <div>
        <h1
          className="font-[Manrope] text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Brief
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Today's Schedule */}
      <section className="space-y-3">
        <h2
          className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em] px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Today's Schedule
        </h2>
        {todayMeetings.length === 0 ? (
          <div
            className="p-4 rounded-lg text-sm text-center"
            style={{ background: "#181c22", color: "var(--text-tertiary)" }}
          >
            No meetings today
          </div>
        ) : (
          <div className="space-y-2">
            {todayMeetings.map((m, i) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="block active:scale-[0.98] transition-transform"
              >
                <div
                  className="p-4 rounded-lg flex gap-4"
                  style={{
                    background: i === 0 ? "#262a31" : "#181c22",
                    borderLeft: i === 0 ? "2px solid var(--accent)" : undefined,
                  }}
                >
                  <div
                    className="w-16 shrink-0 font-[JetBrains_Mono] text-sm"
                    style={{ color: i === 0 ? "var(--accent)" : "var(--text-tertiary)" }}
                  >
                    {m.meetingTime?.slice(0, 5) ?? "TBD"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-[Manrope] font-bold text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {m.title}
                    </div>
                    {m.location && (
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {m.location}
                      </div>
                    )}
                  </div>
                  {i === 0 && (
                    <span
                      className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-2 py-0.5 rounded self-start shrink-0"
                      style={{ background: "var(--accent)", color: "#412d00" }}
                    >
                      Next
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <h2
            className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em] px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Action Items
          </h2>
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "#181c22" }}
          >
            {actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  borderBottom: i < actionItems.length - 1 ? "1px solid #262a31" : undefined,
                }}
              >
                <div
                  className="w-4 h-4 rounded border mt-0.5 shrink-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.task}
                  </div>
                  <div
                    className="text-[10px] font-[Space_Grotesk] mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.owner} · {item.meetingTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Meeting Status */}
      <section className="space-y-3">
        <h2
          className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em] px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Meeting Status
        </h2>
        <Link href="/meetings">
          <div
            className="flex items-center gap-4 p-4 rounded-lg"
            style={{ background: "#181c22" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {meetingStatusCounts.confirmed} confirmed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#f59e0b" }}
              />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {meetingStatusCounts.planned} planned
              </span>
            </div>
            <span
              className="ml-auto text-xs font-[JetBrains_Mono]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {meetingStatusCounts.total} total
            </span>
            <span
              className="material-symbols-outlined text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              chevron_right
            </span>
          </div>
        </Link>
      </section>

      {/* Reconnect */}
      {reconnectOrgs.length > 0 && (
        <section className="space-y-3">
          <h2
            className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em] px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Reconnect
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {reconnectOrgs.map((org) => {
              const warmth = getWarmthLevel(org.daysSinceInteraction);
              return (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="flex-shrink-0 active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-32 p-3 rounded-lg space-y-2"
                    style={{
                      background: "#181c22",
                      border: `1px solid ${warmth.color}30`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `${warmth.color}15`,
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
                    <div
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {org.name}
                    </div>
                    <div
                      className="text-[10px] font-[JetBrains_Mono]"
                      style={{ color: warmth.color }}
                    >
                      {org.daysSinceInteraction}d ago
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Fund Pulse */}
      <section className="space-y-3">
        <h2
          className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em] px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Fund Pulse
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
            <div
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Committed
            </div>
            <div
              className="font-[Space_Grotesk] text-xl font-bold"
              style={{ color: "var(--accent)" }}
            >
              {pipeline ? formatMoney(pipeline.totalCommitted) : "—"}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
            <div
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Pipeline
            </div>
            <div
              className="font-[Space_Grotesk] text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {pipeline ? formatMoney(pipeline.totalTarget) : "—"}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
            <div
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Active
            </div>
            <div
              className="font-[Space_Grotesk] text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {pipeline?.totalOrgs ?? "—"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
