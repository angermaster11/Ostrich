"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, FileText, Star, Lock, Unlock,
  ChevronRight, Clock, Loader2,
} from "lucide-react";
import { useNotesStore, Note } from "@/lib/store";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function NotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { notes, addNote, updateNote: storeUpdateNote } = useNotesStore();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const visibleNotes = useMemo(() => {
    const active = notes.filter((n) => !n.deleted_at);
    if (!query.trim()) return active;
    const q = query.toLowerCase();
    return active.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const favoriteNotes = visibleNotes.filter((n) => n.is_favorite);
  const recentNotes = [...visibleNotes]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 6);
  const allNotes = [...visibleNotes].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = (await supabase.auth.getUser()).data.user;
      const res = await apiFetch("/notes", session.access_token, {
        method: "POST",
        body: JSON.stringify({
          workspace_id: user?.email || "default",
          title: "Untitled",
          path: `/${Date.now()}`,
          parent_id: null,
        }),
      });
      if (res.ok) {
        const note = await res.json();
        addNote(note);
        router.push(`/dashboard/notes/${note.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleLock = async (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const newLocked = !note.is_locked;
    storeUpdateNote(note.id, { is_locked: newLocked });
    await apiFetch(`/notes/${note.id}`, session.access_token, {
      method: "PATCH",
      body: JSON.stringify({ is_locked: newLocked }),
    });
  };

  const NoteCard = ({ note }: { note: Note }) => (
    <Link
      href={`/dashboard/notes/${note.id}`}
      className="group relative flex flex-col gap-2 p-4 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)] hover:bg-[var(--bg-s2)] hover:border-[var(--accent)]/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{note.icon || "📄"}</span>
          <span className="font-medium text-[var(--t)] truncate text-[14px]">
            {note.title || "Untitled"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {note.is_favorite && (
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          )}
          <button
            onClick={(e) => toggleLock(e, note)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-s3)] transition-all"
            title={note.is_locked ? "Unlock note" : "Lock note"}
          >
            {note.is_locked ? (
              <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-[var(--t3)]" />
            )}
          </button>
        </div>
      </div>

      {note.content && (
        <p className="text-[12px] text-[var(--t3)] line-clamp-2 leading-relaxed">
          {note.content.replace(/<[^>]*>/g, "").slice(0, 120)}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <Clock className="w-3 h-3 text-[var(--t3)]" />
        <span className="text-[11px] text-[var(--t3)]">
          {dayjs(note.updated_at || note.created_at).fromNow()}
        </span>
        {note.is_locked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--accent)] font-medium">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--t)]">Notes</h1>
          <p className="text-[13px] text-[var(--t3)] mt-0.5">
            {visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t3)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes... (⌘K for quick search)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)] text-[14px] text-[var(--t)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {notes.filter((n) => !n.deleted_at).length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-s2)] flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--t3)]" />
          </div>
          <p className="text-[var(--t2)] font-medium">No notes yet</p>
          <p className="text-[13px] text-[var(--t3)]">
            Create your first note to get started
          </p>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Create Note
          </button>
        </div>
      ) : query ? (
        /* Search results */
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3">
            Results ({visibleNotes.length})
          </h2>
          {visibleNotes.length === 0 ? (
            <p className="text-[var(--t3)] text-[13px] py-8 text-center">
              No notes match "{query}"
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleNotes.map((n) => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Favorites */}
          {favoriteNotes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                Favorites
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoriteNotes.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>
            </section>
          )}

          {/* Recent */}
          <section className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Recent
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentNotes.map((n) => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          </section>

          {/* All notes */}
          {allNotes.length > 6 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                All Notes
              </h2>
              <div className="flex flex-col gap-1">
                {allNotes.map((n) => (
                  <Link
                    key={n.id}
                    href={`/dashboard/notes/${n.id}`}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-s2)] transition-colors"
                  >
                    <span className="text-[16px] shrink-0">{n.icon || "📄"}</span>
                    <span className="flex-1 min-w-0 text-[13px] text-[var(--t)] truncate">
                      {n.title || "Untitled"}
                    </span>
                    {n.is_locked && (
                      <Lock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    )}
                    {n.is_favorite && (
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                    )}
                    <span className="text-[11px] text-[var(--t3)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {dayjs(n.updated_at || n.created_at).fromNow()}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--t3)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
