"use client";

import Link from "next/link";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import type { MeetingWithOrg } from "@/db/queries/roadshow";

const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  confirmed: "#22c55e",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

const LEG_FLAGS: Record<string, string> = {
  "Hong Kong": "🇭🇰",
  China: "🇨🇳",
  France: "🇫🇷",
  "Los Angeles": "🇺🇸",
};

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start + "T00:00:00");
  const endD = new Date(end + "T00:00:00");
  while (d <= endD) {
    days.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function TimelineView({ tripId }: { tripId: string }) {
  const { data, isLoading } = useTrip(tripId);
  const today = new Date().toISOString().split("T")[0];

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl"
            style={{ background: "var(--bg-surface)" }}
          />
        ))}
      </div>
    );
  }

  const { legs, meetings } = data;

  // Group meetings by date
  const meetingsByDate: Record<string, MeetingWithOrg[]> = {};
  for (const m of meetings) {
    if (m.meetingDate) {
      if (!meetingsByDate[m.meetingDate]) meetingsByDate[m.meetingDate] = [];
      meetingsByDate[m.meetingDate].push(m);
    }
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-lg font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Timeline
      </h1>

      {legs.map((leg) => {
        const days = getDaysInRange(leg.startDate, leg.endDate);
        const flag =
          LEG_FLAGS[leg.city ?? ""] ??
          LEG_FLAGS[leg.country ?? ""] ??
          "📍";

        return (
          <div key={leg.id}>
            {/* Leg header — sticky */}
            <div
              className="sticky top-0 z-10 py-2 -mx-4 px-4 md:mx-0 md:px-0"
              style={{ background: "var(--bg)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span
                  className="font-semibold text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {leg.name}
                </span>
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {leg.startDate} → {leg.endDate}
                </span>
                {leg.timezone && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {leg.timezone.split("/").pop()}
                  </span>
                )}
              </div>
            </div>

            {/* Days */}
            <div className="space-y-3 ml-3 border-l-2 pl-4" style={{ borderColor: "var(--border-subtle)" }}>
              {days.map((day) => {
                const dayMeetings = meetingsByDate[day] ?? [];
                const isToday = day === today;
                const isPast = day < today;
                const dateObj = new Date(day + "T00:00:00");
                const dayLabel = dateObj.toLocaleDateString("en", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={day}
                    className="relative"
                    style={{ opacity: isPast ? 0.5 : 1 }}
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2"
                      style={{
                        background: isToday
                          ? "#ffba05"
                          : dayMeetings.length > 0
                            ? "var(--accent)"
                            : "var(--bg)",
                        borderColor: isToday
                          ? "#ffba05"
                          : dayMeetings.length > 0
                            ? "var(--accent)"
                            : "var(--border-subtle)",
                      }}
                    />

                    {/* Date label */}
                    <div
                      className="text-xs font-medium mb-1"
                      style={{
                        color: isToday ? "#ffba05" : "var(--text-secondary)",
                      }}
                    >
                      {dayLabel}
                      {isToday && (
                        <span className="ml-2 text-[10px] font-semibold uppercase">
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Meeting cards */}
                    {dayMeetings.length > 0 ? (
                      <div className="space-y-2">
                        {dayMeetings.map((m) => {
                          const statusColor =
                            STATUS_COLORS[m.status] ?? "#6b7280";
                          return (
                            <Link
                              key={m.id}
                              href={`/roadshow/meetings/${m.id}`}
                            >
                              <div
                                className="rounded-lg p-3 transition-all active:scale-[0.98]"
                                style={{
                                  background: "var(--bg-surface)",
                                  border: isToday
                                    ? "1px solid rgba(255,186,5,0.3)"
                                    : "1px solid var(--border-subtle)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {m.meetingTime && (
                                    <span
                                      className="text-xs font-mono tabular-nums"
                                      style={{ color: "var(--text-tertiary)" }}
                                    >
                                      {m.meetingTime.slice(0, 5)}
                                    </span>
                                  )}
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: statusColor }}
                                  />
                                  <span
                                    className="text-sm font-medium truncate"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {m.title}
                                  </span>
                                </div>
                                {m.location && (
                                  <div
                                    className="text-xs mt-1 truncate ml-[58px]"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {m.location}
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="text-xs py-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        No meetings
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TimelinePage() {
  const { data: trip } = useDefaultTrip();
  if (!trip) return null;
  return <TimelineView tripId={trip.id} />;
}
