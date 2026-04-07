"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/roadshow", icon: "flight_takeoff", label: "Roadshow", accent: true },
  { href: "/pipeline", icon: "view_kanban", label: "Pipeline" },
  { href: "/organizations", icon: "corporate_fare", label: "Organizations" },
  { href: "/contacts", icon: "people", label: "Contacts" },
  { href: "/briefing", icon: "strategy", label: "Briefing" },
  { href: "/analytics", icon: "monitoring", label: "Analytics" },
];

export function Sidebar() {
  const pathname = usePathname();

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
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
          style={{ background: "var(--accent)" }}
        >
          O
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Orbit
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Current Equities
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const goldAccent = "accent" in item && item.accent;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "font-medium"
                  : "hover:opacity-80"
              )}
              style={{
                background: isActive
                  ? goldAccent
                    ? "rgba(255, 186, 5, 0.1)"
                    : "var(--accent-surface)"
                  : "transparent",
                color: isActive
                  ? goldAccent
                    ? "#ffba05"
                    : "var(--accent)"
                  : goldAccent
                    ? "#ffba05"
                    : "var(--text-secondary)",
              }}
            >
              <span
                className={cn(
                  "material-symbols-rounded text-[20px]",
                  isActive && "filled"
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 border-t text-[11px]"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        Fund I — $500M Target
      </div>
    </aside>
  );
}
