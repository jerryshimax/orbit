"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCalendarEvents } from "@/hooks/use-calendar";
import type { CalendarEvent } from "@/db/queries/calendar";

type EventCategory = {
  label: string;
  color: string;
  bg: string;
  borderColor: string;
};

const CATEGORIES: Record<string, EventCategory> = {
  lp:         { label: "LP",         color: "#412d00", bg: "#e9c176", borderColor: "#e9c176" },
  deal:       { label: "Deal",       color: "#fff",    bg: "#8b5cf6", borderColor: "#8b5cf6" },
  conference: { label: "Conference", color: "#fff",    bg: "#3b82f6", borderColor: "#3b82f6" },
  dinner:     { label: "Dinner",     color: "#412d00", bg: "#f59e0b", borderColor: "#f59e0b" },
  lunch:      { label: "Lunch",      color: "#412d00", bg: "#f59e0b", borderColor: "#f59e0b" },
  flight:     { label: "Flight",     color: "#fff",    bg: "#6366f1", borderColor: "#6366f1" },
  train:      { label: "Train",      color: "#fff",    bg: "#6366f1", borderColor: "#6366f1" },
  transit:    { label: "Transit",    color: "#fff",    bg: "#6366f1", borderColor: "#6366f1" },
  hotel:      { label: "Hotel",      color: "#fff",    bg: "#a855f7", borderColor: "#a855f7" },
  site_visit: { label: "Site Visit", color: "#fff",    bg: "#06b6d4", borderColor: "#06b6d4" },
  internal:   { label: "Internal",   color: "#dfe2eb", bg: "#4e4639", borderColor: "#6b7280" },
  personal:   { label: "",           color: "",        bg: "",        borderColor: "#31353c" },
};

function categorizeEvent(evt: CalendarEvent): EventCategory {
  const title = (evt.title ?? "").toLowerCase();
  const meetingType = (evt.meetingType ?? "").toLowerCase();

  // Check meetingType first (field trip metadata)
  if (meetingType === "conference" || meetingType === "roundtable")
    return CATEGORIES.conference;
  if (meetingType === "site_visit") return CATEGORIES.site_visit;
  if (meetingType === "dinner") return CATEGORIES.dinner;

  // Title keywords
  if (title.includes("flight") || title.includes("✈") || title.match(/\b[a-z]{2}\d{3,4}\b/i) || title.includes("航班") || title.includes("飞") || title.includes("airport"))
    return CATEGORIES.flight;
  if (title.includes("train") || title.includes("rail") || title.includes("高铁") || title.includes("火车") || title.includes("地铁"))
    return CATEGORIES.train;
  if (title.includes("drive") || title.includes("car") || title.includes("taxi") || title.includes("uber") || title.includes("transfer") || title.includes("pickup") || title.includes("pick up") || title.includes("drop off") || title.includes("接送") || title.includes("打车"))
    return CATEGORIES.transit;
  if (title.includes("hotel") || title.includes("check-in") || title.includes("check in") || title.includes("checkout") || title.includes("check out") || title.includes("酒店") || title.includes("入住") || title.includes("accommodation"))
    return CATEGORIES.hotel;
  if (title.includes("dinner") || title.includes("晚宴") || title.includes("晚餐"))
    return CATEGORIES.dinner;
  if (title.includes("lunch") || title.includes("午餐"))
    return CATEGORIES.lunch;
  if (title.includes("roundtable") || title.includes("conference") || title.includes("summit") || title.includes("forum"))
    return CATEGORIES.conference;
  if (title.includes("site visit") || title.includes("参观") || title.includes("考察"))
    return CATEGORIES.site_visit;

  // LP-related (org context)
  if (evt.orgName && evt.type === "field_trip")
    return CATEGORIES.lp;

  // Deal-related (has strategic context)
  if (evt.strategicAsk || evt.pitchAngle)
    return CATEGORIES.deal;

  // GCal events without field trip match
  if (evt.type === "gcal") {
    // Internal if no external attendees or few attendees
    const attendees = Array.isArray(evt.attendees) ? evt.attendees : [];
    if (attendees.length <= 1) return CATEGORIES.personal;
    return CATEGORIES.internal;
  }

  return CATEGORIES.lp;
}

type MeetingFormat = "virtual" | "field" | "unknown";

function detectMeetingFormat(evt: CalendarEvent): MeetingFormat {
  const loc = (evt.location ?? "").trim();

  // Has a URL → virtual
  if (loc.match(/^https?:\/\//i)) return "virtual";
  if (loc.toLowerCase().includes("zoom.us") || loc.toLowerCase().includes("meet.google") || loc.toLowerCase().includes("teams.microsoft") || loc.toLowerCase().includes("webex")) return "virtual";

  // Has a physical location → field
  if (loc.length > 0 && loc !== "TBD") return "field";

  // No location, no link → unknown
  return "unknown";
}

const FORMAT_STYLES: Record<MeetingFormat, { icon: string; label: string; color: string; border: string }> = {
  virtual: { icon: "videocam",    label: "Virtual", color: "#3b82f6", border: "#3b82f640" },
  field:   { icon: "location_on", label: "Field",   color: "#22c55e", border: "#22c55e40" },
  unknown: { icon: "help_outline", label: "",        color: "#6b7280", border: "#6b728040" },
};

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
        <p className="text-sm mt-1 font-[JetBrains_Mono]" style={{ color: "var(--text-tertiary)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
                      {(() => {
                        const cat = categorizeEvent(evt);
                        const fmt = detectMeetingFormat(evt);
                        const fmtStyle = FORMAT_STYLES[fmt];
                        return (
                      <div
                        className={`flex gap-4 p-4 rounded-lg ${isPast ? "opacity-40" : ""}`}
                        style={{
                          background: isToday ? "#262a31" : "#181c22",
                          borderLeft: `2px solid ${cat.borderColor}`,
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
                            {cat.label && (
                              <span
                                className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{
                                  background: cat.bg,
                                  color: cat.color,
                                }}
                              >
                                {cat.label}
                              </span>
                            )}
                            {fmtStyle.label && (
                              <span
                                className="flex items-center gap-0.5 font-[Space_Grotesk] text-[8px] uppercase tracking-wider px-1 py-px rounded"
                                style={{
                                  background: "#1c2026",
                                  color: fmtStyle.color,
                                  border: `1px solid ${fmtStyle.border}`,
                                }}
                              >
                                <span className="material-symbols-rounded text-[9px]">
                                  {fmtStyle.icon}
                                </span>
                                {fmtStyle.label}
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
                        );
                      })()}
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
