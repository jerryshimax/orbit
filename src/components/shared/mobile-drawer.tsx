"use client";

import { useEffect } from "react";
import { useNavigation } from "./navigation-provider";
import { Sidebar } from "./sidebar";

export function MobileDrawer() {
  const { isSidebarOpen, closeSidebar } = useNavigation();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 w-[260px] transition-transform duration-300 ease-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--bg-sidebar, #0a0e14)" }}
      >
        <Sidebar onNavigate={closeSidebar} />
      </div>
    </>
  );
}
