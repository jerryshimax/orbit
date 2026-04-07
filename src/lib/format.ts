import { formatDistanceToNow, format } from "date-fns";

export function formatMoney(millions: string | number | null): string {
  if (millions === null || millions === undefined) return "—";
  const n = typeof millions === "string" ? parseFloat(millions) : millions;
  if (isNaN(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  if (n >= 1) return `$${n.toFixed(0)}M`;
  return `$${(n * 1000).toFixed(0)}K`;
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
