"use client";

import type { MeetingWithOrg } from "@/db/queries/roadshow";
import type { roadshowLegs } from "@/db/schema/roadshow";

type Leg = typeof roadshowLegs.$inferSelect;

const LEG_ICONS: Record<string, string> = {
  "Hong Kong": "🇭🇰",
  China: "🇨🇳",
  Shenzhen: "🇨🇳",
  Paris: "🇫🇷",
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

function formatDay(dateStr: string): { weekday: string; day: string } {
  const d = new Date(dateStr + "T00:00:00");
  return {
    weekday: d.toLocaleDateString("en", { weekday: "short" }),
    day: String(d.getDate()),
  };
}

export function TripTimeline({
  legs,
  meetings,
  today,
}: {
  legs: Leg[];
  meetings: MeetingWithOrg[];
  today: string;
}) {
  // Group meetings by date
  const meetingsByDate: Record<string, MeetingWithOrg[]> = {};
  for (const m of meetings) {
    if (m.meetingDate) {
      if (!meetingsByDate[m.meetingDate]) meetingsByDate[m.meetingDate] = [];
      meetingsByDate[m.meetingDate].push(m);
    }
  }

  return (
    <section>
      <h2
        className="text-sm font-semibold mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        Trip Overview
      </h2>

      {/* Horizontal scroll strip on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 min-w-max">
          {legs.map((leg) => {
            const days = getDaysInRange(leg.startDate, leg.endDate);
            const flag =
              LEG_ICONS[leg.city ?? ""] ??
              LEG_ICONS[leg.country ?? ""] ??
              "📍";

            return (
              <div key={leg.id} className="flex flex-col">
                {/* Leg header */}
                <div
                  className="text-[10px] font-medium mb-1 px-1 truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {flag} {leg.name}
                </div>

                {/* Days */}
                <div className="flex gap-1">
                  {days.map((day) => {
                    const dayMeetings = meetingsByDate[day] ?? [];
                    const isToday = day === today;
                    const isPast = day < today;
                    const { weekday, day: dayNum } = formatDay(day);

                    return (
                      <div
                        key={day}
                        className="flex flex-col items-center rounded-lg px-2 py-2 min-w-[44px]"
                        style={{
                          background: isToday
                            ? "rgba(255, 186, 5, 0.15)"
                            : "var(--bg-surface)",
                          border: isToday
                            ? "1.5px solid #ffba05"
                            : "1px solid var(--border-subtle)",
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >
                        <span
                          className="text-[10px]"
                          style={{
                            color: isToday
                              ? "#ffba05"
                              : "var(--text-tertiary)",
                          }}
                        >
                          {weekday}
                        </span>
                        <span
                          className="text-sm font-mono font-semibold tabular-nums"
                          style={{
                            color: isToday
                              ? "#ffba05"
                              : "var(--text-primary)",
                          }}
                        >
                          {dayNum}
                        </span>
                        {/* Meeting count dots */}
                        {dayMeetings.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {dayMeetings.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: isToday
                                    ? "#ffba05"
                                    : "var(--accent)",
                                }}
                              />
                            ))}
                            {dayMeetings.length > 3 && (
                              <span
                                className="text-[8px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                +{dayMeetings.length - 3}
                              </span>
                            )}
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
      </div>
    </section>
  );
}
