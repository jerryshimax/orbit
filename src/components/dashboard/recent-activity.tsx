"use client";

import { INTERACTION_TYPES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/format";
import type { InteractionWithContext } from "@/db/queries/interactions";

export function RecentActivity({
  interactions,
}: {
  interactions: InteractionWithContext[];
}) {
  if (interactions.length === 0) {
    return (
      <div
        className="p-6 text-center text-sm"
        style={{ color: "var(--text-tertiary)" }}
      >
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {interactions.map((item) => {
        const typeInfo = INTERACTION_TYPES[item.interactionType] ?? {
          label: item.interactionType,
          icon: "note",
        };

        return (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="material-symbols-rounded text-[18px] mt-0.5 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              {typeInfo.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.orgName ?? "Unknown"}
                </span>
                <span
                  className="text-xs shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {typeInfo.label}
                </span>
              </div>
              <p
                className="text-xs mt-0.5 line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.summary}
              </p>
              <div
                className="text-[11px] mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {item.teamMember} &middot;{" "}
                {formatRelativeDate(item.interactionDate)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
