import { formatDistanceToNow, format } from "date-fns";

/**
 * Format a monetary value for display.
 * Auto-detects raw USD (>= 100000) vs millions.
 * - Raw USD: 10000000 → "$10M"
 * - Millions: 500 → "$500M"
 */
export function formatMoney(value: string | number | null): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n) || n === 0) return "$0";

  // Auto-detect: if >= 100,000, treat as raw USD; otherwise treat as millions
  const inMillions = n >= 100000 ? n / 1000000 : n;

  if (inMillions >= 1000) return `$${(inMillions / 1000).toFixed(1)}B`;
  if (inMillions >= 1) return `$${inMillions.toFixed(0)}M`;
  if (inMillions >= 0.001) return `$${(inMillions * 1000).toFixed(0)}K`;
  return "$0";
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function daysSince(date: string | Date | null): number | null {
  if (!date) return null;
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}
