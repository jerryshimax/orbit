"use client";

import { ChatProvider } from "@/components/chat/chat-provider";
import { CommandPalette } from "@/components/shared/command-palette";
import { ChatFab } from "@/components/chat/chat-fab";
import { ChatPanel } from "@/components/chat/chat-panel";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <CommandPalette />
      <ChatFab />
      <ChatPanel />
    </ChatProvider>
  );
}
