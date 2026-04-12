"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import { useAllMeetings } from "@/hooks/use-meetings-all";
import type { MeetingWithOrg } from "@/db/queries/roadshow";
import type { UnifiedMeeting, UnifiedMeetingFilter } from "@/db/queries/meetings-all";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "#22c55e", icon: "check_circle" },
  planned: { label: "Planned", color: "#3b82f6", icon: "schedule" },
  tentative: { label: "Tentative", color: "#f59e0b", icon: "help_outline" },
  waiting_response: { label: "Waiting", color: "#f97316", icon: "hourglass_top" },
  outreach_sent: { label: "Outreach Sent", color: "#8b5cf6", icon: "send" },
  identified: { label: "Identified", color: "#6b7280", icon: "person_search" },
  completed: { label: "Completed", color: "#6b7280", icon: "done_all" },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: "cancel" },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const STATUS_ORDER: StatusKey[] = [
  "confirmed",
  "planned",
  "tentative",
  "waiting_response",
  "outreach_sent",
  "identified",
  "completed",
];

const SOURCE_TABS: { key: UnifiedMeetingFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "roadshow", label: "Roadshow" },
  { key: "brain", label: "Brain" },
];

function BrainPill() {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-[Space_Grotesk] font-bold uppercase tracking-wider"
      style={{ background: "#7c3aed20", color: "#a78bfa" }}
      title="Sourced from Brain notes"
    >
      Brain
    </span>
  );
}

