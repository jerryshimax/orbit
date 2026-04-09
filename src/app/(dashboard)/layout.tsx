"use client";

import { useState, useEffect } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <ChatProvider>
      <div className="min-h-screen">
        {/* Desktop: sidebar always visible */}
        {isDesktop && (
          <div style={{ position: "fixed", zIndex: 40, top: 0, left: 0, bottom: 0 }}>
            <Sidebar />
          </div>
        )}

        {/* Mobile: hamburger + overlay */}
        {!isDesktop && (
          <>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="fixed top-4 left-4 z-50 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--bg-surface-active)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="material-symbols-outlined text-lg" style={{ color: "var(--accent)" }}>
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>

            {mobileOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/40 z-30"
                  onClick={() => setMobileOpen(false)}
                />
                <div style={{ position: "fixed", zIndex: 40, top: 0, left: 0, bottom: 0 }}>
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </div>
              </>
            )}
          </>
        )}

        {/* Main content */}
        <div style={{ marginLeft: isDesktop ? 220 : 0 }}>
          <main className="overflow-auto">{children}</main>
        </div>

        <CommandPalette />
        <ChatFab />
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
