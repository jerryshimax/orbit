"use client";

import Link from "next/link";
import { useNavigation } from "./navigation-provider";

export function TopBar() {
  const { toggleSidebar } = useNavigation();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 border-b lg:hidden"
      style={{
        background: "rgba(10, 14, 20, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: "var(--border-subtle)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center h-14 px-4">
        {/* Gold arrow — opens sidebar drawer */}
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all"
          style={{ background: "var(--accent)" }}
          title="Open sidebar"
        >
          <span
            className="material-symbols-rounded text-sm font-bold"
            style={{ color: "#412d00" }}
          >
            double_arrow
          </span>
        </button>

        {/* Logo text — links to home */}
        <Link
          href="/focus"
          className="font-[var(--font-headline)] font-extrabold text-sm tracking-tight ml-2.5 hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-primary)" }}
        >
          ORBIT
        </Link>
      </div>
    </header>
  );
}
