"use client";

export function StatCard({
  label,
  value,
  subtext,
  icon,
  accent,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-sm mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </div>
          <div
            className="text-2xl font-semibold tabular-nums"
            style={{ color: accent ?? "var(--text-primary)" }}
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
