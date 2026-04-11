"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "#3b82f6" },
  { value: "confirmed", label: "Confirmed", color: "#22c55e" },
  { value: "completed", label: "Completed", color: "#6b7280" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
];

type Attendee = { email: string; name?: string; responseStatus?: string };

export default function CalendarEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/calendar/${id}`, fetcher);
  const [saving, setSaving] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Editable fields — local state seeded from server
  const [objective, setObjective] = useState<string | null>(null);
  const [valueProp, setValueProp] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);

  const event = data?.event;
  const meetingNotes = data?.notes;
  const fieldTrip = data?.fieldTrip;
  const org = data?.org;
  const attendeeMap: Record<string, string> = data?.attendeeMap ?? {};

  // Seed local state from server on first load
  const seeded =
    objective !== null ||
    valueProp !== null ||
    notes !== null ||
    context !== null;
  if (!seeded && event) {
    if (meetingNotes) {
      setObjective(meetingNotes.strategicObjective ?? "");
      setValueProp(meetingNotes.valueProposition ?? "");
      setNotes(meetingNotes.notes ?? "");
      setContext(meetingNotes.context ?? "");
    } else {
      // Seed from field trip data if available
      setObjective(fieldTrip?.strategicAsk ?? "");
      setValueProp(fieldTrip?.pitchAngle ?? "");
      setNotes(fieldTrip?.prepNotes ?? event.description ?? "");
      setContext("");
    }
  }

  const currentStatus =
    meetingNotes?.status ?? fieldTrip?.status ?? event?.status ?? "planned";

  const save = useCallback(
    async (fields: Record<string, string | null>) => {
      setSaving(true);
      await fetch(`/api/calendar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      setSaving(false);
      mutate();
    },
    [id, mutate]
  );

  if (!event) {
    return (
      <div
        className="max-w-3xl mx-auto px-4 pt-8"
        style={{ color: "var(--text-tertiary)" }}
      >
        Loading...
      </div>
    );
  }

  const attendees: Attendee[] = Array.isArray(event.attendees)
    ? event.attendees
    : [];

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = `${startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} — ${endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

  const statusInfo =
    STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0];

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 lg:pb-8 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Calendar
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1
            className="font-[Manrope] text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {event.title}
          </h1>

          {/* Status dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] uppercase tracking-wider border transition-colors"
              style={{
                borderColor: statusInfo.color,
                color: statusInfo.color,
                background: `${statusInfo.color}15`,
              }}
            >
              {statusInfo.label}
              <span className="material-symbols-rounded text-sm">
                expand_more
              </span>
            </button>
            {statusOpen && (
              <div
                className="absolute right-0 mt-1 w-36 rounded-lg border shadow-xl z-50 py-1"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusOpen(false);
                      save({ status: opt.value });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-[Space_Grotesk] uppercase tracking-wider hover:brightness-150 transition-colors"
                    style={{ color: opt.color }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date + Time + Location */}
        <div className="mt-2 space-y-1">
          <div
            className="font-[JetBrains_Mono] text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {dateStr}
          </div>
          <div
            className="font-[JetBrains_Mono] text-sm"
            style={{ color: "var(--accent)" }}
          >
            {timeStr}
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              <span className="material-symbols-rounded text-sm">location_on</span>
              {event.location}
            </div>
          )}
        </div>

        {/* Field Trip badge */}
        {fieldTrip && (
          <span
            className="inline-block mt-2 font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-2 py-1 rounded"
            style={{ background: "var(--accent)", color: "#412d00" }}
          >
            Field Trip
          </span>
        )}
      </div>

      {/* Attendees */}
      {attendees.length > 0 && (
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--bg-surface)" }}
        >
          <h3
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Attendees ({attendees.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a, i) => {
              const name = a.name || a.email.split("@")[0];
              const initials = name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const accepted = a.responseStatus === "accepted";
              const personId = attendeeMap[name];

              const chip = (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs ${personId ? "hover:brightness-125 cursor-pointer" : ""}`}
                  style={{
                    background: "#262a31",
                    color: accepted
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{
                      background: accepted ? "var(--accent)" : "#4e4639",
                      color: accepted ? "#412d00" : "var(--text-tertiary)",
                    }}
                  >
                    {initials}
                  </div>
                  <span className="truncate max-w-[120px]">{name}</span>
                  {personId && (
                    <span className="material-symbols-rounded text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      open_in_new
                    </span>
                  )}
                </div>
              );

              return personId ? (
                <Link key={i} href={`/contacts/${personId}`}>
                  {chip}
                </Link>
              ) : (
                <div key={i}>{chip}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group Overview */}
      {org && (
        <section
          className="p-4 rounded-lg"
          style={{ background: "var(--bg-surface)" }}
        >
          <h3
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Group Overview
          </h3>
          <div
            className="font-[Manrope] font-bold text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            {org.name}
          </div>
          {org.type && (
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {org.type.replace("_", " ")}
            </div>
          )}
          {org.notes && (
            <p
              className="text-xs mt-2 leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              {org.notes}
            </p>
          )}
        </section>
      )}

      {/* Strategic Objective */}
      <section
        className="p-4 rounded-lg"
        style={{ background: "var(--bg-surface)" }}
      >
        <h3
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Strategic Objective
        </h3>
        <textarea
          value={objective ?? ""}
          onChange={(e) => setObjective(e.target.value)}
          onBlur={() => save({ strategicObjective: objective })}
          placeholder="What are you trying to achieve in this meeting?"
          rows={3}
          className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder-[#9a8f80]/50"
          style={{ color: "var(--text-primary)" }}
        />
        {saving && (
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Saving...
          </span>
        )}
      </section>

      {/* Value Proposition */}
      <section
        className="p-4 rounded-lg"
        style={{ background: "var(--bg-surface)" }}
      >
        <h3
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Value Proposition
        </h3>
        <textarea
          value={valueProp ?? ""}
          onChange={(e) => setValueProp(e.target.value)}
          onBlur={() => save({ valueProposition: valueProp })}
          placeholder="Your tailored script for approaching this meeting..."
          rows={3}
          className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder-[#9a8f80]/50"
          style={{ color: "var(--text-primary)" }}
        />
      </section>

      {/* Notes */}
      <section
        className="p-4 rounded-lg"
        style={{ background: "var(--bg-surface)" }}
      >
        <h3
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Notes
        </h3>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save({ notes })}
          placeholder="Meeting notes..."
          rows={5}
          className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder-[#9a8f80]/50"
          style={{ color: "var(--text-primary)" }}
        />
      </section>

      {/* Context / Memory */}
      <section
        className="p-4 rounded-lg"
        style={{ background: "var(--bg-surface)" }}
      >
        <h3
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Context / Memory
        </h3>
        <textarea
          value={context ?? ""}
          onChange={(e) => setContext(e.target.value)}
          onBlur={() => save({ context })}
          placeholder="Quick notes from conversations, things to remember, relationship signals..."
          rows={3}
          className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder-[#9a8f80]/50"
          style={{ color: "var(--text-primary)" }}
        />
      </section>
    </div>
  );
}
