"use client";

import { useWarRooms } from "@/hooks/use-war-rooms";
import { formatRelativeDate } from "@/lib/format";
import Link from "next/link";

const SECTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  intel_summary: { label: "Intel", color: "#3b82f6" },
  positioning: { label: "Position", color: "#8b5cf6" },
  pitch_script: { label: "Pitch", color: "#e9c176" },
  prep_checklist: { label: "Checklist", color: "#22c55e" },
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  planned: "#3b82f6",
  tentative: "#f59e0b",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export default function WarRoomListPage() {
  const { data: warRooms, isLoading } = useWarRooms();

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
            War Room
          </h1>
          {warRooms && warRooms.length > 0 && (
            <span
              className="font-[JetBrains_Mono] text-xs px-2 py-0.5 rounded"
              style={{ background: "#262a31", color: "var(--text-tertiary)" }}
            >
              {warRooms.length}
            </span>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ background: "#181c22" }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!warRooms || warRooms.length === 0) && (
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
          <p
            className="text-sm mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            No war rooms yet
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Open a meeting and click &quot;Generate War Room&quot; to create
            intel, positioning, and a pitch script
          </p>
        </div>
      )}

      {/* War room cards */}
      {warRooms && warRooms.length > 0 && (
        <div className="space-y-3">
          {warRooms.map((wr) => {
            const statusColor =
              STATUS_COLORS[wr.meetingStatus] ?? "#6b7280";

            return (
              <Link
                key={wr.meetingId}
                href={`/meetings/${wr.meetingId}/war-room`}
                className="block rounded-lg p-5 transition-colors hover:brightness-110"
                style={{
                  background: "#181c22",
                  borderLeft: "3px solid var(--accent)",
                }}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left: meeting info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2
                        className="font-[Manrope] font-bold text-base truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {wr.meetingTitle}
                      </h2>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: statusColor }}
                        title={wr.meetingStatus}
                      />
                    </div>

                    <div
                      className="flex items-center gap-3 text-xs flex-wrap"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {wr.meetingDate && (
                        <span className="font-[JetBrains_Mono]">
                          {wr.meetingDate}
                          {wr.meetingTime &&
                            ` · ${wr.meetingTime.slice(0, 5)}`}
                        </span>
                      )}
                      {wr.meetingLocation && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            location_on
                          </span>
                          {wr.meetingLocation}
                        </span>
                      )}
                      {wr.orgName && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            corporate_fare
                          </span>
                          {wr.orgName}
                          {wr.orgNameZh && (
                            <span style={{ color: "var(--text-tertiary)" }}>
                              ({wr.orgNameZh})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Section count badge */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ color: "var(--accent)" }}
                      >
                        article
                      </span>
                      <span
                        className="font-[JetBrains_Mono] text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {wr.sectionCount}
                      </span>
                    </div>

                    {/* Attachment count */}
                    {wr.attachmentCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          attach_file
                        </span>
                        <span
                          className="font-[JetBrains_Mono] text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {wr.attachmentCount}
                        </span>
                      </div>
                    )}

                    {/* Last activity */}
                    {wr.lastActivity && (
                      <span
                        className="font-[JetBrains_Mono] text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {formatRelativeDate(wr.lastActivity)}
                      </span>
                    )}

                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      chevron_right
                    </span>
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
