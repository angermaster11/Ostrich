import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Zap,
  Globe,
  Shield,
  Users,
  Mic,
  Check,
  BookOpen,
  FileText,
  Code,
} from "lucide-react";
import { OstrichLogo } from "@/components/ostrich-logo";

const features = [
  {
    icon: Brain,
    title: "Hierarchy-Aware RAG",
    desc: "AI retrieves context based on your exact note position. Current note gets 3× priority — no noise from distant notes.",
  },
  {
    icon: Zap,
    title: "Block Editor",
    desc: "Slash commands, drag-and-drop blocks, cover images, and keyboard-first navigation. Feels like thinking.",
  },
  {
    icon: Mic,
    title: "Voice-First Notes",
    desc: "Speak in Hindi, Tamil, English, or 7 regional languages. Transcribed, structured, and saved automatically.",
  },
  {
    icon: Shield,
    title: "Persistent Memory",
    desc: "Workspace memory that persists across sessions — not just your current chat context.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    desc: "See cursors live. Conflict-free CRDT editing. Share publicly or keep private.",
  },
  {
    icon: Globe,
    title: "Indian Language Support",
    desc: "Hindi, Tamil, Telugu, Bengali — native STT/TTS. No workarounds, built-in from day one.",
  },
];

const stats = [
  { value: "14k+", label: "Active researchers" },
  { value: "98%", label: "Retrieval accuracy" },
  { value: "6 langs", label: "Indian language support" },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-5 pt-24 pb-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t2)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI-Native · Hierarchy-Aware RAG · Multilingual
        </div>

        <h1 className="font-heading text-[clamp(38px,7vw,72px)] font-extrabold leading-[1.05] tracking-[-1.5px] mb-5">
          Your knowledge,
          <br />
          finally connected.
        </h1>

        <p className="text-[clamp(15px,1.8vw,18px)] text-[var(--t2)] max-w-xl mb-10 leading-relaxed">
          Ostrich - Rangam AI is the AI workspace that understands where you are — not just
          what you wrote. Scoped retrieval. Zero hallucination noise.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link
            href="/signup"
            className="group flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-semibold bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] transition-colors"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button className="px-6 py-3 rounded-lg text-[14px] font-semibold border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors">
            Watch demo
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-md">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col p-4 rounded-xl bg-[var(--bg-s)] border border-[var(--brd)]"
            >
              <span className="font-heading text-2xl font-extrabold">{s.value}</span>
              <span className="text-[11px] text-[var(--t3)] mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────── */}
      <section id="features" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[var(--t3)] mb-3">
            What makes Ostrich - Rangam AI different
          </p>
          <h2 className="font-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight">
            Intelligence that knows where you are
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-[var(--brd)] bg-[var(--bg-s)] hover:border-[var(--brd2)] hover:-translate-y-0.5 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-s2)] flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-[var(--t2)]" />
                </div>
                <h3 className="font-heading text-[15px] font-bold mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-[var(--t2)] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ──────────────────────── */}
      <section className="py-24 px-5 border-y border-[var(--brd)] bg-[var(--bg-s)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[var(--t3)] mb-3">
              How it works
            </p>
            <h2 className="font-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight">
              Three steps to flow state
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                n: "01",
                title: "Build your tree",
                desc: "Create workspaces, folders, and notes in infinite depth that mirrors how your brain organizes information.",
              },
              {
                n: "02",
                title: "Write, speak, or paste",
                desc: "Use the block editor, dictate in your language, or paste content. Rangam AI auto-structures everything.",
              },
              {
                n: "03",
                title: "Ask anything, anywhere",
                desc: "Ask AI from inside any note. It retrieves the most relevant context — nothing more, nothing less.",
              },
            ].map((s) => (
              <div key={s.n}>
                <span className="font-heading text-6xl font-extrabold text-[var(--brd2)] select-none block mb-3">
                  {s.n}
                </span>
                <h3 className="font-heading text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-[13px] text-[var(--t2)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────── */}
      <section id="pricing" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[var(--t3)] mb-3">
            Pricing
          </p>
          <h2 className="font-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-[14px] text-[var(--t2)] mt-3 max-w-lg mx-auto">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              name: "Free",
              price: "₹0",
              period: "forever",
              features: ["5 AI searches/week", "3 notes", "1 vault upload", "Community support"],
              cta: "Get started",
              popular: false,
            },
            {
              name: "Starter",
              price: "₹99",
              period: "/month",
              features: ["50 AI searches/week", "Unlimited notes", "10 vault uploads", "Voice mode", "Email support"],
              cta: "Start trial",
              popular: false,
            },
            {
              name: "Pro",
              price: "₹199",
              period: "/month",
              features: ["Unlimited AI searches", "Unlimited notes", "50 vault uploads", "Voice + Memory", "Priority support"],
              cta: "Go Pro",
              popular: true,
            },
            {
              name: "Pro+",
              price: "₹499",
              period: "/month",
              features: ["Everything in Pro", "Unlimited vault", "Advanced RAG", "API access", "Team sharing"],
              cta: "Upgrade",
              popular: false,
            },
            {
              name: "Pro Max",
              price: "₹1,999",
              period: "/month",
              features: ["Everything in Pro+", "White-label", "Custom models", "Dedicated support", "SLA guarantee"],
              cta: "Contact us",
              popular: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-5 rounded-xl border transition-all hover:-translate-y-1 ${
                plan.popular
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/10"
                  : "border-[var(--brd)] bg-[var(--bg-s)]"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)] text-white rounded-full">
                  Popular
                </span>
              )}
              <h3 className="font-heading text-[15px] font-bold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="font-heading text-[28px] font-extrabold">{plan.price}</span>
                <span className="text-[12px] text-[var(--t3)]">{plan.period}</span>
              </div>
              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-[var(--t2)]">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`text-center py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  plan.popular
                    ? "bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)]"
                    : "border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Docs ──────────────────────────────── */}
      <section id="docs" className="py-24 px-5 border-y border-[var(--brd)] bg-[var(--bg-s)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[var(--t3)] mb-3">
              Documentation
            </p>
            <h2 className="font-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight">
              Everything you need to get started
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: BookOpen,
                title: "Getting Started",
                desc: "Create your first workspace, add notes, and start asking AI questions in under 2 minutes.",
                link: "#",
              },
              {
                icon: Code,
                title: "API Reference",
                desc: "Full REST API docs for integrating Ostrich - Rangam AI into your workflow. Auth, RAG, and chat endpoints.",
                link: "#",
              },
              {
                icon: FileText,
                title: "Guides & Tutorials",
                desc: "Step-by-step guides for voice setup, vault organization, memory features, and advanced RAG.",
                link: "#",
              },
            ].map((doc) => {
              const Icon = doc.icon;
              return (
                <a
                  key={doc.title}
                  href={doc.link}
                  className="group p-6 rounded-xl border border-[var(--brd)] bg-[var(--bg)] hover:border-[var(--brd2)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-s2)] flex items-center justify-center mb-4 group-hover:bg-[var(--accent)]/10 transition-colors">
                    <Icon className="w-5 h-5 text-[var(--t2)] group-hover:text-[var(--accent)] transition-colors" />
                  </div>
                  <h3 className="font-heading text-[15px] font-bold mb-1.5">{doc.title}</h3>
                  <p className="text-[13px] text-[var(--t2)] leading-relaxed">{doc.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[12px] font-semibold text-[var(--accent)]">
                    Read more <ArrowRight className="w-3 h-3" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Blog ──────────────────────────────── */}
      <section id="blog" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[var(--t3)] mb-3">
            Blog
          </p>
          <h2 className="font-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight">
            Latest from the team
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            {
              title: "How Hierarchy-Aware RAG eliminates noise",
              excerpt: "Traditional RAG retrieves from everywhere. Rangam AI scopes retrieval to your current position in the knowledge tree.",
              date: "May 20, 2026",
              tag: "Engineering",
            },
            {
              title: "Building voice-first for Indian languages",
              excerpt: "Why we chose Sarvam AI for STT/TTS and how we optimized for sub-second latency across 8 languages.",
              date: "May 15, 2026",
              tag: "Product",
            },
            {
              title: "Memory that persists: beyond chat context",
              excerpt: "How Rangam AI remembers what matters across sessions using semantic embeddings and graceful forgetting.",
              date: "May 10, 2026",
              tag: "AI",
            },
          ].map((post) => (
            <a
              key={post.title}
              href="#"
              className="group flex flex-col p-5 rounded-xl border border-[var(--brd)] bg-[var(--bg-s)] hover:border-[var(--brd2)] hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {post.tag}
                </span>
                <span className="text-[11px] text-[var(--t3)]">{post.date}</span>
              </div>
              <h3 className="font-heading text-[15px] font-bold mb-2 group-hover:text-[var(--accent)] transition-colors">
                {post.title}
              </h3>
              <p className="text-[13px] text-[var(--t2)] leading-relaxed flex-1">{post.excerpt}</p>
              <span className="inline-flex items-center gap-1 mt-4 text-[12px] font-semibold text-[var(--accent)]">
                Read article <ArrowRight className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto rounded-2xl bg-[var(--btn)] p-12 md:p-16 text-center">
          <h2 className="font-heading text-[clamp(24px,4vw,40px)] font-extrabold text-[var(--btn-t)] mb-3 tracking-tight">
            Start building your knowledge graph.
          </h2>
          <p className="text-[var(--btn-t)]/60 mb-8 text-sm">
            Free plan includes 50 AI credits/month. No credit card needed.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-bold bg-[var(--bg)] text-[var(--t)] hover:opacity-90 transition-opacity"
          >
            Create free workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────── */}
      <footer className="border-t border-[var(--brd)] py-10 px-5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OstrichLogo size={28} />
            <span className="font-heading font-bold text-sm">Ostrich - Rangam AI</span>
          </div>
          <div className="flex gap-5 text-[12px] text-[var(--t3)]">
            {["Privacy", "Terms", "Blog", "Contact"].map((l) => (
              <a key={l} href="#" className="hover:text-[var(--t)] transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-[11px] text-[var(--t3)]">© 2026 Ostrich - Rangam AI</p>
        </div>
      </footer>
    </>
  );
}
