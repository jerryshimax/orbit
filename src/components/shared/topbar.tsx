"use client";

import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Search trigger */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{
          background: "var(--bg-surface-hover)",
          color: "var(--text-tertiary)",
        }}
        onClick={() => {
          // Command palette will be wired up later
          const event = new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
          });
          document.dispatchEvent(event);
        }}
      >
        <span className="material-symbols-rounded text-[18px]">search</span>
        <span>Search LPs, contacts...</span>
        <kbd
          className="ml-4 px-1.5 py-0.5 rounded text-[11px] font-mono"
          style={{
            background: "var(--bg-surface-active)",
            color: "var(--text-tertiary)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{
            background: "var(--accent-surface)",
            color: "var(--accent)",
          }}
        >
          JS
        </div>
      </div>
    </header>
  );
}
