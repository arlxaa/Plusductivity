"use client";

import { useEffect, useState } from "react";

const KEY = "plusductivity-theme";

// Dark is the default brand look; light is a soft paper mode.
// Persists in localStorage; a blocking script in layout.tsx applies it pre-paint.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) === "light" ? "light" : "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("light", saved === "light");
    setReady(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle("light", next === "light");
  }

  if (!ready) return <span className="btn-pill block h-9 w-9 border border-white/15" aria-hidden />;

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="btn-pill grid size-9 place-items-center border border-white/15 text-lg hover:bg-white/10"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
