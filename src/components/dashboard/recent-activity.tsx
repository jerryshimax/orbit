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
    <div className="relative pl-8 py-4 pr-4 space-y-6 before:content-[''] before:absolute before:left-[15px] before:top-6 before:bottom-6 before:w-[2px] before:bg-[#4e4639]/20">
      {interactions.map((item, i) => {
        const typeInfo = INTERACTION_TYPES[item.interactionType] ?? {
          label: item.interactionType,
          icon: "note",
        };
        const isFirst = i === 0;

        return (
          <div key={item.id} className="relative">
            <span
              className="absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4"
              style={{
                background: isFirst ? "var(--accent)" : "#4e4639",
                boxShadow: "0 0 0 4px var(--bg-surface)",
              }}
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className="font-[JetBrains_Mono] text-[10px] uppercase"
                  style={{ color: isFirst ? "var(--accent)" : "var(--text-tertiary)" }}
                >
                  {formatRelativeDate(item.interactionDate)}
                </span>
                <span
                  className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {typeInfo.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm font-bold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.orgName ?? "Unknown"}
                </span>
                {item.personName && (
                  <span
                    className="text-xs shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.personName}
                  </span>
                )}
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
                {item.teamMember}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
