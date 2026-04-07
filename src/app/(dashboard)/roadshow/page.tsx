"use client";

import { useDefaultTrip } from "@/hooks/use-roadshow";
import { useTrip } from "@/hooks/use-roadshow";
import { StatCard } from "@/components/dashboard/stat-card";
import { DayAgenda } from "@/components/roadshow/day-agenda";
import { TripTimeline } from "@/components/roadshow/trip-timeline";

function TripHQ({ tripId }: { tripId: string }) {
  const { data, isLoading } = useTrip(tripId);

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl"
              style={{ background: "var(--bg-surface)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  const { trip, legs, meetings } = data;
  const today = new Date().toISOString().split("T")[0];
  const todayMeetings = meetings.filter((m) => m.meetingDate === today);
  const pendingActions = meetings.reduce((acc, m) => {
    if (m.actionItems && Array.isArray(m.actionItems)) {
      acc += (m.actionItems as any[]).filter((a: any) => !a.done).length;
    }
    return acc;
  }, 0);

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Find current leg
  const currentLeg = legs.find((l) => {
    return today >= l.startDate && today <= l.endDate;
  });

  return (
    <div className="space-y-6">
      {/* Header — mobile-friendly */}
      <div>
        <h1
          className="text-lg md:text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {trip.name}
        </h1>
        {currentLeg && (
          <div
            className="text-sm mt-1 flex items-center gap-1.5"
            style={{ color: "#ffba05" }}
          >
            <span className="material-symbols-rounded text-[16px]">
              location_on
            </span>
            {currentLeg.city} · {currentLeg.name}
          </div>
        )}
        {!currentLeg && (
          <div
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {trip.startDate} → {trip.endDate}
          </div>
        )}
      </div>

      {/* Stats — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Meetings"
          value={String(meetings.length)}
          icon="groups"
          subtext={`${legs.length} cities`}
        />
        <StatCard
          label="Today"
          value={String(todayMeetings.length)}
          icon="today"
          accent={todayMeetings.length > 0 ? "#ffba05" : undefined}
          subtext={todayMeetings.length > 0 ? "meetings today" : "no meetings"}
        />
        <StatCard
          label="Action Items"
          value={String(pendingActions)}
          icon="checklist"
          subtext="pending"
        />
        <StatCard
          label="Days Left"
          value={String(daysRemaining)}
          icon="hourglass_top"
          subtext={`ends ${trip.endDate}`}
        />
      </div>

      {/* Today's Agenda */}
      <DayAgenda
        meetings={todayMeetings}
        allMeetings={meetings}
        today={today}
      />

      {/* Mini Timeline */}
      <TripTimeline legs={legs} meetings={meetings} today={today} />
    </div>
  );
}

export default function RoadshowPage() {
  const { data: trip, isLoading } = useDefaultTrip();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="material-symbols-rounded animate-spin text-[24px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 gap-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="material-symbols-rounded text-[32px]">
          flight_takeoff
        </span>
        <p className="text-sm">No roadshow trip found. Run the seed script.</p>
      </div>
    );
  }

  return <TripHQ tripId={trip.id} />;
}
