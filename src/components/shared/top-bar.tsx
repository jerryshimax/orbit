"use client";

import { useNavigation } from "./navigation-provider";

export function TopBar() {
  const { toggleSidebar } = useNavigation();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b lg:hidden"
      style={{
        background: "rgba(10, 14, 20, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="p-2 -ml-2 text-[#9a8f80] hover:text-[#dfe2eb] active:text-[#e9c176] transition-colors"
      >
        <span className="material-symbols-rounded text-[22px]">menu</span>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 ml-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <span
            className="material-symbols-rounded text-xs font-bold"
            style={{ color: "#412d00" }}
          >
            double_arrow
          </span>
        </div>
        <span
          className="font-[var(--font-headline)] font-extrabold text-sm tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          ORBIT
        </span>
      </div>
    </header>
  );
}
