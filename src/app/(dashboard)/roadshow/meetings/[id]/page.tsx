"use client";

import { use } from "react";
import Link from "next/link";
import { useMeeting } from "@/hooks/use-roadshow";
import { useState, useCallback } from "react";

const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  confirmed: "#22c55e",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "#6b7280",
  intro: "#3b82f6",
  meeting: "#f59e0b",
  dd: "#8b5cf6",
  soft_circle: "#06b6d4",
  committed: "#22c55e",
  closed: "#10b981",
  passed: "#ef4444",
};

function ActionItem({
  item,
  index,
  onToggle,
}: {
  item: { task: string; owner: string; due?: string; done: boolean };
  index: number;
  onToggle: (index: number) => void;
}) {
  return (
    <button
      onClick={() => onToggle(index)}
      className="flex items-start gap-3 w-full text-left min-h-[44px] py-2"
    >
      <span
        className="material-symbols-rounded text-[20px] mt-0.5"
        style={{
          color: item.done ? "#22c55e" : "var(--text-tertiary)",
        }}
      >
        {item.done ? "check_circle" : "radio_button_unchecked"}
      </span>
      <div className="flex-1">
        <span
          className="text-sm"
          style={{
            color: item.done
              ? "var(--text-tertiary)"
              : "var(--text-primary)",
            textDecoration: item.done ? "line-through" : "none",
          }}
        >
          {item.task}
        </span>
        <div className="flex gap-2 mt-0.5">
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {item.owner}
          </span>
          {item.due && (
            <span
              className="text-xs font-mono tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {item.due}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MeetingDetail({ meetingId }: { meetingId: string }) {
  const { data: meeting, isLoading, mutate } = useMeeting(meetingId);
  const [saving, setSaving] = useState(false);

  const toggleAction = useCallback(
    async (index: number) => {
      if (!meeting?.actionItems) return;
      const items = [...(meeting.actionItems as any[])];
      items[index] = { ...items[index], done: !items[index].done };

      // Optimistic update
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
      <div className="animate-pulse space-y-4">
        <div
          className="h-8 w-2/3 rounded"
          style={{ background: "var(--bg-surface)" }}
        />
        <div
          className="h-64 rounded-xl"
          style={{ background: "var(--bg-surface)" }}
        />
      </div>
    );
  }

  const statusColor = STATUS_COLORS[meeting.status] ?? "#6b7280";
  const stageColor = meeting.orgStage
    ? STAGE_COLORS[meeting.orgStage] ?? "#6b7280"
    : null;
  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];
  const actionItems = Array.isArray(meeting.actionItems)
    ? (meeting.actionItems as any[])
    : [];

  const dateStr = meeting.meetingDate
    ? new Date(meeting.meetingDate + "T00:00:00").toLocaleDateString("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "TBD";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Back + Header */}
      <div>
        <Link
          href="/roadshow/meetings"
          className="inline-flex items-center gap-1 text-sm mb-3 min-h-[44px]"
          style={{ color: "var(--text-secondary)" }}
        >
          <span className="material-symbols-rounded text-[18px]">
            arrow_back
          </span>
          Meetings
        </Link>

        <h1
          className="text-lg md:text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {meeting.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span
            className="text-sm font-mono tabular-nums"
            style={{ color: "var(--text-secondary)" }}
          >
            {dateStr}
          </span>
          {meeting.meetingTime && (
            <span
              className="text-sm font-mono tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {meeting.meetingTime.slice(0, 5)}
            </span>
          )}
          {meeting.durationMin && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-tertiary)",
              }}
            >
              {meeting.durationMin}min
            </span>
          )}
          <span
            className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full"
            style={{
              background: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {meeting.status}
          </span>
        </div>

        {meeting.location && (
          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(meeting.location)}`}
            className="flex items-center gap-1.5 mt-2 text-sm min-h-[44px]"
            style={{ color: "var(--accent)" }}
          >
            <span className="material-symbols-rounded text-[16px]">
              location_on
            </span>
            {meeting.location}
            <span className="material-symbols-rounded text-[14px]">
              open_in_new
            </span>
          </a>
        )}
      </div>

      {/* Strategic Brief — gold accent */}
      {(meeting.strategicAsk || meeting.pitchAngle || meeting.introChain) && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: "rgba(255,186,5,0.05)",
            border: "1px solid rgba(255,186,5,0.15)",
          }}
        >
          {meeting.strategicAsk && (
            <div>
              <div
                className="text-xs font-semibold uppercase mb-1"
                style={{ color: "#ffba05" }}
              >
                Strategic Ask
              </div>
              <div
                className="text-sm whitespace-pre-wrap"
                style={{ color: "var(--text-primary)" }}
              >
                {meeting.strategicAsk}
              </div>
            </div>
          )}
          {meeting.pitchAngle && (
            <div>
              <div
                className="text-xs font-semibold uppercase mb-1"
                style={{ color: "#ffba05", opacity: 0.7 }}
              >
                Pitch Angle
              </div>
              <div
                className="text-sm whitespace-pre-wrap"
                style={{ color: "var(--text-secondary)" }}
              >
                {meeting.pitchAngle}
              </div>
            </div>
          )}
          {meeting.introChain && (
            <div>
              <div
                className="text-xs font-semibold uppercase mb-1"
                style={{ color: "#ffba05", opacity: 0.7 }}
              >
                Intro Chain
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {meeting.introChain}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRM Dossier — if linked to org */}
      {meeting.orgName && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            CRM Dossier
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Organization
              </div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {meeting.orgName}
              </div>
            </div>
            {meeting.orgStage && (
              <div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Pipeline Stage
                </div>
                <span
                  className="inline-block text-[10px] font-medium uppercase px-2 py-0.5 rounded-full mt-1"
                  style={{
                    background: `${stageColor}20`,
                    color: stageColor!,
                  }}
                >
                  {meeting.orgStage}
                </span>
              </div>
            )}
            {meeting.orgTargetCommitment && (
              <div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Target Commitment
                </div>
                <div
                  className="text-sm font-mono tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  ${Number(meeting.orgTargetCommitment).toLocaleString()}
                </div>
              </div>
            )}
            {meeting.orgRelationshipOwner && (
              <div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Relationship Owner
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {meeting.orgRelationshipOwner}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Attendees ({attendees.length})
          </div>
          <div className="space-y-3">
            {attendees.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    background:
                      a.role === "ce_team"
                        ? "rgba(255,186,5,0.15)"
                        : "var(--bg)",
                    color:
                      a.role === "ce_team"
                        ? "#ffba05"
                        : "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {(a.name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.name}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {[a.title, a.org].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prep Notes */}
      {meeting.prepNotes && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Prep Notes
          </div>
          <div
            className="text-sm whitespace-pre-wrap leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          >
            {meeting.prepNotes}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-xs font-semibold uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              Action Items
            </div>
            {saving && (
              <span
                className="material-symbols-rounded animate-spin text-[14px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                progress_activity
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {actionItems.map((item: any, i: number) => (
              <ActionItem
                key={i}
                item={item}
                index={i}
                onToggle={toggleAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
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
