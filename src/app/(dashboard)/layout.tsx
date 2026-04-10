"use client";

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
  return (
    <ChatProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar — always visible */}
        <div style={{ width: 220, flexShrink: 0, position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40 }}>
          <Sidebar />
        </div>

        {/* Main content — always pushed right */}
        <div style={{ marginLeft: 220, flex: 1 }}>
          <main className="overflow-auto">{children}</main>
        </div>

        <CommandPalette />
        <ChatFab />
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
