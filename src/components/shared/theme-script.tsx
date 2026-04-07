// Inline script to prevent flash of wrong theme on page load.
// This is a static string — no user input, no XSS risk.
const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem("orbit-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}})()`;

export function ThemeScript() {
  return <script>{THEME_INIT_SCRIPT}</script>;
}
