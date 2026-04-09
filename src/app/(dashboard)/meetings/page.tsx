"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import type { MeetingWithOrg } from "@/db/queries/roadshow";

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

function MeetingCard({ meeting }: { meeting: MeetingWithOrg }) {
  const status = STATUS_CONFIG[meeting.status as StatusKey] ?? STATUS_CONFIG.planned;
  const attendeeCount = Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div
        className="p-4 rounded-lg space-y-2"
        style={{ background: "#181c22" }}
      >
        {/* Header: date + time + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-[JetBrains_Mono] text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
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
          <span
            className="material-symbols-outlined text-sm"
            style={{ color: status.color }}
          >
            {status.icon}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-[Manrope] font-bold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {meeting.title}
        </h3>

        {/* Org + location */}
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

        {/* Strategic ask preview */}
        {meeting.strategicAsk && (
          <p
            className="text-xs line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {meeting.strategicAsk}
          </p>
        )}

        {/* Footer: attendees + stage */}
        <div className="flex items-center gap-3 pt-1">
          {attendeeCount > 0 && (
            <span
              className="text-[10px] font-[Space_Grotesk]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {attendeeCount} attendees
            </span>
          )}
          {meeting.oppStage && (
            <span
              className="text-[10px] font-[Space_Grotesk] px-1.5 py-0.5 rounded uppercase"
              style={{
                background: `${status.color}15`,
                color: status.color,
              }}
            >
              {meeting.oppStage}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MeetingsPage() {
  const { data: defaultTrip } = useDefaultTrip();
  const { data: tripData } = useTrip(defaultTrip?.id ?? null);
  const [filterLeg, setFilterLeg] = useState<string>("");

  const meetings = useMemo(() => {
    if (!tripData?.meetings) return [];
    let filtered = tripData.meetings;
    if (filterLeg) {
      filtered = filtered.filter((m) => m.legId === filterLeg);
    }
    return filtered;
  }, [tripData, filterLeg]);

  // Group by status
  const grouped = useMemo(() => {
    const groups: Record<string, MeetingWithOrg[]> = {};
    for (const status of STATUS_ORDER) {
      groups[status] = [];
    }
    for (const m of meetings) {
      const key = (m.status as StatusKey) in STATUS_CONFIG ? m.status : "planned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }, [meetings]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-32 lg:pt-8 lg:pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-[Manrope] text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Meetings
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {meetings.length} meetings across {tripData?.legs?.length ?? 0} cities
          </p>
        </div>
      </div>

      {/* Leg filter chips */}
      {tripData?.legs && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterLeg("")}
            className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors"
            style={{
              background: !filterLeg ? "var(--accent)" : "#262a31",
              color: !filterLeg ? "#412d00" : "var(--text-secondary)",
            }}
          >
            All
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

      {/* Status groups */}
      {STATUS_ORDER.map((status) => {
        const items = grouped[status];
        if (!items || items.length === 0) return null;
        const config = STATUS_CONFIG[status];

        return (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: config.color }}
              />
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
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          </section>
        );
      })}

      {meetings.length === 0 && (
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
