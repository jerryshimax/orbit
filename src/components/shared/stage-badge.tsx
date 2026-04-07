"use client";

import { STAGE_MAP } from "@/lib/constants";

export function StageBadge({ stage }: { stage: string }) {
  const info = STAGE_MAP[stage];
  const color = info?.color ?? "#6b7280";
  const label = info?.label ?? stage;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
