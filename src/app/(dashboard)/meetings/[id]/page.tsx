"use client";

import { use } from "react";
import { useMeeting } from "@/hooks/use-roadshow";
import { useState, useCallback } from "react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  planned: "#3b82f6",
  tentative: "#f59e0b",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

/**
 * Meeting detail — rich prep card.
 * Reuses the roadshow meeting detail logic at the new /meetings/[id] route.
 */
export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: meetingId } = use(params);
  const { data: meeting, isLoading, mutate } = useMeeting(meetingId);
  const [saving, setSaving] = useState(false);

  const toggleAction = useCallback(
    async (index: number) => {
      if (!meeting?.actionItems) return;
      const items = [...(meeting.actionItems as any[])];
      items[index] = { ...items[index], done: !items[index].done };
      mutate({ ...meeting, actionItems: items }, false);
      setSaving(true);
      await fetch(`/api/roadshow/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItems: items }),
      });
      setSaving(false);
      mutate();
    },
    [meeting, meetingId, mutate]
  );

  if (isLoading || !meeting) {
    return (
      <div className="animate-pulse space-y-4 px-4 pt-20 max-w-5xl mx-auto">
        <div className="h-32 rounded-lg bg-[#181c22]" />
        <div className="h-48 rounded-lg bg-[#181c22]" />
      </div>
    );
  }

  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];
  const actionItems = Array.isArray(meeting.actionItems) ? (meeting.actionItems as any[]) : [];
  const completedCount = actionItems.filter((a: any) => a.done).length;
  const statusColor = STATUS_COLORS[meeting.status] ?? "#6b7280";

  return (
    <main className="px-4 md:px-8 pt-20 pb-32 lg:pt-8 lg:pb-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <a href="/meetings" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Meetings
      </a>

      {/* Header */}
      <section className="p-6 rounded-lg" style={{ background: "#181c22" }}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-[Manrope] text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {meeting.title}
              </h1>
              {meeting.language && (
                <span className="px-2 py-0.5 text-[10px] font-[Space_Grotesk] font-bold rounded" style={{ background: "var(--accent)", color: "#412d00" }}>
                  {meeting.language.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {meeting.meetingTime && (
                <span className="flex items-center gap-1 font-[JetBrains_Mono]">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {meeting.meetingTime.slice(0, 5)} · {meeting.meetingDate}
                </span>
              )}
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {meeting.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                <span className="uppercase font-[Space_Grotesk] tracking-wider">{meeting.status}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Brief */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meeting.strategicAsk && (
          <div className="p-5 rounded-lg" style={{ background: "#181c22", borderLeft: "3px solid var(--accent)" }}>
            <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: "var(--accent)" }}>
              Strategic Ask
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {meeting.strategicAsk}
            </p>
          </div>
        )}
        {meeting.pitchAngle && (
          <div className="p-5 rounded-lg" style={{ background: "#181c22", borderLeft: "3px solid #4e4639" }}>
            <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: "var(--text-tertiary)" }}>
              Pitch Angle
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {meeting.pitchAngle}
            </p>
          </div>
        )}
      </div>

      {/* CRM Dossier */}
      {meeting.orgName && (
        <div className="p-5 rounded-lg" style={{ background: "#181c22", border: "1px solid #262a31" }}>
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: "var(--text-tertiary)" }}>
            CRM Dossier
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Organization</div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{meeting.orgName}</div>
            </div>
            {meeting.oppStage && (
              <div>
                <div className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Stage</div>
                <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>{meeting.oppStage}</div>
              </div>
            )}
            {meeting.oppDealSize && (
              <div>
                <div className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Deal Size</div>
                <div className="text-sm font-[JetBrains_Mono] font-medium" style={{ color: "var(--text-primary)" }}>${parseFloat(meeting.oppDealSize).toLocaleString()}</div>
              </div>
            )}
            {meeting.orgRelationshipOwner && (
              <div>
                <div className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Owner</div>
                <div className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>{meeting.orgRelationshipOwner}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold px-1" style={{ color: "var(--text-tertiary)" }}>
            Attendees ({attendees.length})
          </h3>
          <div className="space-y-2">
            {attendees.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "#181c22" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: a.role === "ce_team" || a.role === "host" ? "var(--accent)" : "#262a31", color: a.role === "ce_team" || a.role === "host" ? "#412d00" : "var(--text-secondary)" }}>
                  {a.name?.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</div>
                  <div className="text-[10px] font-[Space_Grotesk]" style={{ color: "var(--text-tertiary)" }}>
                    {a.title ?? a.role} {a.org ? `· ${a.org}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Intro Chain */}
      {meeting.introChain && (
        <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>Intro Chain</h3>
          <p className="text-sm" style={{ color: "var(--accent)" }}>{meeting.introChain}</p>
        </div>
      )}

      {/* Prep Notes */}
      {meeting.prepNotes && (
        <div className="p-5 rounded-lg" style={{ background: "#181c22" }}>
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: "var(--text-tertiary)" }}>Prep Notes</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{meeting.prepNotes}</p>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: "var(--text-tertiary)" }}>
              Action Items
            </h3>
            <span className="text-[10px] font-[JetBrains_Mono]" style={{ color: "var(--text-tertiary)" }}>
              {completedCount}/{actionItems.length}
            </span>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: "#181c22" }}>
            {actionItems.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => toggleAction(i)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#262a31]"
                style={{ borderBottom: i < actionItems.length - 1 ? "1px solid #262a31" : undefined }}
              >
                <div
                  className="w-5 h-5 rounded border mt-0.5 shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: item.done ? "var(--accent)" : "var(--border-subtle)",
                    background: item.done ? "var(--accent)" : "transparent",
                  }}
                >
                  {item.done && <span className="material-symbols-outlined text-sm" style={{ color: "#412d00" }}>check</span>}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${item.done ? "line-through opacity-50" : ""}`} style={{ color: "var(--text-primary)" }}>
                    {item.task}
                  </span>
                  <div className="text-[10px] font-[Space_Grotesk] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {item.owner} {item.due ? `· Due ${item.due}` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
