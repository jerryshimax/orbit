/**
 * Warmth indicator helpers for `people.relationshipStrength` enum.
 *
 * The DB enum is `"strong" | "medium" | "weak" | "cold"` (see
 * `src/db/schema/enums.ts`). We surface this as a 5-step palette in the UI:
 * the four enum values plus an `unknown`/null state, rendered as a small
 * colored dot next to the attendee name on the roadshow meeting prep page.
 *
 * Palette runs red -> amber -> gold to stay consistent with the existing
 * navy/gold roadshow aesthetic (src/app/(dashboard)/roadshow/**). No Tailwind
 * arbitrary-value class — we return a hex string usable in inline styles so
 * Tailwind JIT doesn't need to know these ahead of time.
 */

export type RelationshipStrength = "strong" | "medium" | "weak" | "cold";

export const RELATIONSHIP_STRENGTH_VALUES: readonly RelationshipStrength[] = [
  "strong",
  "medium",
  "weak",
  "cold",
] as const;

const STRENGTH_COLORS: Record<RelationshipStrength, string> = {
  // Gold = closest contact; mirrors CE brand accent #e9c176 used throughout roadshow UI.
  strong: "#e9c176",
  // Amber — warm but not fully gold.
  medium: "#f59e0b",
  // Muted orange — cool signal.
  weak: "#b45309",
  // Red — cold / at risk.
  cold: "#ef4444",
};

const UNKNOWN_COLOR = "#4e4639";

/**
 * Return a hex color for a relationship strength enum value.
 * Accepts nullish/unknown input and returns a muted fallback.
 */
export function strengthToColor(value: unknown): string {
  if (typeof value !== "string") return UNKNOWN_COLOR;
  if ((RELATIONSHIP_STRENGTH_VALUES as readonly string[]).includes(value)) {
    return STRENGTH_COLORS[value as RelationshipStrength];
  }
  return UNKNOWN_COLOR;
}

/**
 * Human label for the warmth state — used for `title`/`aria-label`.
 */
export function strengthToLabel(value: unknown): string {
  if (typeof value !== "string") return "Unknown";
  switch (value) {
    case "strong":
      return "Strong relationship";
    case "medium":
      return "Medium relationship";
    case "weak":
      return "Weak relationship";
    case "cold":
      return "Cold";
    default:
      return "Unknown";
  }
}
