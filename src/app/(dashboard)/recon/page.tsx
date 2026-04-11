"use client";

import { useReconProjects } from "@/hooks/use-recon-projects";
import { formatRelativeDate } from "@/lib/format";
import Link from "next/link";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  meeting_prep: { label: "Meeting Prep", color: "#3b82f6" },
  lp_campaign: { label: "LP Campaign", color: "#8b5cf6" },
  deal_strategy: { label: "Deal Strategy", color: "#22c55e" },
  partnership: { label: "Partnership", color: "#f59e0b" },
  market_entry: { label: "Market Entry", color: "#ec4899" },
  custom: { label: "Custom", color: "#6b7280" },
};

const ENTITY_COLORS: Record<string, string> = {
  CE: "#e9c176",
  SYN: "#3b82f6",
  UUL: "#22c55e",
};

export default function ReconListPage() {
  const { data: projects, isLoading } = useReconProjects();

  return (
    <main className="px-4 md:px-8 pt-8 pb-32 lg:pb-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            Recon
          </h1>
          {projects && projects.length > 0 && (
            <span
              className="font-[JetBrains_Mono] text-xs px-2 py-0.5 rounded"
              style={{ background: "#262a31", color: "var(--text-tertiary)" }}
            >
              {projects.length}
            </span>
          )}
        </div>
        <Link
          href="/recon/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-[Space_Grotesk] uppercase tracking-wider font-bold transition-all hover:brightness-110"
          style={{ background: "var(--accent)", color: "#412d00" }}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Recon
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: "#181c22" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!projects || projects.length === 0) && (
        <div
          className="p-12 rounded-lg text-center"
          style={{ background: "#181c22", border: "1px dashed #31353c" }}
        >
          <span className="material-symbols-outlined text-4xl block mb-2" style={{ color: "var(--text-tertiary)" }}>
            strategy
          </span>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            No recon projects yet
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            Create a recon to start building strategic intel on a target
          </p>
          <Link
            href="/recon/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-[Space_Grotesk] uppercase tracking-wider font-bold"
            style={{ background: "var(--accent)", color: "#412d00" }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Recon
          </Link>
        </div>
      )}

      {/* Project cards */}
      {projects && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((p) => {
            const typeInfo = TYPE_LABELS[p.projectType] ?? TYPE_LABELS.custom;
            const entityColor = p.entityCode ? ENTITY_COLORS[p.entityCode] ?? "#6b7280" : null;

            return (
              <Link
                key={p.id}
                href={`/recon/${p.id}`}
                className="block rounded-lg p-5 transition-colors hover:brightness-110"
                style={{ background: "#181c22", borderLeft: `3px solid ${typeInfo.color}` }}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-[Manrope] font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>
                        {p.name}
                      </h2>
                      <span
                        className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                        style={{ background: `${typeInfo.color}20`, color: typeInfo.color, border: `1px solid ${typeInfo.color}40` }}
                      >
                        {typeInfo.label}
                      </span>
                      {entityColor && (
                        <span
                          className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${entityColor}20`, color: entityColor }}
                        >
                          {p.entityCode}
                        </span>
                      )}
                    </div>

                    {/* Objective */}
                    {p.objective && (
                      <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                        {p.objective}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--text-tertiary)" }}>
                      {p.orgName && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                          {p.orgName}
                          {p.orgNameZh && ` (${p.orgNameZh})`}
                        </span>
                      )}
                      {p.meetingDate && (
                        <span className="font-[JetBrains_Mono]">
                          {p.meetingDate}
                          {p.meetingTime && ` · ${p.meetingTime.slice(0, 5)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    {p.sectionCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--accent)" }}>article</span>
                        <span className="font-[JetBrains_Mono] text-xs" style={{ color: "var(--text-secondary)" }}>{p.sectionCount}</span>
                      </div>
                    )}
                    {p.attachmentCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--text-tertiary)" }}>attach_file</span>
                        <span className="font-[JetBrains_Mono] text-xs" style={{ color: "var(--text-secondary)" }}>{p.attachmentCount}</span>
                      </div>
                    )}
                    {p.lastActivity && (
                      <span className="font-[JetBrains_Mono] text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {formatRelativeDate(p.lastActivity)}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--text-tertiary)" }}>chevron_right</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
