"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import {
  NavigationProvider,
  useNavigation,
} from "@/components/shared/navigation-provider";
import { EntityProvider } from "@/components/shared/entity-provider";
import { MobileDrawer } from "@/components/shared/mobile-drawer";
import { BottomBar } from "@/components/shared/bottom-bar";
import { TopBar } from "@/components/shared/top-bar";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useNavigation();
  const sidebarWidth = isCollapsed ? 56 : 220;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — only on large screens */}
      <div
        className="hidden lg:block shrink-0 fixed top-0 left-0 bottom-0 z-40 transition-all duration-200"
        style={{ width: sidebarWidth }}
      >
        <Sidebar />
      </div>

      {/* Mobile/tablet drawer overlay */}
      <MobileDrawer />

      {/* Main content */}
      <div
        className="flex-1 min-w-0 transition-all duration-200"
        style={{ marginLeft: undefined }}
      >
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

      {/* Spacer for desktop sidebar — uses dynamic width */}
      <style>{`
        @media (min-width: 1024px) {
          .flex-1.min-w-0 { margin-left: ${sidebarWidth}px; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <EntityProvider>
        <NavigationProvider>
          <DashboardInner>{children}</DashboardInner>
        </NavigationProvider>
      </EntityProvider>
    </Suspense>
  );
}
