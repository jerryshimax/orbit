"use client";

import { useRouter } from "next/navigation";
import { useNavigation } from "./navigation-provider";

export function BottomBar() {
  const router = useRouter();
  const { toggleSidebar } = useNavigation();

  const buttons = [
    {
      icon: "arrow_back",
      label: "Back",
      onClick: () => router.back(),
    },
    {
      icon: "menu",
      label: "Menu",
      onClick: toggleSidebar,
    },
    {
      icon: "add_circle",
      label: "New",
      onClick: () => {
        // Opens command palette with "new" prefix — dispatches Cmd+K
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      },
    },
    {
      icon: "search",
      label: "Search",
      onClick: () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      },
    },
    {
      icon: "smart_toy",
      label: "Chat",
      onClick: () => {
        // Toggle chat panel — look for the FAB and click it
        const fab = document.querySelector<HTMLButtonElement>(
          "[data-chat-fab]"
        );
        fab?.click();
      },
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t lg:hidden"
      style={{
        background: "rgba(10, 14, 20, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: "var(--border-subtle, #4e4639)",
        paddingTop: "10px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.icon}
          onClick={btn.onClick}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[#9a8f80] hover:text-[#dfe2eb] active:text-[#e9c176] active:scale-95 transition-all duration-150"
        >
          <span className="material-symbols-rounded text-[22px]">
            {btn.icon}
          </span>
          <span className="text-[9px] font-[Space_Grotesk] uppercase tracking-wider">
            {btn.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
