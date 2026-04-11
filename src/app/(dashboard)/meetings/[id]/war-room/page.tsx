"use client";

import { use, useCallback } from "react";
import { useWarRoom } from "@/hooks/use-war-room";
import { IntelDossier } from "@/components/war-room/intel-dossier";
import { SectionEditor } from "@/components/war-room/section-editor";
import { AttachmentZone } from "@/components/war-room/attachment-zone";
import { GenerateButton } from "@/components/war-room/generate-button";

const SECTION_TYPE_ORDER: Record<string, number> = {
  intel_summary: 0,
  positioning: 1,
  pitch_script: 2,
  prep_checklist: 3,
  custom: 4,
};

export default function WarRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: meetingId } = use(params);
  const { data, isLoading, mutate } = useWarRoom(meetingId);

  const handleSaveSection = useCallback(
    async (sectionId: string, content: string) => {
      await fetch(`/api/war-room/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, content }),
      });
      mutate();
    },
    [meetingId, mutate]
  );

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4 px-4 pt-8 max-w-7xl mx-auto">
        <div className="h-12 rounded-lg bg-[#181c22] w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 rounded-lg bg-[#181c22]" />
            <div className="h-32 rounded-lg bg-[#181c22]" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 rounded-lg bg-[#181c22]" />
            <div className="h-48 rounded-lg bg-[#181c22]" />
          </div>
        </div>
      </div>
    );
  }

  const { meeting, sections, attachments, context } = data;

  // Group sections by type
  const intelSections = sections.filter((s) => s.sectionType === "intel_summary");
  const positioningSections = sections.filter((s) => s.sectionType === "positioning");
  const pitchSections = sections
    .filter((s) => s.sectionType === "pitch_script")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const checklistSections = sections.filter((s) => s.sectionType === "prep_checklist");
  const customSections = sections.filter((s) => s.sectionType === "custom");

  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : null;
  const hasSections = sections.length > 0;

  return (
    <main className="px-4 md:px-8 pt-8 pb-32 lg:pb-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <a
        href={`/meetings/${meetingId}`}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Meetings
      </a>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-2xl"
              style={{ color: "var(--accent)" }}
            >
              strategy
            </span>
            <h1
              className="font-[Manrope] text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {meeting.title}
            </h1>
          </div>
          <div
            className="flex items-center gap-3 mt-1 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {meeting.meetingDate && (
              <span className="font-[JetBrains_Mono]">
                {meeting.meetingDate}
                {meeting.meetingTime && ` · ${meeting.meetingTime.slice(0, 5)}`}
              </span>
            )}
            {meeting.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">location_on</span>
                {meeting.location}
              </span>
            )}
            {context.org && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                {context.org.name}
              </span>
            )}
          </div>
        </div>

        <GenerateButton
          meetingId={meetingId}
          hasExistingSections={hasSections}
          onComplete={() => mutate()}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Intel Dossier — always visible from CRM data */}
          <IntelDossier
            context={context}
            attendees={attendees as any[] | null}
            introChain={meeting.introChain}
          />

          {/* Intel Summary sections */}
          {intelSections.map((s) => (
            <SectionEditor
              key={s.id}
              sectionId={s.id}
              meetingId={meetingId}
              title={s.title ?? "Intel Summary"}
              content={s.content}
              sectionType={s.sectionType}
              aiGenerated={s.aiGenerated ?? false}
              onSave={handleSaveSection}
              onRefineComplete={() => mutate()}
            />
          ))}

          {/* Pitch Script sections */}
          {pitchSections.length > 0 && (
            <div className="space-y-3">
              <h2
                className="font-[Manrope] text-lg font-bold tracking-tight px-1 pt-2"
                style={{ color: "var(--text-primary)" }}
              >
                Pitch Script
              </h2>
              {pitchSections.map((s) => (
                <SectionEditor
                  key={s.id}
                  sectionId={s.id}
                  meetingId={meetingId}
                  title={s.title ?? "Script Section"}
                  content={s.content}
                  sectionType={s.sectionType}
                  aiGenerated={s.aiGenerated ?? false}
                  onSave={handleSaveSection}
                  onRefineComplete={() => mutate()}
                />
              ))}
            </div>
          )}

          {/* Custom sections */}
          {customSections.map((s) => (
            <SectionEditor
              key={s.id}
              sectionId={s.id}
              meetingId={meetingId}
              title={s.title ?? "Notes"}
              content={s.content}
              sectionType={s.sectionType}
              aiGenerated={s.aiGenerated ?? false}
              onSave={handleSaveSection}
              onRefineComplete={() => mutate()}
            />
          ))}

          {/* Empty state */}
          {!hasSections && (
            <div
              className="p-12 rounded-lg text-center"
              style={{ background: "#181c22", border: "1px dashed #31353c" }}
            >
              <span
                className="material-symbols-outlined text-4xl block mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                strategy
              </span>
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                No war room content yet
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Click &quot;Generate War Room&quot; to create intel, positioning, and a pitch script from your CRM data
              </p>
            </div>
          )}
        </div>

        {/* Right column (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Reference Docs */}
          <AttachmentZone
            meetingId={meetingId}
            attachments={attachments}
            onUpdate={() => mutate()}
          />

          {/* Positioning sections */}
          {positioningSections.map((s) => (
            <SectionEditor
              key={s.id}
              sectionId={s.id}
              meetingId={meetingId}
              title={s.title ?? "Positioning Analysis"}
              content={s.content}
              sectionType={s.sectionType}
              aiGenerated={s.aiGenerated ?? false}
              onSave={handleSaveSection}
              onRefineComplete={() => mutate()}
            />
          ))}

          {/* Prep Checklist */}
          {checklistSections.map((s) => (
            <SectionEditor
              key={s.id}
              sectionId={s.id}
              meetingId={meetingId}
              title={s.title ?? "Prep Checklist"}
              content={s.content}
              sectionType={s.sectionType}
              aiGenerated={s.aiGenerated ?? false}
              onSave={handleSaveSection}
              onRefineComplete={() => mutate()}
            />
          ))}

          {/* Strategic Ask + Pitch Angle from meeting record */}
          {(meeting.strategicAsk || meeting.pitchAngle) && !hasSections && (
            <div className="space-y-3">
              {meeting.strategicAsk && (
                <div className="p-4 rounded-lg" style={{ background: "#181c22", borderLeft: "3px solid var(--accent)" }}>
                  <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: "var(--accent)" }}>
                    Strategic Ask
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {meeting.strategicAsk}
                  </p>
                </div>
              )}
              {meeting.pitchAngle && (
                <div className="p-4 rounded-lg" style={{ background: "#181c22", borderLeft: "3px solid #4e4639" }}>
                  <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>
                    Pitch Angle
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {meeting.pitchAngle}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
