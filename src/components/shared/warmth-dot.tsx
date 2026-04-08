"use client";

import { getWarmthLevel } from "@/lib/constants";

/**
 * Color-coded dot showing relationship warmth based on days since last touch.
 * Hot (green) → Warm (yellow) → Cooling (orange) → Cold (red)
 * Stitch pattern: glow shadow on all states for visual pop.
 */
export function WarmthDot({
  daysSinceTouch,
  showLabel = false,
  size = 8,
}: {
  daysSinceTouch: number | null;
  showLabel?: boolean;
  size?: number;
}) {
  const warmth = getWarmthLevel(daysSinceTouch);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="rounded-full shrink-0"
        style={{
          width: size,
          height: size,
          background: warmth.color,
          boxShadow: warmth.level !== "unknown"
            ? `0 0 8px ${warmth.color}80`
            : undefined,
        }}
      />
      {showLabel && (
        <span
          className="text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          {warmth.label}
          {daysSinceTouch !== null && ` (${daysSinceTouch}d)`}
        </span>
      )}
    </span>
  );
}
