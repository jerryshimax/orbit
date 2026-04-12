"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import type { PersonDossier } from "@/db/queries/people";
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

type Attendee = {
  name?: string;
  title?: string | null;
  org?: string | null;
  personId?: string | null;
};

type InlineInteraction = {
  id: string;
  interactionType: string;
  summary: string;
  interactionDate: string | Date | null;
  orgName?: string | null;
  source?: string | null;
};

type Props = {
  /** Pre-selected attendee from the meeting page (may have no `personId`). */
  attendee: Attendee | null;
  /** Interactions already fetched by the meeting prep page (getMeetingDetail). */
  inlineInteractions?: InlineInteraction[];
  /** Controlled open state. */
  open: boolean;
  onClose: () => void;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<PersonDossier>;
  });

export function ContactDossier({
  attendee,
  inlineInteractions,
  open,
  onClose,
}: Props) {
  const personId = attendee?.personId ?? null;
  const { data, error, isLoading } = useSWR<PersonDossier>(
    open && personId ? `/api/people/${personId}/dossier` : null,
    fetcher
  );

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const panelRef = useRef<HTMLDivElement | null>(null);

  if (!open || !attendee) return null;

  const strength = data?.person.relationshipStrength ?? null;
  const warmthColor = strengthToColor(strength);
  const warmthLabel = strengthToLabel(strength);

  const displayName =
    data?.person.fullName ?? attendee.name ?? "Unknown contact";
  const displayTitle =
    data?.person.title ??
    attendee.title ??
    data?.primaryOrg?.title ??
    null;
  const displayOrg =
    data?.primaryOrg?.name ?? attendee.org ?? null;

  const interactions = data?.interactions ?? mapInline(inlineInteractions);

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label={`Contact dossier for ${displayName}`}
      className="fixed inset-0 z-50 flex md:items-stretch md:justify-end items-end justify-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dossier"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Sheet: bottom on mobile, right rail on desktop */}
      <div
        ref={panelRef}
        className="relative w-full md:w-[440px] md:h-full max-h-[90vh] md:max-h-none overflow-y-auto bg-[#10141a] border-t md:border-t-0 md:border-l border-[#4e4639]/30 rounded-t-xl md:rounded-none shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
        style={{
          transform: "translate3d(0,0,0)",
        }}
      >
        {/* Drag affordance (mobile) */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[#4e4639]/40" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-5 border-b border-[#4e4639]/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: warmthColor }}
                  title={warmthLabel}
                  aria-label={warmthLabel}
                />
                <h2 className="font-[Manrope] text-lg font-bold text-[#dfe2eb] truncate">
                  {displayName}
                </h2>
              </div>
              {(displayTitle || displayOrg) && (
                <p className="font-[Space_Grotesk] text-[11px] text-[#d1c5b4] uppercase tracking-widest truncate">
                  {[displayTitle, displayOrg].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm border border-[#4e4639]/40 text-[#d1c5b4] hover:text-[#e9c176] hover:border-[#e9c176] transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6">
          {error && (
            <div className="text-xs text-[#ef4444] font-[Space_Grotesk]">
              Couldn&apos;t load full dossier · showing inline data only
            </div>
          )}

          {/* No-link state: the attendee row has no personId, so CRM data is unavailable. */}
          {!personId && (
            <SectionNote>
              This attendee isn&apos;t linked to a CRM contact yet. Link them
              from the contacts page to see pipeline status and trip history.
            </SectionNote>
          )}

          {/* Pipeline status */}
          <Section title="Pipeline status">
            {isLoading && personId ? (
              <SkeletonLines />
            ) : data?.opportunities && data.opportunities.length > 0 ? (
              <ul className="space-y-2">
                {data.opportunities.map((opp) => (
                  <li
                    key={opp.id}
                    className="flex items-center justify-between gap-3 p-3 bg-[#181c22] rounded-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-[Manrope] text-sm text-[#dfe2eb] truncate">
                        {opp.name}
                      </p>
                      <p className="font-[Space_Grotesk] text-[10px] text-[#d1c5b4] uppercase tracking-widest truncate">
                        {[opp.entityCode, opp.orgName, opp.role]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-sm font-[Space_Grotesk] text-[10px] font-bold tracking-widest"
                      style={{
                        backgroundColor: "#e9c17622",
                        color: "#e9c176",
                      }}
                    >
                      {STAGE_LABELS[opp.stage] ?? opp.stage.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRow label="No linked opportunities." />
            )}
          </Section>

          {/* Trip appearances */}
          <Section
            title="Trip appearances"
            count={data?.tripAppearances.length}
          >
            {isLoading && personId ? (
              <SkeletonLines />
            ) : data?.tripAppearances && data.tripAppearances.length > 0 ? (
              <ul className="space-y-2">
                {data.tripAppearances.slice(0, 8).map((t) => (
                  <li
                    key={t.meetingId}
                    className="p-3 bg-[#181c22] rounded-sm"
                  >
                    <p className="font-[Manrope] text-sm text-[#dfe2eb] truncate">
                      {t.meetingTitle}
                    </p>
                    <p className="font-[Space_Grotesk] text-[10px] text-[#d1c5b4] uppercase tracking-widest">
                      {formatDate(t.meetingDate)} · {t.tripName}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRow label="No trip history." />
            )}
          </Section>

          {/* Interaction history */}
          <Section title="Interaction history" count={interactions.length}>
            {interactions.length > 0 ? (
              <ol className="relative space-y-3 pl-4 border-l border-[#4e4639]/30">
                {interactions.slice(0, 12).map((iv) => (
                  <li key={iv.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#e9c176]" />
                    <div className="p-3 bg-[#181c22] rounded-sm">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-[Space_Grotesk] text-[10px] text-[#e9c176] uppercase tracking-widest">
                          {iv.interactionType.replace(/_/g, " ")}
                        </span>
                        <span className="font-[Space_Grotesk] text-[10px] text-[#d1c5b4] tabular-nums">
                          {formatDate(iv.interactionDate)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#dfe2eb] leading-relaxed line-clamp-3">
                        {iv.summary}
                      </p>
                      {(iv.orgName || iv.source) && (
                        <p className="mt-1 font-[Space_Grotesk] text-[10px] text-[#d1c5b4] uppercase tracking-widest truncate">
                          {[iv.orgName, iv.source].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : isLoading && personId ? (
              <SkeletonLines />
            ) : (
              <EmptyRow label="No interactions logged yet." />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-[Manrope] text-xs font-bold text-[#d1c5b4] uppercase tracking-widest">
          {title}
        </h3>
        {typeof count === "number" && count > 0 && (
          <span className="font-[Space_Grotesk] text-[10px] text-[#e9c176] tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="text-[12px] text-[#d1c5b4]/70 font-[Space_Grotesk] italic">
      {label}
    </p>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-sm bg-[#181c22] border-l-2 border-[#e9c176] text-[12px] text-[#d1c5b4] leading-relaxed">
      {children}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      <div className="h-12 rounded-sm bg-[#181c22] animate-pulse" />
      <div className="h-12 rounded-sm bg-[#181c22] animate-pulse" />
    </div>
  );
}

function mapInline(
  rows: InlineInteraction[] | undefined
): PersonDossier["interactions"] {
  if (!rows) return [];
  return rows.map((r) => ({
    id: r.id,
    interactionType: r.interactionType,
    summary: r.summary,
    interactionDate:
      r.interactionDate instanceof Date
        ? r.interactionDate.toISOString()
        : typeof r.interactionDate === "string"
          ? r.interactionDate
          : new Date().toISOString(),
    orgName: r.orgName ?? null,
    source: r.source ?? "unknown",
  }));
}

function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