function RoadshowMeetingCard({ meeting }: { meeting: MeetingWithOrg }) {
  const status = STATUS_CONFIG[meeting.status as StatusKey] ?? STATUS_CONFIG.planned;
  const attendeeCount = Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div className="p-4 rounded-lg space-y-2" style={{ background: "#181c22" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-[JetBrains_Mono] text-xs" style={{ color: "var(--text-tertiary)" }}>
              {meeting.meetingDate} · {meeting.meetingTime?.slice(0, 5) ?? "TBD"}
            </span>
            {meeting.language === "zh" && (
              <span
                className="text-[9px] font-[Space_Grotesk] px-1.5 py-0.5 rounded"
                style={{ background: "#262a31", color: "var(--text-tertiary)" }}
              >
                ZH
              </span>
            )}
          </div>
          <span className="material-symbols-outlined text-sm" style={{ color: status.color }}>
            {status.icon}
          </span>
        </div>
        <h3 className="font-[Manrope] font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          {meeting.title}
        </h3>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {meeting.orgName && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
              {meeting.orgName}
            </span>
          )}
          {meeting.location && (
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[12px]">location_on</span>
              {meeting.location}
            </span>
          )}
        </div>
        {meeting.strategicAsk && (
          <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {meeting.strategicAsk}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          {attendeeCount > 0 && (
            <span className="text-[10px] font-[Space_Grotesk]" style={{ color: "var(--text-tertiary)" }}>
              {attendeeCount} attendees
            </span>
          )}
          {meeting.oppStage && (
            <span
              className="text-[10px] font-[Space_Grotesk] px-1.5 py-0.5 rounded uppercase"
              style={{ background: `${status.color}15`, color: status.color }}
            >
              {meeting.oppStage}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function UnifiedCard({ meeting }: { meeting: UnifiedMeeting }) {
  const status = STATUS_CONFIG[meeting.status as StatusKey] ?? STATUS_CONFIG.completed;

  return (
    <Link href={meeting.href} className="block active:scale-[0.98] transition-transform">
      <div className="p-4 rounded-lg space-y-2" style={{ background: "#181c22" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-[JetBrains_Mono] text-xs" style={{ color: "var(--text-tertiary)" }}>
              {meeting.meetingDate ?? "TBD"} · {meeting.meetingTime ?? ""}
            </span>
            {meeting.source === "brain" && <BrainPill />}
          </div>
          <span className="material-symbols-outlined text-sm" style={{ color: status.color }}>
            {status.icon}
          </span>
        </div>
        <h3 className="font-[Manrope] font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          {meeting.title}
        </h3>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {meeting.orgName && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
              {meeting.orgName}
            </span>
          )}
          {meeting.location && (
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[12px]">location_on</span>
              {meeting.location}
            </span>
          )}
          {meeting.entityCode && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-[Space_Grotesk]"
              style={{ background: "#262a31", color: "var(--text-tertiary)" }}
            >
              {meeting.entityCode}
            </span>
          )}
        </div>
        {meeting.strategicAsk && (
          <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {meeting.strategicAsk}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function MeetingsPage() {
  const [sourceFilter, setSourceFilter] = useState<UnifiedMeetingFilter>("all");
  const { data: defaultTrip } = useDefaultTrip();
  const { data: tripData } = useTrip(defaultTrip?.id ?? null);
  const [filterLeg, setFilterLeg] = useState<string>("");

  const roadshowOnlyView = sourceFilter === "roadshow";

  // Roadshow-only view preserves legacy leg-filter + status grouping behavior.
  const roadshowMeetings = useMemo(() => {
    if (!tripData?.meetings) return [];
    let filtered = tripData.meetings;
    if (filterLeg) filtered = filtered.filter((m) => m.legId === filterLeg);
    return filtered;
  }, [tripData, filterLeg]);

  const grouped = useMemo(() => {
    const groups: Record<string, MeetingWithOrg[]> = {};
    for (const status of STATUS_ORDER) groups[status] = [];
    for (const m of roadshowMeetings) {
      const key = (m.status as StatusKey) in STATUS_CONFIG ? m.status : "planned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }, [roadshowMeetings]);

  // Unified view (All / Brain) uses the union query.
  const { data: unified } = useAllMeetings({
    source: sourceFilter,
    // SWR is keyed on the query string — empty entity still cache-hits cleanly.
  });
  const unifiedList = unified ?? [];

  const totalCount =
    sourceFilter === "roadshow" ? roadshowMeetings.length : unifiedList.length;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-[Manrope] text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Meetings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            {totalCount} meetings
            {roadshowOnlyView && tripData?.legs
              ? ` across ${tripData.legs.length} cities`
              : ""}
          </p>
        </div>
      </div>

      {/* Source tabs: All / Roadshow / Brain */}
      <div className="flex gap-2" role="tablist" aria-label="Meeting source">
        {SOURCE_TABS.map((tab) => {
          const active = sourceFilter === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSourceFilter(tab.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors"
              style={{
                background: active ? "var(--accent)" : "#262a31",
                color: active ? "#412d00" : "var(--text-secondary)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Leg filter chips — only shown on Roadshow tab */}
      {roadshowOnlyView && tripData?.legs && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterLeg("")}
            className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors"
            style={{
              background: !filterLeg ? "var(--accent)" : "#262a31",
              color: !filterLeg ? "#412d00" : "var(--text-secondary)",
            }}
          >
            All legs
          </button>
          {tripData.legs.map((leg) => (
            <button
              key={leg.id}
              onClick={() => setFilterLeg(leg.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors"
              style={{
                background: filterLeg === leg.id ? "var(--accent)" : "#262a31",
                color: filterLeg === leg.id ? "#412d00" : "var(--text-secondary)",
              }}
            >
              {leg.city ?? leg.name}
            </button>
          ))}
        </div>
      )}

      {/* Roadshow-only view: status groups (legacy layout) */}
      {roadshowOnlyView &&
        STATUS_ORDER.map((status) => {
          const items = grouped[status];
          if (!items || items.length === 0) return null;
          const config = STATUS_CONFIG[status];
          return (
            <section key={status} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                <h2
                  className="font-[Space_Grotesk] text-xs uppercase tracking-wider font-bold"
                  style={{ color: config.color }}
                >
                  {config.label}
                </h2>
                <span
                  className="text-[10px] font-[JetBrains_Mono]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((m) => (
                  <RoadshowMeetingCard key={m.id} meeting={m} />
                ))}
              </div>
            </section>
          );
        })}

      {/* Unified view: All / Brain */}
      {!roadshowOnlyView && (
        <div className="space-y-2">
          {unifiedList.map((m) => (
            <UnifiedCard key={`${m.source}-${m.id}`} meeting={m} />
          ))}
        </div>
      )}

      {totalCount === 0 && (
        <div
          className="p-12 text-center text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          No meetings found
        </div>
      )}
    </div>
  );
}
