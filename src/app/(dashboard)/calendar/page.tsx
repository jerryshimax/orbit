"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { useDefaultTrip, useTrip } from "@/hooks/use-roadshow";
import type { MeetingWithOrg } from "@/db/queries/roadshow";

const LEG_DISTRICTS: Record<string, string> = {
  "Hong Kong": "Victoria Harbour Circuit",
  "China — Shenzhen + Mainland": "Pudong Financial District",
  "Paris — France Site Visit": "8th Arrondissement",
  "Milken Conference": "Century City",
};

/**
 * CALENDAR — Unified calendar view.
 * Merges Google Calendar events with field trip meetings.
 * Falls back to leg-grouped roadshow view when no GCal is connected.
 */
export default function CalendarPage() {
  const today = new Date().toISOString().split("T")[0];

  // Date range: -7 days to +30 days
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
    isLoading: calLoading,
  } = useCalendarEvents(startDate, endDate);

  // Also fetch roadshow data for the leg-grouped fallback view
  const { data: defaultTrip } = useDefaultTrip();
  const { data: tripData } = useTrip(defaultTrip?.id ?? null);

  // Group calendar events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<
      string,
      Array<(typeof calendarEvents)[number]>
    > = {};
    for (const evt of calendarEvents) {
      const d = evt.startTime.split("T")[0];
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(evt);
    }
    return grouped;
  }, [calendarEvents]);

  // Leg-grouped view for field trip meetings (fallback when no GCal)
  const legSchedule = useMemo(() => {
    if (!tripData) return [];
    return (tripData.legs ?? []).map((leg) => {
      const legMeetings = (tripData.meetings ?? [])
        .filter((m) => m.legId === leg.id)
        .sort((a, b) => {
          const dateComp = (a.meetingDate ?? "").localeCompare(
            b.meetingDate ?? ""
          );
          if (dateComp !== 0) return dateComp;
          return (a.meetingTime ?? "").localeCompare(b.meetingTime ?? "");
        });
      const byDate: Record<string, MeetingWithOrg[]> = {};
      for (const m of legMeetings) {
        const d = m.meetingDate ?? "TBD";
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(m);
      }
      return { leg, meetings: legMeetings, byDate };
    });
  }, [tripData]);

  // Sorted date keys for the unified view
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
          {hasGoogleConnected
            ? "Google Calendar + Field Trip Meetings"
            : tripData?.trip?.name ?? "No active trip"}
        </p>
      </div>

      {/* Connect Google Banner */}
      {!hasGoogleConnected && !calLoading && (
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

      {/* Unified Calendar View (when GCal connected and has events) */}
      {hasGoogleConnected && sortedDates.length > 0 && (
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
                    <div
                      key={evt.id}
                      className={`flex gap-4 p-4 rounded-lg ${isPast ? "opacity-40" : ""}`}
                      style={{
                        background:
                          evt.type === "field_trip"
                            ? isToday
                              ? "#262a31"
                              : "#181c22"
                            : "#181c22",
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
                          {evt.type === "gcal" && (
                            <span
                              className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: "#3b82f6",
                                color: "#fff",
                              }}
                            >
                              GCal
                            </span>
                          )}
                        </div>
                        <h3
                          className="font-[Manrope] font-bold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {evt.type === "field_trip" ? (
                            <Link href={`/meetings/${evt.id}`}>
                              {evt.title}
                            </Link>
                          ) : (
                            evt.title
                          )}
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
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leg-Grouped Roadshow View (fallback when no GCal or no merged events) */}
      {(!hasGoogleConnected || sortedDates.length === 0) &&
        legSchedule.map(({ leg, byDate }) => (
          <div key={leg.id}>
            {/* Sticky Leg Header */}
            <div
              className="sticky top-14 lg:top-0 z-30 py-4 -mx-4 px-4"
              style={{
                background: "rgba(16, 20, 26, 0.95)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-rounded text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      location_on
                    </span>
                    <span
                      className="font-[Space_Grotesk] text-[11px] uppercase tracking-[0.2em]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {leg.city ?? leg.name}
                    </span>
                  </div>
                  <h2
                    className="font-[Manrope] text-xl font-bold mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {LEG_DISTRICTS[leg.name] ?? leg.name}
                  </h2>
                </div>
                <div className="text-right">
                  <div
                    className="font-[JetBrains_Mono] text-sm font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {leg.startDate?.slice(5)} — {leg.endDate?.slice(5)}
                  </div>
                  <div
                    className="text-[10px] font-[Space_Grotesk]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {leg.timezone?.split("/")[1] ?? ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Meetings by date */}
            {Object.entries(byDate).map(([date, meetings]) => {
              const d = new Date(date + "T00:00:00");
              const dayLabel = d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const isToday = date === today;

              return (
                <div key={date} className="mb-6">
                  <div
                    className="text-xs font-[JetBrains_Mono] px-1 py-2"
                    style={{
                      color: isToday
                        ? "var(--accent)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {isToday ? "TODAY" : dayLabel.toUpperCase()}
                  </div>

                  <div className="space-y-2">
                    {meetings.map((m) => {
                      const isPast = date < today;
                      const isCurrent = date === today;

                      return (
                        <Link
                          key={m.id}
                          href={`/meetings/${m.id}`}
                          className="block active:scale-[0.98] transition-transform"
                        >
                          <div
                            className={`flex gap-4 p-4 rounded-lg ${isPast ? "opacity-40" : ""}`}
                            style={{
                              background: isCurrent ? "#262a31" : "#181c22",
                              borderLeft: isCurrent
                                ? "2px solid var(--accent)"
                                : undefined,
                            }}
                          >
                            <div className="w-14 shrink-0">
                              <span
                                className="font-[JetBrains_Mono] text-sm"
                                style={{
                                  color: isCurrent
                                    ? "var(--accent)"
                                    : "var(--text-tertiary)",
                                }}
                              >
                                {m.meetingTime?.slice(0, 5) ?? "TBD"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {isPast && (
                                  <span
                                    className="material-symbols-rounded text-sm"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    check_circle
                                  </span>
                                )}
                                {isCurrent && (
                                  <span
                                    className="material-symbols-rounded text-sm"
                                    style={{
                                      color: "var(--accent)",
                                      fontVariationSettings: "'FILL' 1",
                                    }}
                                  >
                                    sensors
                                  </span>
                                )}
                                <span
                                  className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  {(m.meetingType ?? "meeting").replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </div>
                              <h3
                                className="font-[Manrope] font-bold text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {m.title}
                              </h3>
                              {m.location && (
                                <div
                                  className="text-xs mt-0.5"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  {m.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {!hasGoogleConnected &&
        legSchedule.length === 0 &&
        !calLoading && (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No active trip. Connect Google Calendar or create a trip to see
            events here.
          </div>
        )}
    </div>
  );
}
