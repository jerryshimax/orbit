"use client";

import type { ReconContext } from "@/db/queries/recon";

type Props = {
  context: ReconContext;
  attendees: any[] | null;
  introChain: string | null;
};

export function IntelDossier({ context, attendees, introChain }: Props) {
  const { org, opportunity, people, interactions } = context;

  return (
    <div className="space-y-4">
      {/* Org Profile */}
      {org && (
        <div className="p-5 rounded-lg" style={{ background: "#181c22", borderLeft: "3px solid #3b82f6" }}>
          <h3
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-3"
            style={{ color: "#3b82f6" }}
          >
            Organization
          </h3>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="font-[Manrope] font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                {org.name}
                {org.nameZh && <span className="text-sm ml-2" style={{ color: "var(--text-tertiary)" }}>{org.nameZh}</span>}
              </span>
              {org.orgType && (
                <span
                  className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: "#262a31", color: "var(--text-tertiary)" }}
                >
                  {org.orgType.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {org.headquarters && (
                <div>
                  <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>HQ</div>
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>{org.headquarters}</div>
                </div>
              )}
              {org.aumUsd && (
                <div>
                  <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>AUM</div>
                  <div className="text-sm font-[JetBrains_Mono]" style={{ color: "var(--text-primary)" }}>
                    ${parseFloat(org.aumUsd).toLocaleString()}
                  </div>
                </div>
              )}
              {org.lpType && (
                <div>
                  <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>LP Type</div>
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>{org.lpType.replace(/_/g, " ")}</div>
                </div>
              )}
              {org.website && (
                <div>
                  <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Website</div>
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: "var(--accent)" }}>
                    {org.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
            {org.description && (
              <p className="text-xs leading-relaxed pt-2" style={{ color: "var(--text-secondary)" }}>
                {org.description}
              </p>
            )}
            {org.notes && (
              <p className="text-xs leading-relaxed pt-1 italic" style={{ color: "var(--text-tertiary)" }}>
                {org.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Opportunity */}
      {opportunity && (
        <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: "var(--text-tertiary)" }}>
            Pipeline
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Stage</div>
              <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>{opportunity.stage}</div>
            </div>
            {opportunity.dealSize && (
              <div>
                <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Deal Size</div>
                <div className="text-sm font-[JetBrains_Mono]" style={{ color: "var(--text-primary)" }}>
                  ${parseFloat(opportunity.dealSize).toLocaleString()}
                </div>
              </div>
            )}
            {opportunity.commitment && (
              <div>
                <div className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Commitment</div>
                <div className="text-sm font-[JetBrains_Mono]" style={{ color: "#22c55e" }}>
                  ${parseFloat(opportunity.commitment).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key People */}
      {people.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold px-1" style={{ color: "var(--text-tertiary)" }}>
            Key People ({people.length})
          </h3>
          {people.map(({ person: p, title, isPrimary }) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "#181c22" }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  background: isPrimary ? "var(--accent)" : "#262a31",
                  color: isPrimary ? "#412d00" : "var(--text-secondary)",
                }}
              >
                {p.fullName?.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {p.fullName}
                  {p.fullNameZh && <span className="ml-1" style={{ color: "var(--text-tertiary)" }}>({p.fullNameZh})</span>}
                </div>
                <div className="text-[10px] font-[Space_Grotesk]" style={{ color: "var(--text-tertiary)" }}>
                  {title ?? p.title}
                  {p.relationshipStrength && ` · ${p.relationshipStrength}`}
                </div>
              </div>
              {p.email && (
                <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--text-tertiary)" }} title={p.email}>
                  mail
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Meeting Attendees */}
      {attendees && attendees.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold px-1" style={{ color: "var(--text-tertiary)" }}>
            Meeting Attendees ({attendees.length})
          </h3>
          {attendees.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: "#181c22" }}>
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: a.role === "ce_team" || a.role === "host" ? "var(--accent)" : "#262a31",
                  color: a.role === "ce_team" || a.role === "host" ? "#412d00" : "var(--text-secondary)",
                }}
              >
                {a.name?.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</div>
                <div className="text-[10px] font-[Space_Grotesk]" style={{ color: "var(--text-tertiary)" }}>
                  {a.title ?? a.role} {a.org ? `· ${a.org}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Intro Chain */}
      {introChain && (
        <div className="p-4 rounded-lg" style={{ background: "#181c22" }}>
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>
            Intro Chain
          </h3>
          <p className="text-sm" style={{ color: "var(--accent)" }}>{introChain}</p>
        </div>
      )}

      {/* Interaction Timeline */}
      {interactions.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>
            Recent Interactions ({interactions.length})
          </h3>
          <div className="rounded-lg overflow-hidden" style={{ background: "#181c22" }}>
            {interactions.slice(0, 10).map((ix, i) => (
              <div
                key={ix.id}
                className="flex items-start gap-3 px-4 py-2.5"
                style={{ borderBottom: i < Math.min(interactions.length, 10) - 1 ? "1px solid #262a31" : undefined }}
              >
                <span className="font-[JetBrains_Mono] text-[10px] shrink-0 pt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {new Date(ix.interactionDate).toISOString().split("T")[0]}
                </span>
                <span
                  className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "#262a31", color: "var(--text-tertiary)" }}
                >
                  {ix.interactionType.replace(/_/g, " ")}
                </span>
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>
                  {ix.summary}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
