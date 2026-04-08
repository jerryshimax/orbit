"use client";

import { useParams } from "next/navigation";
import { useOrganizationDetail } from "@/hooks/use-organizations";
import { StageBadge } from "@/components/shared/stage-badge";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { BrainPanel } from "@/components/organizations/brain-panel";
import { formatMoney, formatDate, formatRelativeDate, daysSince } from "@/lib/format";
import { LP_TYPES, INTERACTION_TYPES } from "@/lib/constants";

export default function OrgDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data } = useOrganizationDetail(id);

  if (!data) {
    return (
      <div
        className="p-12 text-center text-sm"
        style={{ color: "var(--text-tertiary)" }}
      >
        Loading...
      </div>
    );
  }

  const { org, people: orgPeople, opportunities: orgOpps, interactions, history } = data;
  const lastInteraction = interactions[0];
  const days = lastInteraction
    ? daysSince(lastInteraction.interactionDate)
    : null;

  return (
    <div className="max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {org.name}
            </h1>
            <StageBadge stage={orgOpps?.[0]?.stage ?? "prospect"} />
            <WarmthDot daysSinceTouch={days} showLabel />
          </div>
          <div
            className="flex items-center gap-3 mt-1.5 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {org.lpType && <span>{LP_TYPES[org.lpType] ?? org.lpType}</span>}
            {org.headquarters && (
              <>
                <span style={{ color: "var(--text-tertiary)" }}>·</span>
                <span>{org.headquarters}</span>
              </>
            )}
            {org.relationshipOwner && (
              <>
                <span style={{ color: "var(--text-tertiary)" }}>·</span>
                <span className="uppercase text-xs">
                  {org.relationshipOwner}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Key financials */}
        <div className="text-right">
          <div
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Target
          </div>
          <div
            className="text-lg font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {formatMoney(org.targetCommitment)}
          </div>
          {org.aumUsd && (
            <div
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              AUM: {formatMoney(org.aumUsd)}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {org.tags && org.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {org.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                background: "var(--bg-surface-hover)",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {org.notes && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          {org.notes}
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left: Contacts + History */}
        <div className="col-span-2 space-y-6">
          {/* Contacts */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                People ({orgPeople?.length ?? 0})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {orgPeople?.map((entry: any) => (
                <div key={entry.person.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.person.fullName}
                      {entry.person.fullNameZh && entry.person.fullNameZh !== entry.person.fullName && (
                        <span className="text-xs text-zinc-500 ml-1">{entry.person.fullNameZh}</span>
                      )}
                    </span>
                    {entry.affiliation.isPrimaryContact && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--accent-surface)",
                          color: "var(--accent)",
                        }}
                      >
                        Primary
                      </span>
                    )}
                    {entry.person.relationshipStrength && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded capitalize"
                        style={{
                          background: "var(--bg-surface-hover)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {entry.person.relationshipStrength}
                      </span>
                    )}
                  </div>
                  {entry.affiliation.title && (
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {entry.affiliation.title}
                    </div>
                  )}
                  {entry.person.introducedByName && (
                    <div
                      className="text-[11px] mt-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Intro: {entry.person.introducedByName}
                    </div>
                  )}
                </div>
              ))}
              {(!orgPeople || orgPeople.length === 0) && (
                <div
                  className="px-4 py-6 text-center text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No contacts
                </div>
              )}
            </div>
          </div>

          {/* Pipeline History */}
          {history.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Pipeline History
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {history.map((h: any) => (
                  <div
                    key={h.id}
                    className="px-4 py-2.5 flex items-center gap-2 text-xs"
                  >
                    <StageBadge stage={h.fromStage ?? "new"} />
                    <span style={{ color: "var(--text-tertiary)" }}>→</span>
                    <StageBadge stage={h.toStage} />
                    <span
                      className="ml-auto"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {formatRelativeDate(h.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Interactions + Brain Panel */}
        <div className="col-span-3 space-y-6">
          {/* Interaction Timeline */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Interactions ({interactions.length})
              </h3>
            </div>
            <div className="relative pl-10 pr-4 py-4 space-y-6 before:content-[''] before:absolute before:left-[19px] before:top-6 before:bottom-6 before:w-[2px] before:bg-[#4e4639]/20">
              {interactions.map((i: any, idx: number) => {
                const typeInfo = INTERACTION_TYPES[i.interactionType] ?? {
                  label: i.interactionType,
                  icon: "note",
                };
                const isFirst = idx === 0;
                return (
                  <div key={i.id} className="relative">
                    <span
                      className="absolute -left-[25px] top-1 w-3 h-3 rounded-full ring-4"
                      style={{
                        background: isFirst ? "var(--accent)" : "#4e4639",
                        boxShadow: "0 0 0 4px var(--bg-surface)",
                      }}
                    />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-[JetBrains_Mono] text-[10px] uppercase"
                          style={{ color: isFirst ? "var(--accent)" : "var(--text-tertiary)" }}
                        >
                          {formatRelativeDate(i.interactionDate)}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {i.teamMember}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-0.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {i.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
              {interactions.length === 0 && (
                <div
                  className="px-4 py-6 text-center text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No interactions recorded
                </div>
              )}
            </div>
          </div>

          {/* Brain Context Panel */}
          <BrainPanel orgName={org.name} />
        </div>
      </div>
    </div>
  );
}
