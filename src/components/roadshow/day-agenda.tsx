"use client";

import Link from "next/link";
import type { MeetingWithOrg } from "@/db/queries/roadshow";

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

function MeetingCard({
  meeting,
  isNext,
}: {
  meeting: MeetingWithOrg;
  isNext: boolean;
}) {
  const statusColor = STATUS_COLORS[meeting.status] ?? "#6b7280";
  const icon = TYPE_ICONS[meeting.meetingType ?? ""] ?? "event";
  const attendeeCount = Array.isArray(meeting.attendees)
    ? meeting.attendees.length
    : 0;

  return (
    <Link href={`/roadshow/meetings/${meeting.id}`}>
      <div
        className="rounded-xl p-4 transition-all active:scale-[0.98]"
        style={{
          background: "var(--bg-surface)",
          border: isNext
            ? "2px solid #ffba05"
            : "1px solid var(--border-subtle)",
          boxShadow: isNext ? "0 0 12px rgba(255,186,5,0.15)" : undefined,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Time + Icon */}
          <div className="flex flex-col items-center min-w-[48px]">
            <span
              className="font-mono text-sm font-medium tabular-nums"
              style={{
                color: isNext ? "#ffba05" : "var(--text-primary)",
              }}
            >
              {meeting.meetingTime?.slice(0, 5) ?? "TBD"}
            </span>
            <span
              className="material-symbols-rounded text-[18px] mt-1"
              style={{ color: statusColor }}
            >
              {icon}
            </span>
          </div>

          {/* Content */}
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

            {meeting.strategicAsk && (
              <div
                className="text-xs mt-2 line-clamp-2"
                style={{ color: "#ffba05", opacity: 0.8 }}
              >
                {meeting.strategicAsk}
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center gap-3 mt-2">
              {meeting.orgName && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--accent-surface)",
                    color: "var(--accent)",
                  }}
                >
                  {meeting.orgName}
                </span>
              )}
              {attendeeCount > 0 && (
                <span
                  className="text-xs flex items-center gap-1"
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
            </div>
          </div>

          {/* Chevron */}
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

export function DayAgenda({
  meetings,
  allMeetings,
  today,
}: {
  meetings: MeetingWithOrg[];
  allMeetings: MeetingWithOrg[];
  today: string;
}) {
  // Find next upcoming meeting (today, not completed)
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nextMeeting = meetings.find(
    (m) =>
      m.status !== "completed" &&
      m.status !== "cancelled" &&
      (m.meetingTime ?? "99:99") >= currentTime
  );

  // If no meetings today, show next upcoming meeting from any day
  const upcomingMeetings =
    meetings.length > 0
      ? meetings
      : allMeetings
          .filter(
            (m) =>
              (m.meetingDate ?? "") >= today &&
              m.status !== "cancelled"
          )
          .slice(0, 3);

  const showingUpcoming = meetings.length === 0 && upcomingMeetings.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {showingUpcoming ? "Upcoming" : "Today's Agenda"}
        </h2>
        {meetings.length > 0 && (
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {meetings.filter((m) => m.status === "completed").length}/
            {meetings.length} done
          </span>
        )}
      </div>

      {upcomingMeetings.length === 0 ? (
        <div
          className="text-center py-8 rounded-xl text-sm"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          No meetings scheduled
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingMeetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              isNext={m.id === nextMeeting?.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
