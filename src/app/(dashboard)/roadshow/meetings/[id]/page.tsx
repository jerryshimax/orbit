"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useMeeting } from "@/hooks/use-roadshow";
import { useState, useCallback } from "react";
import { ContactDossier } from "@/components/roadshow/contact-dossier";
import { InlineEditableField } from "@/components/shared/inline-editable-field";
import { useRegisterPageFields } from "@/lib/chat/page-bridge";
import {
  strengthToColor,
  strengthToLabel,
} from "@/lib/relationship-strength";

const STAGE_LABELS: Record<string, string> = {
  prospect: "PROSPECT",
  intro: "INTRODUCTION",
  meeting: "MEETING_PHASE",
  dd: "DUE_DILIGENCE",
  soft_circle: "SOFT_CIRCLE",
  committed: "COMMITTED",
  closed: "CLOSED",
  passed: "PASSED",
};

type MeetingAttendee = {
  name?: string;
  title?: string | null;
  org?: string | null;
  personId?: string | null;
  relationshipStrength?: string | null;
  isTeam?: boolean;
};

function MeetingDetail({ meetingId }: { meetingId: string }) {
  const { data: meeting, isLoading, mutate } = useMeeting(meetingId);
  const [saving, setSaving] = useState(false);
  const [dossierAttendee, setDossierAttendee] =
    useState<MeetingAttendee | null>(null);

  const saveMeetingField = useCallback(
    async (field: "strategicAsk" | "pitchAngle" | "prepNotes", value: string) => {
      if (!meeting) return;
      mutate({ ...meeting, [field]: value }, false);
      setSaving(true);
      await fetch(`/api/roadshow/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaving(false);
      mutate();
    },
    [meeting, meetingId, mutate]
  );

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

  // PageBridge: expose editable prep fields to Cloud.
  const strategicAsk = meeting?.strategicAsk ?? "";
  const pitchAngle = meeting?.pitchAngle ?? "";
  const prepNotes = meeting?.prepNotes ?? "";

  const bridgeFields = useMemo(
    () => [
      {
        name: "strategicAsk",
        label: "Strategic Ask",
        type: "textarea" as const,
        value: strategicAsk,
      },
      {
        name: "pitchAngle",
        label: "Pitch Angle",
        type: "textarea" as const,
        value: pitchAngle,
      },
      {
        name: "prepNotes",
        label: "Prep Notes",
        type: "textarea" as const,
        value: prepNotes,
      },
    ],
    [strategicAsk, pitchAngle, prepNotes]
  );

  const applyBridgeField = useCallback(
    (field: string, value: string) => {
      if (
        field === "strategicAsk" ||
        field === "pitchAngle" ||
        field === "prepNotes"
      ) {
        void saveMeetingField(field, value);
      }
    },
    [saveMeetingField]
  );

  useRegisterPageFields({
    route: `/roadshow/meetings/${meetingId}`,
    title: meeting?.title
      ? `Meeting Prep — ${meeting.title}`
      : "Meeting Prep",
    summary: meeting?.title
      ? `Preparing for ${meeting.title}`
      : undefined,
    fields: bridgeFields,
    setter: applyBridgeField,
    enabled: !!meeting,
  });

  if (isLoading || !meeting) {
    return (
      <div className="animate-pulse space-y-4 px-4 max-w-5xl mx-auto">
        <div className="h-32 rounded-sm bg-[#181c22]" />
        <div className="h-48 rounded-sm bg-[#181c22]" />
      </div>
    );
  }

  const attendees: MeetingAttendee[] = Array.isArray(meeting.attendees)
    ? (meeting.attendees as MeetingAttendee[])
    : [];
  const orgInteractions: Array<{
    id: string;
    interactionType: string;
    summary: string;
    interactionDate: string | null;
    source?: string | null;
  }> = Array.isArray(meeting.orgInteractions)
    ? (meeting.orgInteractions as Array<{
        id: string;
        interactionType: string;
        summary: string;
        interactionDate: string | null;
        source?: string | null;
      }>)
    : [];
  const actionItems = Array.isArray(meeting.actionItems)
    ? (meeting.actionItems as any[])
    : [];
  const completedCount = actionItems.filter((a: any) => a.done).length;

  const dateStr = meeting.meetingDate
    ? new Date(meeting.meetingDate + "T00:00:00").toLocaleDateString("en", {
        hour: undefined,
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  const timeStr = meeting.meetingTime
    ? `${meeting.meetingTime.slice(0, 5)} ${meeting.timezone ?? ""}`
    : "";

  return (
    <>
    <main className="px-4 md:px-8 max-w-5xl mx-auto space-y-6">
      {/* Meeting Header */}
      <section className="bg-[#181c22] p-6 rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-[Manrope] text-2xl font-bold text-[#dfe2eb] tracking-tight">
                {meeting.title}
              </h1>
              {meeting.language && (
                <span className="px-2 py-0.5 bg-[#e9c176] text-[#412d00] font-[Space_Grotesk] text-[10px] font-bold rounded-sm">
                  {meeting.language.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-[#d1c5b4] font-[Space_Grotesk] text-xs uppercase tracking-widest">
              {timeStr && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    schedule
                  </span>
                  <span>
                    {timeStr} · {dateStr}
                  </span>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    location_on
                  </span>
                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(meeting.location)}`}
                    className="hover:text-[#e9c176] transition-colors"
                  >
                    {meeting.location}
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/roadshow/timeline"
              className="px-4 py-2 border border-[#4e4639]/30 text-[#e9c176] font-[Space_Grotesk] text-xs font-bold rounded-sm hover:bg-[#1c2026] transition-colors active:scale-95"
            >
              BACK
            </Link>
          </div>
        </div>
      </section>

      {/* Strategic Ask + Pitch Angle (Asymmetric Layout) — inline editable */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-[#1c2026] p-6 rounded-sm space-y-4">
          <div className="flex items-center gap-2 border-l-2 border-[#e9c176] pl-3">
            <span className="font-[Manrope] text-xs font-bold text-[#e9c176] tracking-widest uppercase">
              Strategic Ask
            </span>
          </div>
          <InlineEditableField
            type="textarea"
            value={strategicAsk}
            onSave={(v) => saveMeetingField("strategicAsk", v)}
            placeholder="Click to add the strategic ask…"
            rows={3}
          />
        </div>
        <div className="md:col-span-2 bg-[#1c2026] p-6 rounded-sm space-y-4 border-l border-[#4e4639]/10">
          <div className="flex items-center gap-2 border-l-2 border-[#4e4639] pl-3">
            <span className="font-[Manrope] text-xs font-bold text-[#d1c5b4] tracking-widest uppercase">
              Pitch Angle
            </span>
          </div>
          <InlineEditableField
            type="textarea"
            value={pitchAngle}
            onSave={(v) => saveMeetingField("pitchAngle", v)}
            placeholder="Click to add the pitch angle…"
            rows={3}
          />
        </div>
      </div>

      {/* CRM Data Table */}
      {(meeting.orgName || meeting.orgStage) && (
        <section className="bg-[#181c22] rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#4e4639]/5 flex justify-between items-center">
            <h2 className="font-[Manrope] text-sm font-bold text-[#dfe2eb] uppercase tracking-wider">
              Entity Financials & Pipeline
            </h2>
            <span className="font-[Space_Grotesk] text-[11px] text-[#d1c5b4]">
              SOURCE: ORBIT_CRM
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#31353c]/30">
                  <th className="px-6 py-3 font-[Space_Grotesk] text-[10px] font-medium text-[#d1c5b4] uppercase tracking-widest">
                    Pipeline Stage
                  </th>
                  <th className="px-6 py-3 font-[Space_Grotesk] text-[10px] font-medium text-[#d1c5b4] uppercase tracking-widest text-right">
                    Commitment Size
                  </th>
                  <th className="px-6 py-3 font-[Space_Grotesk] text-[10px] font-medium text-[#d1c5b4] uppercase tracking-widest">
                    Relationship Owner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10141a]/40">
                <tr className="hover:bg-[#1c2026] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#e9c176]" />
                      <span className="font-[Space_Grotesk] text-sm text-[#dfe2eb]">
                        {STAGE_LABELS[meeting.orgStage ?? ""] ?? meeting.orgStage?.toUpperCase() ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-[Space_Grotesk] text-sm text-[#e9c176]">
                      {meeting.orgTargetCommitment
                        ? `$${Number(meeting.orgTargetCommitment).toLocaleString()}`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-[Space_Grotesk] text-sm text-[#d1c5b4]">
                      {meeting.orgRelationshipOwner ?? "—"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Attendees & Intro Chain */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendees */}
        {attendees.length > 0 && (
          <div className="bg-[#1c2026] p-6 rounded-sm space-y-6">
            <h3 className="font-[Manrope] text-xs font-bold text-[#d1c5b4] uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">groups</span>
              Key Attendees
            </h3>
            <div className="space-y-3">
              {attendees.map((a, i) => {
                const warmthColor = strengthToColor(a.relationshipStrength);
                const warmthLabel = strengthToLabel(a.relationshipStrength);
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setDossierAttendee(a)}
                    className="w-full text-left flex items-start gap-4 p-3 bg-[#181c22] rounded-sm border border-transparent hover:border-[#e9c176]/40 active:scale-[0.99] transition-all"
                    aria-label={`Open dossier for ${a.name ?? "attendee"}`}
                  >
                    <div className="relative w-10 h-10 bg-[#31353c] flex items-center justify-center rounded-sm shrink-0">
                      <span className="material-symbols-outlined text-[#e9c176]">
                        person
                      </span>
                      {a.isTeam && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#e9c176] ring-2 ring-[#1c2026]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: warmthColor }}
                          title={warmthLabel}
                          aria-label={warmthLabel}
                        />
                        <p className="font-[Manrope] text-sm font-bold text-[#dfe2eb] truncate">
                          {a.name}
                        </p>
                      </div>
                      <p className="font-[Space_Grotesk] text-[11px] text-[#d1c5b4] uppercase tracking-tighter truncate">
                        {[a.title, a.org].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#4e4639] shrink-0 mt-1">
                      chevron_right
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Intro Chain */}
        {meeting.introChain && (
          <div className="bg-[#1c2026] p-6 rounded-sm space-y-6">
            <h3 className="font-[Manrope] text-xs font-bold text-[#d1c5b4] uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">hub</span>
              Intro Chain
            </h3>
            <div className="relative py-4 pl-4 space-y-8">
              <div className="absolute left-6 top-6 bottom-6 w-px bg-[#4e4639]/30" />
              {meeting.introChain.split("→").map((person: string, i: number, arr: string[]) => (
                <div key={i} className="relative flex items-center gap-4 z-10">
                  <div
                    className={`w-4 h-4 rounded-full ring-4 ring-[#1c2026] ${
                      i === 0 || i === arr.length - 1
                        ? "bg-[#e9c176]"
                        : "bg-[#31353c] border border-[#4e4639]"
                    }`}
                  />
                  <div>
                    <p className="font-[Manrope] text-[13px] font-bold text-[#dfe2eb]">
                      {person.trim()}
                    </p>
                    <p className="font-[Space_Grotesk] text-[10px] text-[#d1c5b4]">
                      {i === 0
                        ? "Originator"
                        : i === arr.length - 1
                          ? "Target"
                          : "Connector"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Prep Notes — inline editable */}
      <section className="bg-[#1c2026] p-6 rounded-sm space-y-4">
        <h3 className="font-[Manrope] text-xs font-bold text-[#d1c5b4] uppercase tracking-widest">
          Prep Notes
        </h3>
        <InlineEditableField
          type="textarea"
          value={prepNotes}
          onSave={(v) => saveMeetingField("prepNotes", v)}
          placeholder="Click to add prep notes…"
          rows={4}
        />
      </section>

      {/* Action Items / Prep Checklist */}
      {actionItems.length > 0 && (
        <section className="bg-[#31353c]/40 p-6 rounded-sm border border-[#4e4639]/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-[Manrope] text-xs font-bold text-[#dfe2eb] uppercase tracking-widest">
              Prep Checklist
            </h3>
            <span className="font-[Space_Grotesk] text-[10px] text-[#e9c176]">
              {completedCount}/{actionItems.length} COMPLETED
              {saving && " · SAVING..."}
            </span>
          </div>
          <div className="space-y-3">
            {actionItems.map((item: any, i: number) => (
              <label
                key={i}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleAction(i)}
                    className="peer sr-only"
                  />
                  <div
                    className={`w-5 h-5 border rounded-sm transition-colors flex items-center justify-center ${
                      item.done
                        ? "border-[#e9c176] bg-[#e9c176]/20"
                        : "border-[#4e4639] hover:border-[#e9c176]"
                    }`}
                  >
                    {item.done && (
                      <span className="material-symbols-outlined text-[14px] text-[#e9c176]">
                        check
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm ${
                    item.done
                      ? "text-[#d1c5b4] line-through opacity-60"
                      : "text-[#dfe2eb] group-hover:text-[#e9c176] transition-colors"
                  }`}
                >
                  {item.task}
                  {item.owner && (
                    <span className="text-[#d1c5b4] ml-2">— {item.owner}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}
    </main>
    <ContactDossier
      open={dossierAttendee !== null}
      attendee={dossierAttendee}
      inlineInteractions={orgInteractions}
      onClose={() => setDossierAttendee(null)}
    />
    </>
  );
}

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MeetingDetail meetingId={id} />;
}
