"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/roadshow", icon: "today", label: "Today" },
  { href: "/roadshow/meetings", icon: "groups", label: "Meetings" },
  { href: "/roadshow/timeline", icon: "timeline", label: "Timeline" },
  { href: "/roadshow/contacts", icon: "people", label: "Contacts" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t safe-area-bottom"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/roadshow"
              ? pathname === "/roadshow"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-tertiary)",
              }}
            >
              <span
                className={cn(
                  "material-symbols-rounded text-[22px]",
                  isActive && "filled"
                )}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
