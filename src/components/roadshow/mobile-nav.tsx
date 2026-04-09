"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "summarize", label: "Brief" },
  { href: "/meetings", icon: "groups", label: "Meetings" },
  { href: "/schedule", icon: "calendar_month", label: "Schedule" },
  { href: "/contacts", icon: "contact_page", label: "Contacts" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-slate-950/80 backdrop-blur-2xl z-50 border-t border-[#e9c176]/10 shadow-[0px_-24px_48px_rgba(0,0,0,0.5)] lg:hidden">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center transition-all duration-200 active:opacity-70 ${
              isActive
                ? "text-[#e9c176]"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            <span
              className="material-symbols-outlined mb-1"
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {tab.icon}
            </span>
            <span className="font-[Space_Grotesk] text-[10px] tracking-tight">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TopBar({ title }: { title?: string }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-slate-900/60 backdrop-blur-xl flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#e9c176] absolute transform -translate-x-1">
            double_arrow
          </span>
        </div>
        <span className="text-[#e9c176] text-2xl font-black font-[Manrope] tracking-tighter">
          {title ?? "ORBIT"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:bg-slate-800/50 transition-colors active:scale-95 duration-150">
          <span className="material-symbols-outlined">search</span>
        </button>
        <button className="p-2 text-slate-400 hover:bg-slate-800/50 transition-colors active:scale-95 duration-150">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </header>
  );
}
