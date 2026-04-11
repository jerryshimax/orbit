"use client";

import { useRouter } from "next/navigation";

export function BottomBar() {
  const router = useRouter();

  const buttons = [
    {
      icon: "arrow_back",
      label: "Back",
      onClick: () => router.back(),
    },
    {
      icon: "cloud",
      label: "Cloud",
      accent: true,
      onClick: () => {
        const fab = document.querySelector<HTMLButtonElement>(
          "[data-chat-fab]"
        );
        fab?.click();
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
          className={`flex flex-col items-center justify-center gap-0.5 px-6 py-1 active:scale-95 transition-all duration-150 ${
            (btn as any).accent
              ? "text-[#e9c176]"
              : "text-[#9a8f80] hover:text-[#dfe2eb] active:text-[#e9c176]"
          }`}
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
