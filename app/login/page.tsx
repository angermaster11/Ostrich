"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { OstrichLogo } from "@/components/ostrich-logo";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex-1 flex min-h-[calc(100vh-64px)]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10 bg-[var(--btn)] text-[var(--btn-t)]">
        <div className="flex items-center gap-2">
          <OstrichLogo size={34} />
          <span className="font-heading font-bold">Ostrich - Rangam AI</span>
        </div>

        <div>
          <h2 className="font-heading text-[28px] font-extrabold leading-tight mb-4">
            AI that understands where you are in your workspace.
          </h2>
          <p className="text-sm opacity-60 leading-relaxed mb-8">
            Context-aware intelligence that scales with your knowledge hierarchy.
          </p>
          <div className="flex flex-col gap-2.5">
            {[
              "Hierarchy-aware retrieval",
              "7+ Indian languages",
              "Real-time collaboration",
              "Persistent memory",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13px] opacity-80">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] opacity-30">© 2026 Ostrich - Rangam AI</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          <h1 className="font-heading text-[28px] font-extrabold tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-[var(--t2)] text-sm mb-7">Sign in to your workspace</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t)] text-[13px] font-semibold hover:bg-[var(--bg-s2)] transition-colors mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[var(--brd)]" />
            <span className="text-[11px] text-[var(--t3)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--brd)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="text-[12px] font-semibold mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--input-brd)] bg-[var(--input)] text-[var(--t)] text-[13px] outline-none focus:border-[var(--t3)] transition-colors placeholder:text-[var(--t3)]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-semibold">Password</label>
                <a href="#" className="text-[11px] text-[var(--t3)] hover:text-[var(--t)] transition-colors">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--input-brd)] bg-[var(--input)] text-[var(--t)] text-[13px] outline-none focus:border-[var(--t3)] transition-colors placeholder:text-[var(--t3)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--t)]"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 rounded-lg text-[13px] font-semibold bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[var(--t2)]">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-[var(--t)] hover:underline">
              Create workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
