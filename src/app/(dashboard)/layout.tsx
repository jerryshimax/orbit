"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NavigationProvider } from "@/components/shared/navigation-provider";
import { MobileDrawer } from "@/components/shared/mobile-drawer";
import { BottomBar } from "@/components/shared/bottom-bar";
import { TopBar } from "@/components/shared/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar — only on large screens */}
        <div className="hidden lg:block w-[220px] shrink-0 fixed top-0 left-0 bottom-0 z-40">
          <Sidebar />
        </div>

        {/* Mobile/tablet drawer overlay */}
        <MobileDrawer />

        {/* Main content */}
        <div className="flex-1 min-w-0 lg:ml-[220px]">
          {/* Top bar with hamburger — visible below lg */}
          <TopBar />

          <DashboardShell>
            <main className="overflow-x-hidden pt-14 lg:pt-0 pb-20 lg:pb-0">
              {children}
            </main>
          </DashboardShell>
        </div>

        {/* Bottom bar — visible below lg */}
        <BottomBar />
      </div>
    </NavigationProvider>
  );
}
