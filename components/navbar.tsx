"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { OstrichLogo } from "./ostrich-logo";

export function Navbar() {
  const pathname = usePathname();
  const isDash = pathname?.startsWith("/dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isDash) {
    return (
      <header className="fixed top-0 inset-x-0 h-12 flex items-center justify-between px-4 z-50 bg-[var(--bg)] border-b border-[var(--brd)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <OstrichLogo size={28} />
          <span className="text-[14px] font-bold font-heading tracking-tight text-[var(--t)]">
            Ostrich - Rangam AI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-16 flex items-center justify-between px-4 md:px-10 z-50 border-b border-[var(--brd)] bg-[var(--header)] backdrop-blur-xl">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <OstrichLogo size={34} />
          <span className="text-[17px] font-bold font-heading tracking-tight">
            Ostrich - Rangam AI
          </span>
        </Link>

        {/* Nav links — desktop */}
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

        {/* Actions — desktop */}
        <div className="hidden md:flex items-center gap-2.5">
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

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 bg-[var(--bg)] md:hidden animate-fadeIn">
          <nav className="flex flex-col p-5 gap-1">
            {["Features", "Pricing", "Docs", "Blog"].map((l) => (
              <a
                key={l}
                href={`/#${l.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-[15px] font-medium text-[var(--t2)] rounded-lg hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
              >
                {l}
              </a>
            ))}
            <div className="h-px bg-[var(--brd)] my-3" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 text-[15px] font-semibold rounded-lg border border-[var(--brd2)] text-[var(--t)] text-center hover:bg-[var(--bg-s2)] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 text-[15px] font-semibold rounded-lg bg-[var(--btn)] text-[var(--btn-t)] text-center hover:bg-[var(--btn-hover)] transition-colors mt-2"
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
