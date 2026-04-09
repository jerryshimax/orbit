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
      <div className="min-h-screen">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
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
