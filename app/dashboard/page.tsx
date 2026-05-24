"use client";

import { useEffect, useState } from "react";
import {
  Bird, Plus, FileText, Upload, Brain, Mic,
  HardDrive, ArrowRight, Clock, Sparkles,
  BookOpen, Image, FileType, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useNotesStore, Note, VaultFile } from "@/lib/store";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// File type icon + color mapping
const FILE_TYPE_MAP: Record<string, { icon: any; color: string; label: string }> = {
  pdf: { icon: FileType, color: "var(--danger)", label: "PDF" },
  docx: { icon: FileText, color: "var(--accent)", label: "DOCX" },
  txt: { icon: BookOpen, color: "var(--success)", label: "TXT" },
  image: { icon: Image, color: "var(--accent-2)", label: "Image" },
  screenshot: { icon: Image, color: "var(--accent-3)", label: "Screenshot" },
  scanned_note: { icon: Image, color: "var(--warning)", label: "Scan" },
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const { notes, vaultFiles, setVaultFiles } = useNotesStore();
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase.auth]);

  // Fetch vault files
  useEffect(() => {
    const fetchVault = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const [filesRes, statsRes] = await Promise.all([
          apiFetch("/vault?limit=6", session.access_token),
          apiFetch("/vault/stats", session.access_token),
        ]);
        if (filesRes.ok) setVaultFiles(await filesRes.json());
        if (statsRes.ok) setVaultStats(await statsRes.json());
      } catch {}
    };
    fetchVault();
  }, [supabase.auth]);

  const handleCreateNote = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await apiFetch("/notes", session.access_token, {
      method: "POST",
      body: JSON.stringify({
        workspace_id: user?.email || "default",
        title: "Untitled",
        path: `/${Date.now()}`,
      }),
    });
    if (res.ok) {
      const note = await res.json();
      router.push(`/dashboard/notes/${note.id}`);
    } else {
      setLoading(false);
      alert("Failed to create note");
    }
  };

  const recentNotes = notes
    .filter((n) => !n.deleted_at)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const activeNotes = notes.filter((n) => !n.deleted_at).length;
  const totalFiles = vaultStats?.total || 0;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* ── Header ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-heading text-[28px] font-bold tracking-tight mb-1">
            {greeting}, {firstName}
          </h1>
          <p className="text-[14px] text-[var(--t2)]">
            Your second brain is ready. Here's what's happening.
          </p>
        </motion.div>

        {/* ── Quick Actions ──────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          <motion.button
            variants={item}
            onClick={handleCreateNote}
            disabled={loading}
            className="bento-action-card group"
          >
            <div className="bento-action-icon" style={{ background: "var(--accent-light)" }}>
              <Plus className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="text-[13px] font-semibold text-[var(--t)]">New Note</span>
          </motion.button>

          <motion.button
            variants={item}
            onClick={() => router.push("/dashboard/vault")}
            className="bento-action-card group"
          >
            <div className="bento-action-icon" style={{ background: "rgba(139,92,246,0.12)" }}>
              <Upload className="w-4 h-4 text-[var(--accent-2)]" />
            </div>
            <span className="text-[13px] font-semibold text-[var(--t)]">Upload File</span>
          </motion.button>

          <motion.button
            variants={item}
            onClick={() => router.push("/dashboard/ai")}
            className="bento-action-card group"
          >
            <div className="bento-action-icon" style={{ background: "rgba(245,158,11,0.12)" }}>
              <Brain className="w-4 h-4 text-[var(--accent-3)]" />
            </div>
            <span className="text-[13px] font-semibold text-[var(--t)]">Ask AI</span>
          </motion.button>

          <motion.button
            variants={item}
            onClick={() => {
              router.push("/dashboard/ai");
              useNotesStore.getState().setAiMode("voice");
            }}
            className="bento-action-card group"
          >
            <div className="bento-action-icon" style={{ background: "rgba(77,182,172,0.12)" }}>
              <Mic className="w-4 h-4 text-[var(--success)]" />
            </div>
            <span className="text-[13px] font-semibold text-[var(--t)]">Voice Chat</span>
          </motion.button>
        </motion.div>

        {/* ── Bento Grid ─────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="bento-grid"
        >
          {/* ── Stats Strip ──────────────── */}
          <motion.div variants={item} className="bento-card bento-stats">
            <div className="bento-stat">
              <div className="bento-stat-value">{activeNotes}</div>
              <div className="bento-stat-label">Notes</div>
            </div>
            <div className="bento-stat-divider" />
            <div className="bento-stat">
              <div className="bento-stat-value">{totalFiles}</div>
              <div className="bento-stat-label">Files</div>
            </div>
            <div className="bento-stat-divider" />
            <div className="bento-stat">
              <div className="bento-stat-value">{vaultStats?.pdf || 0}</div>
              <div className="bento-stat-label">PDFs</div>
            </div>
            <div className="bento-stat-divider" />
            <div className="bento-stat">
              <div className="bento-stat-value">{vaultStats?.image || 0}</div>
              <div className="bento-stat-label">Images</div>
            </div>
          </motion.div>

          {/* ── Recent Notes ─────────────── */}
          <motion.div variants={item} className="bento-card bento-recent">
            <div className="bento-card-header">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--t3)]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)]">
                  Recent Notes
                </span>
              </div>
              <button
                onClick={handleCreateNote}
                className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                New <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="bento-card-body">
              {recentNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bird className="w-8 h-8 text-[var(--t3)] mb-3" />
                  <p className="text-[13px] text-[var(--t3)]">No notes yet. Create one!</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                      className="bento-note-row"
                    >
                      <span className="text-[14px] shrink-0">{note.icon || "📄"}</span>
                      <span className="truncate text-[13px] font-medium text-[var(--t)]">
                        {note.title || "Untitled"}
                      </span>
                      <span className="ml-auto text-[11px] text-[var(--t3)] whitespace-nowrap shrink-0">
                        {dayjs(note.updated_at).fromNow()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Knowledge Vault Preview ──── */}
          <motion.div variants={item} className="bento-card bento-vault">
            <div className="bento-card-header">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[var(--t3)]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)]">
                  Knowledge Vault
                </span>
              </div>
              <button
                onClick={() => router.push("/dashboard/vault")}
                className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bento-card-body">
              {vaultFiles.length === 0 ? (
                <button
                  onClick={() => router.push("/dashboard/vault")}
                  className="flex flex-col items-center justify-center py-8 text-center w-full hover:bg-[var(--bg-s)] rounded-lg transition-colors"
                >
                  <Upload className="w-8 h-8 text-[var(--t3)] mb-3" />
                  <p className="text-[13px] text-[var(--t3)]">Upload PDFs, images, docs</p>
                  <p className="text-[11px] text-[var(--t3)] mt-1">Drop files to build your knowledge base</p>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {vaultFiles.slice(0, 4).map((file) => {
                    const typeInfo = FILE_TYPE_MAP[file.file_type] || FILE_TYPE_MAP.txt;
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div
                        key={file.id}
                        className="bento-file-card"
                      >
                        <div
                          className="bento-file-icon"
                          style={{ color: typeInfo.color }}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-medium text-[var(--t)] truncate mt-1.5">
                          {file.file_name}
                        </span>
                        <span className="text-[10px] text-[var(--t3)]">
                          {typeInfo.label} · {(file.file_size / 1024).toFixed(0)}KB
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── AI Brain Card ────────────── */}
          <motion.div variants={item} className="bento-card bento-ai">
            <div className="bento-card-header">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-3)]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)]">
                  AI Brain
                </span>
              </div>
            </div>
            <div className="bento-card-body flex flex-col items-center justify-center py-6 text-center">
              <div className="bento-ai-orb">
                <Brain className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <p className="text-[13px] font-medium text-[var(--t)] mt-4 mb-1">
                Your AI second brain
              </p>
              <p className="text-[11px] text-[var(--t3)] mb-4 max-w-[200px]">
                Chat or talk with AI that remembers everything you've uploaded
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/dashboard/ai")}
                  className="px-4 py-1.5 text-[12px] font-semibold rounded-lg bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] transition-colors"
                >
                  Chat
                </button>
                <button
                  onClick={() => {
                    router.push("/dashboard/ai");
                    useNotesStore.getState().setAiMode("voice");
                  }}
                  className="px-4 py-1.5 text-[12px] font-semibold rounded-lg border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors flex items-center gap-1.5"
                >
                  <Mic className="w-3 h-3" /> Voice
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
