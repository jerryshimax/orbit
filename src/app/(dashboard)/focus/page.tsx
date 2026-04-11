"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { formatMoney } from "@/lib/format";
import { FUND_TARGET_MM } from "@/lib/constants";

/**
 * FOCUS — Objective-driven priority hub.
 * Surfaces what matters most right now, weighted by urgency × importance.
 */
export default function FocusPage() {
  const { data: orgs } = useOrganizations();
  const { data: pipeline } = usePipelineSummary();
  const { data: defaultTrip } = useDefaultTrip();
  const { data: tripData } = useTrip(defaultTrip?.id ?? null);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().split("T")[0];
  const { events: todayEvents } = useCalendarEvents(today, tomorrow);

  // Today's agenda (non-all-day events)
  const agenda = useMemo(() => {
    return todayEvents
      .filter((e) => !e.isAllDay)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, 8);
  }, [todayEvents]);

  // Next actions — aggregated from meeting action items
  const nextActions = useMemo(() => {
    if (!tripData?.meetings) return [];
    const items: {
      task: string;
      owner: string;
      due?: string;
      meetingTitle: string;
      meetingId: string;
    }[] = [];
    for (const m of tripData.meetings) {
      if (Array.isArray(m.actionItems)) {
        for (const a of m.actionItems as any[]) {
          if (!a.done) {
            items.push({
              task: a.task,
              owner: a.owner,
              due: a.due,
              meetingTitle: m.title,
              meetingId: m.id,
            });
          }
        }
      }
    }
    return items.slice(0, 10);
  }, [tripData]);

  // Signals — stale pipeline + upcoming meetings with no prep
  const signals = useMemo(() => {
    const items: {
      type: string;
      title: string;
      detail: string;
      href: string;
      urgency: number;
    }[] = [];

    // Stale pipeline: orgs with active deals but no interaction in 14+ days
    if (orgs) {
      for (const org of orgs) {
        if (
          org.primaryOpportunity &&
          org.primaryOpportunity.stage !== "passed" &&
          org.primaryOpportunity.stage !== "closed" &&
          org.daysSinceInteraction !== null &&
          org.daysSinceInteraction > 14
        ) {
          items.push({
            type: "stale",
            title: org.name,
            detail: `${org.daysSinceInteraction}d since last touch · ${org.primaryOpportunity.stage}`,
            href: `/organizations/${org.id}`,
            urgency: org.daysSinceInteraction,
          });
        }
      }
    }

    // Upcoming meetings in next 48h with no strategic objective
    if (tripData?.meetings) {
      const in48h = new Date(Date.now() + 48 * 3600_000)
        .toISOString()
        .split("T")[0];
      for (const m of tripData.meetings) {
        if (
          m.meetingDate &&
          m.meetingDate >= today &&
          m.meetingDate <= in48h &&
          !m.strategicAsk &&
          m.status !== "completed" &&
          m.status !== "cancelled"
        ) {
          items.push({
            type: "unprepped",
            title: m.title,
            detail: `${m.meetingDate} · No strategic objective set`,
            href: `/calendar/${m.id}`,
            urgency: 100,
          });
        }
      }
    }

    return items.sort((a, b) => b.urgency - a.urgency).slice(0, 8);
  }, [orgs, tripData, today]);

  const actionCount = nextActions.length;
  const signalCount = signals.length;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 lg:pb-8 space-y-8">
      {/* Header */}
      <div>
        <h1
          className="font-[Manrope] text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Focus
        </h1>
        <p
          className="text-sm mt-1 font-[JetBrains_Mono]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {actionCount} action{actionCount !== 1 ? "s" : ""} pending
          {signalCount > 0 &&
            ` · ${signalCount} signal${signalCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Today's Agenda — compact horizontal row */}
      {agenda.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Today's Agenda
            </h2>
            <Link
              href="/calendar"
              className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              See all →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {agenda.map((evt) => (
              <Link
                key={evt.id}
                href={`/calendar/${evt.id}`}
                className="shrink-0 px-3 py-2 rounded-lg hover:brightness-110 transition-colors"
                style={{ background: "#181c22", minWidth: 140 }}
              >
                <div
                  className="font-[JetBrains_Mono] text-xs"
                  style={{ color: "var(--accent)" }}
                >
                  {new Date(evt.startTime)
                    .toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                    .slice(0, 5)}
                </div>
                <div
                  className="text-xs font-[Manrope] font-semibold mt-0.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {evt.title}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Next Actions
          </h2>
          <div className="space-y-1.5">
            {nextActions.map((a, i) => (
              <Link
                key={i}
                href={`/calendar/${a.meetingId}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:brightness-110 transition-colors"
                style={{ background: "#181c22" }}
              >
                <div
                  className="w-5 h-5 rounded border shrink-0 mt-0.5"
                  style={{ borderColor: "var(--border)" }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.task}
                  </div>
                  <div
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {a.owner} · {a.meetingTitle}
                  </div>
                </div>
                {a.due && (
                  <span
                    className="text-[10px] font-[JetBrains_Mono] shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {a.due}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Signals
          </h2>
          <div className="space-y-1.5">
            {signals.map((s, i) => (
              <Link
                key={i}
                href={s.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:brightness-110 transition-colors"
                style={{ background: "#181c22" }}
              >
                <span
                  className="material-symbols-rounded text-lg shrink-0"
                  style={{
                    color: s.type === "stale" ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {s.type === "stale" ? "schedule" : "warning"}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-[Manrope] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {s.detail}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Fund Pulse */}
      {pipeline && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Fund Pulse
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Committed",
                value: formatMoney(pipeline.totalCommitted),
              },
              {
                label: "Pipeline",
                value: formatMoney(pipeline.totalTarget),
              },
              { label: "Active", value: String(pipeline.totalOrgs) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-lg"
                style={{ background: "#181c22" }}
              >
                <div
                  className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </div>
                <div
                  className="font-[JetBrains_Mono] text-lg font-bold mt-1"
                  style={{ color: "var(--accent)" }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
