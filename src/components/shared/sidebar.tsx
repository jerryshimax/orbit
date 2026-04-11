"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useNavigation } from "./navigation-provider";
import { EntitySwitcher } from "./entity-switcher";

const PRIMARY_NAV = [
  { href: "/focus", icon: "target", label: "Focus" },
  { href: "/calendar", icon: "calendar_month", label: "Calendar" },
  { href: "/meetings", icon: "groups", label: "Meetings" },
  { href: "/recon", icon: "strategy", label: "Recon" },
  { href: "/contacts", icon: "contact_page", label: "Contacts" },
];

const SECONDARY_NAV = [
  { href: "/pipeline", icon: "view_kanban", label: "Pipeline" },
  { href: "/organizations", icon: "corporate_fare", label: "Organizations" },
  { href: "/analytics", icon: "monitoring", label: "Analytics" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useNavigation();

  // In drawer mode (onNavigate provided), never collapse
  const collapsed = onNavigate ? false : isCollapsed;

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
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center rounded-lg text-sm transition-colors",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
          isActive ? "font-medium" : "hover:opacity-80"
        )}
        style={{
          background: isActive ? "var(--accent-surface)" : "transparent",
          color: isActive ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        <span
          className="material-symbols-rounded text-[20px] shrink-0"
          style={
            isActive
              ? { fontVariationSettings: "'FILL' 1" }
              : undefined
          }
        >
          {item.icon}
        </span>
        {!collapsed && item.label}
      </Link>
    );
  };

  return (
    <aside
      className="h-full flex flex-col border-r transition-all duration-200"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border-subtle)",
        width: collapsed ? 56 : "100%",
      }}
    >
      {/* Logo + collapse toggle */}
      <div className={cn("py-5 flex items-center", collapsed ? "px-3 justify-center" : "px-5 gap-2.5")}>
        <button
          onClick={onNavigate ?? toggleCollapsed}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all"
          style={{ background: "var(--accent)" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span
            className="material-symbols-rounded text-sm font-bold transition-transform duration-200"
            style={{
              color: "#412d00",
              transform: collapsed ? "scaleX(1)" : "scaleX(-1)",
            }}
          >
            double_arrow
          </span>
        </button>
        {!collapsed && (
          <Link href="/focus" onClick={onNavigate} className="hover:opacity-80 transition-opacity">
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
          </Link>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className={cn("flex-1 py-2", collapsed ? "px-1.5" : "px-3")}>
        <div className="space-y-0.5">
          {PRIMARY_NAV.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div
          className="my-5 mx-2 h-px"
          style={{ background: "var(--border-subtle)" }}
        />

        {/* Secondary Navigation */}
        <div className="space-y-0.5 opacity-80">
          {SECONDARY_NAV.map(renderNavItem)}
        </div>
      </nav>

      {/* Entity Switcher */}
      <div
        className={cn("border-t", collapsed ? "py-3 px-1.5" : "px-4 py-3")}
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <EntitySwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
