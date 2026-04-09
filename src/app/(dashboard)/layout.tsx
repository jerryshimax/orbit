"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { CommandPalette } from "@/components/shared/command-palette";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatFab } from "@/components/chat/chat-fab";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="min-h-screen">
        {/* Hamburger toggle — only visible below lg */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 w-10 h-10 rounded-lg flex items-center justify-center transition-colors lg:hidden"
          style={{
            background: "var(--bg-surface-active)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: "var(--accent)" }}
          >
            {sidebarOpen ? "close" : "menu"}
          </span>
        </button>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — always visible on lg+, overlay on smaller */}
        <div
          className={`
            fixed z-40 transition-transform duration-200
            lg:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Main content — pushed right on desktop */}
        <div className="lg:ml-[220px]">
          <main className="overflow-auto">{children}</main>
        </div>

        <CommandPalette />
        <ChatFab />
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
