"use client";

export function StatCard({
  label,
  value,
  subtext,
  icon,
  accent,
  hero,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: string;
  accent?: string;
  hero?: boolean;
}) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: hero ? "2px solid var(--accent)" : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {label}
          </div>
          <div
            className="font-[Space_Grotesk] text-2xl font-bold tabular-nums"
            style={{ color: accent ?? "var(--accent)" }}
          >
            {value}
          </div>
          {subtext && (
            <div
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {subtext}
            </div>
          )}
        </div>
        <span
          className="material-symbols-rounded text-[24px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
