"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NavigationProvider } from "@/components/shared/navigation-provider";
import { MobileDrawer } from "@/components/shared/mobile-drawer";
import { BottomBar } from "@/components/shared/bottom-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block w-[220px] shrink-0 fixed top-0 left-0 bottom-0 z-40">
          <Sidebar />
        </div>

        {/* Mobile drawer overlay */}
        <MobileDrawer />

        {/* Main content */}
        <div className="flex-1 md:ml-[220px]">
          <DashboardShell>
            <main className="overflow-auto pb-20 md:pb-0">{children}</main>
          </DashboardShell>
        </div>

        {/* Mobile bottom bar — hidden on desktop */}
        <BottomBar />
      </div>
    </NavigationProvider>
  );
}
