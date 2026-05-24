"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
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

const plans = [
  { id: "free", label: "Free", desc: "50 credits/mo", price: "₹0" },
  { id: "pro", label: "Pro", desc: "2,000 credits/mo", price: "₹499" },
  { id: "team", label: "Team", desc: "Unlimited", price: "₹999" },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [plan, setPlan] = useState("free");
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
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, plan },
      },
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
          <span className="font-heading font-bold">Ostrich</span>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-[2px] uppercase opacity-50 mb-3">
            Why Ostrich?
          </p>
          <h2 className="font-heading text-[28px] font-extrabold leading-tight mb-6">
            Build your second brain — for free.
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { t: "Hierarchy-aware AI", s: "Context scoped to your exact note" },
              { t: "Voice notes in 7 languages", s: "Hindi, Tamil, Telugu, Bengali & more" },
              { t: "Free forever plan", s: "50 AI credits/month, no card" },
              { t: "Real-time collab", s: "See cursors live, share instantly" },
            ].map((item) => (
              <div key={item.t} className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{item.t}</div>
                  <div className="text-[12px] opacity-50">{item.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] opacity-30">No credit card required.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[400px] py-6">
          <h1 className="font-heading text-[28px] font-extrabold tracking-tight mb-1">
            Create workspace
          </h1>
          <p className="text-[var(--t2)] text-sm mb-7">Free forever. No card needed.</p>

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
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[var(--brd)]" />
            <span className="text-[11px] text-[var(--t3)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--brd)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="text-[12px] font-semibold mb-1 block">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--input-brd)] bg-[var(--input)] text-[var(--t)] text-[13px] outline-none focus:border-[var(--t3)] transition-colors placeholder:text-[var(--t3)]"
              />
            </div>
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
              <label className="text-[12px] font-semibold mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
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

            {/* Plan picker */}
            <div>
              <label className="text-[12px] font-semibold mb-2 block">Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`relative p-2.5 rounded-lg border text-left transition-all ${
                      plan === p.id
                        ? "border-[var(--t)] bg-[var(--ring)]"
                        : "border-[var(--input-brd)] bg-[var(--bg-s)] hover:bg-[var(--bg-s2)]"
                    }`}
                  >
                    {plan === p.id && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[var(--btn)] flex items-center justify-center">
                        <Check className="w-2 h-2 text-[var(--btn-t)]" />
                      </div>
                    )}
                    <div className="text-[12px] font-bold">{p.label}</div>
                    <div className="text-[10px] text-[var(--t3)] mt-0.5">{p.desc}</div>
                    <div className="text-[12px] font-semibold mt-1">{p.price}<span className="text-[9px] font-normal opacity-50">/mo</span></div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 rounded-lg text-[13px] font-semibold bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating…" : "Create workspace"}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-[var(--t2)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--t)] hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-3 text-center text-[10px] text-[var(--t3)]">
            By continuing, you agree to our{" "}
            <a href="#" className="underline">Terms</a> and{" "}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
