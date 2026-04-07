"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("orbit-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{
        background: "var(--bg-surface-hover)",
        color: "var(--text-secondary)",
      }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="material-symbols-rounded text-[18px]">
        {dark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
