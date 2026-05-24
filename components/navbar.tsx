"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { OstrichLogo } from "./ostrich-logo";

export function Navbar() {
  const pathname = usePathname();
  const isDash = pathname?.startsWith("/dashboard");

  if (isDash) {
    return (
      <header className="fixed top-0 inset-x-0 h-12 flex items-center justify-between px-4 z-50 bg-[var(--bg)] border-b border-[var(--brd)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <OstrichLogo size={28} />
          <span className="text-[14px] font-bold font-heading tracking-tight text-[var(--t)]">
            Ostrich
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 inset-x-0 h-16 flex items-center justify-between px-6 md:px-10 z-50 border-b border-[var(--brd)] bg-[var(--header)] backdrop-blur-xl">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5">
        <OstrichLogo size={34} />
        <span className="text-[17px] font-bold font-heading tracking-tight">
          Ostrich
        </span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {["Features", "Pricing", "Docs", "Blog"].map((l) => (
          <a
            key={l}
            href={`/#${l.toLowerCase()}`}
            className="px-3.5 py-1.5 text-[13px] font-medium text-[var(--t2)] rounded-md hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
          >
            {l}
          </a>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <Link
          href="/login"
          className="px-4 py-1.5 text-[13px] font-semibold rounded-md border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-4 py-1.5 text-[13px] font-semibold rounded-md bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] transition-colors"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
