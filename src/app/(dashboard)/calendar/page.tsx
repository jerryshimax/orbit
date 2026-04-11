"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCalendarEvents } from "@/hooks/use-calendar";

/**
 * CALENDAR — Unified calendar view.
 * Google Calendar is the single source of truth.
 * Field trip meetings get a gold badge when matched.
 */
export default function CalendarPage() {
  const today = new Date().toISOString().split("T")[0];

  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 86400_000)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(now.getTime() + 30 * 86400_000)
    .toISOString()
    .split("T")[0];

  const {
    events: calendarEvents,
    hasGoogleConnected,
    isLoading,
  } = useCalendarEvents(startDate, endDate);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, typeof calendarEvents> = {};
    for (const evt of calendarEvents) {
      const d = evt.startTime.split("T")[0];
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(evt);
    }
    return grouped;
  }, [calendarEvents]);

  const sortedDates = useMemo(
    () => Object.keys(eventsByDate).sort(),
    [eventsByDate]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 lg:pb-8 space-y-2">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="font-[Manrope] text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Calendar
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          Your Calendar
        </p>
      </div>

      {/* Connect Google Banner */}
      {!hasGoogleConnected && !isLoading && (
        <a
          href="/api/google/auth"
          className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:brightness-110"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--accent)",
          }}
        >
          <span
            className="material-symbols-rounded text-2xl"
            style={{ color: "var(--accent)" }}
          >
            event
          </span>
          <div className="flex-1">
            <div
              className="font-[Manrope] font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Connect Google Calendar
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Sync your calendar events and auto-import contacts from meetings
            </div>
          </div>
          <span
            className="material-symbols-rounded"
            style={{ color: "var(--accent)" }}
          >
            arrow_forward
          </span>
        </a>
      )}

      {/* Loading */}
      {isLoading && (
        <div
          className="p-12 text-center text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          Loading calendar...
        </div>
      )}

      {/* Events by date */}
      {sortedDates.length > 0 && (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const d = new Date(date + "T00:00:00");
            const dayLabel = d.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const isToday = date === today;
            const isPast = date < today;
            const events = eventsByDate[date];

            return (
              <div key={date}>
                <div
                  className="text-xs font-[JetBrains_Mono] px-1 py-2"
                  style={{
                    color: isToday ? "var(--accent)" : "var(--text-tertiary)",
                  }}
                >
                  {isToday ? "TODAY" : dayLabel.toUpperCase()}
                </div>

                <div className="space-y-2">
                  {events.map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/calendar/${evt.id}`}
                      className="block active:scale-[0.98] transition-transform"
                    >
                      <div
                        className={`flex gap-4 p-4 rounded-lg ${isPast ? "opacity-40" : ""}`}
                        style={{
                          background: isToday ? "#262a31" : "#181c22",
                          borderLeft:
                            evt.type === "field_trip"
                              ? "2px solid var(--accent)"
                              : "2px solid #3b82f6",
                        }}
                      >
                        {/* Time */}
                        <div className="w-14 shrink-0">
                          <span
                            className="font-[JetBrains_Mono] text-sm"
                            style={{
                              color: isToday
                                ? "var(--accent)"
                                : "var(--text-tertiary)",
                            }}
                          >
                            {evt.isAllDay
                              ? "ALL"
                              : new Date(evt.startTime)
                                  .toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })
                                  .slice(0, 5)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {evt.type === "field_trip" && (
                              <span
                                className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{
                                  background: "var(--accent)",
                                  color: "#412d00",
                                }}
                              >
                                Field Trip
                              </span>
                            )}
                          </div>
                          <h3
                            className="font-[Manrope] font-bold text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {evt.title}
                          </h3>
                          {evt.location && (
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {evt.location}
                            </div>
                          )}
                          {evt.orgName && (
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {evt.orgName}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <span
                          className="material-symbols-rounded text-sm self-center"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          chevron_right
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading &&
        hasGoogleConnected &&
        sortedDates.length === 0 && (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No events in the next 30 days.
          </div>
        )}
    </div>
  );
}
