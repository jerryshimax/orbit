"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const PRIMARY_NAV = [
  { href: "/brief", icon: "summarize", label: "Brief" },
  { href: "/meetings", icon: "groups", label: "Meetings" },
  { href: "/schedule", icon: "calendar_month", label: "Schedule" },
  { href: "/contacts", icon: "contact_page", label: "Contacts" },
];

const SECONDARY_NAV = [
  { href: "/pipeline", icon: "view_kanban", label: "Pipeline" },
  { href: "/organizations", icon: "corporate_fare", label: "Organizations" },
  { href: "/analytics", icon: "monitoring", label: "Analytics" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();

  const renderNavItem = (item: { href: string; icon: string; label: string }) => {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          isActive ? "font-medium" : "hover:opacity-80"
        )}
        style={{
          background: isActive ? "var(--accent-surface)" : "transparent",
          color: isActive ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        <span
          className="material-symbols-rounded text-[20px]"
          style={
            isActive
              ? { fontVariationSettings: "'FILL' 1" }
              : undefined
          }
        >
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col border-r"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <span
            className="material-symbols-rounded text-sm font-bold"
            style={{ color: "#412d00" }}
          >
            double_arrow
          </span>
        </div>
        <div>
          <div
            className="font-[Manrope] font-extrabold text-sm tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            ORBIT
          </div>
          <div
            className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Graph Intelligence
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div
          className="my-4 mx-2 h-px"
          style={{ background: "var(--border-subtle)" }}
        />

        {/* Secondary Navigation */}
        <div className="space-y-0.5">
          <div
            className="px-3 py-1 text-[10px] font-[Space_Grotesk] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Views
          </div>
          {SECONDARY_NAV.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 border-t text-[11px]"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        CE Fund I — $500M Target
      </div>
    </aside>
  );
}
