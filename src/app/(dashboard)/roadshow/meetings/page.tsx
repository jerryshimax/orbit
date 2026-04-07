"use client";

import Link from "next/link";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import type { MeetingWithOrg } from "@/db/queries/roadshow";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  confirmed: "#22c55e",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

const TYPE_ICONS: Record<string, string> = {
  roundtable: "table_restaurant",
  "1on1": "person",
  dinner: "restaurant",
  site_visit: "factory",
  conference: "groups",
};

function MeetingListCard({ meeting }: { meeting: MeetingWithOrg }) {
  const statusColor = STATUS_COLORS[meeting.status] ?? "#6b7280";
  const icon = TYPE_ICONS[meeting.meetingType ?? ""] ?? "event";
  const attendeeCount = Array.isArray(meeting.attendees)
    ? meeting.attendees.length
    : 0;

  const dateStr = meeting.meetingDate
    ? new Date(meeting.meetingDate + "T00:00:00").toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        weekday: "short",
      })
    : "TBD";

  return (
    <Link href={`/roadshow/meetings/${meeting.id}`}>
      <div
        className="rounded-xl p-4 transition-all active:scale-[0.98]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center min-w-[48px]">
            <span
              className="font-mono text-xs font-medium tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {dateStr}
            </span>
            <span
              className="material-symbols-rounded text-[18px] mt-1"
              style={{ color: statusColor }}
            >
              {icon}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="font-medium text-sm truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {meeting.title}
            </div>
            {meeting.location && (
              <div
                className="text-xs mt-1 flex items-center gap-1 truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                <span className="material-symbols-rounded text-[14px]">
                  location_on
                </span>
                {meeting.location}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {meeting.meetingTime && (
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {meeting.meetingTime.slice(0, 5)}
                </span>
              )}
              {attendeeCount > 0 && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <span className="material-symbols-rounded text-[14px]">
                    people
                  </span>
                  {attendeeCount}
                </span>
              )}
              <span
                className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded"
                style={{
                  background: `${statusColor}20`,
                  color: statusColor,
                }}
              >
                {meeting.status}
              </span>
              {meeting.language === "zh" && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(255,186,5,0.15)",
                    color: "#ffba05",
                  }}
                >
                  中文
                </span>
              )}
            </div>
          </div>

          <span
            className="material-symbols-rounded text-[20px] mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            chevron_right
          </span>
        </div>
      </div>
    </Link>
  );
}

function MeetingsList({ tripId }: { tripId: string }) {
  const { data, isLoading } = useTrip(tripId);
  const [filter, setFilter] = useState<string>("all");

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl"
            style={{ background: "var(--bg-surface)" }}
          />
        ))}
      </div>
    );
  }

  const { legs, meetings } = data;
  const legFilters = [
    { id: "all", label: "All" },
    ...legs.map((l) => ({ id: l.id, label: l.name.split(" —")[0] })),
  ];

  const filtered =
    filter === "all" ? meetings : meetings.filter((m) => m.legId === filter);

  // Group by date
  const grouped: Record<string, MeetingWithOrg[]> = {};
  for (const m of filtered) {
    const key = m.meetingDate ?? "TBD";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return (
    <div className="space-y-4">
      <h1
        className="text-lg font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Meetings
      </h1>

      {/* Filter chips */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {legFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]"
              style={{
                background:
                  filter === f.id
                    ? "rgba(255,186,5,0.15)"
                    : "var(--bg-surface)",
                color: filter === f.id ? "#ffba05" : "var(--text-secondary)",
                border:
                  filter === f.id
                    ? "1px solid rgba(255,186,5,0.3)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings grouped by date */}
      {Object.entries(grouped).map(([date, dateMeetings]) => {
        const dateLabel =
          date === "TBD"
            ? "TBD"
            : new Date(date + "T00:00:00").toLocaleDateString("en", {
                weekday: "long",
                month: "short",
                day: "numeric",
              });

        return (
          <div key={date}>
            <div
              className="text-xs font-medium mb-2 sticky top-0 py-1 z-10"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg)",
              }}
            >
              {dateLabel}
            </div>
            <div className="space-y-2">
              {dateMeetings.map((m) => (
                <MeetingListCard key={m.id} meeting={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MeetingsPage() {
  const { data: trip } = useDefaultTrip();
  if (!trip) return null;
  return <MeetingsList tripId={trip.id} />;
}
