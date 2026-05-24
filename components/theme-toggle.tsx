"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-8 h-8 rounded-full bg-[var(--bg-s2)] animate-pulse" />;

  const dark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="w-8 h-8 rounded-full border border-[var(--brd2)] bg-[var(--bg-s)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-all"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
