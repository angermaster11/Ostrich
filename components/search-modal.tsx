"use client";

import { useEffect, useState, useRef } from "react";
import { Search, FileText, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useNotesStore, Note } from "@/lib/store";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface SearchModalProps {
  onClose: () => void;
  onSelect: (noteId: string) => void;
}

export function SearchModal({ onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { notes } = useNotesStore();

  // Show recent notes by default
  const recentNotes = [...notes]
    .filter((n) => !n.deleted_at)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    )
    .slice(0, 8);

  const displayItems = query.trim() ? results : recentNotes;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await apiFetch(
          `/notes/search?q=${encodeURIComponent(query)}`,
          session.access_token
        );
        if (res.ok) {
          setResults(await res.json());
        }
      } catch (err) {
        console.error("Search error:", err);
        // Fallback: client-side search
        const q = query.toLowerCase();
        setResults(
          notes.filter(
            (n) =>
              !n.deleted_at &&
              (n.title?.toLowerCase().includes(q) ||
                n.content?.toLowerCase().includes(q))
          )
        );
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [displayItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < displayItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : displayItems.length - 1
      );
    } else if (e.key === "Enter" && displayItems[selectedIndex]) {
      onSelect(displayItems[selectedIndex].id);
    }
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-[var(--brd)]">
          <Search className="w-4 h-4 text-[var(--t3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="!border-none !p-3 !px-0"
          />
        </div>

        <div className="search-results">
          {!query.trim() && (
            <div className="px-4 py-2 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
              Recent
            </div>
          )}
          {query.trim() && displayItems.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--t3)]">
              No results found
            </div>
          )}
          {displayItems.map((note, index) => (
            <div
              key={note.id}
              className="search-result-item"
              data-selected={index === selectedIndex}
              onClick={() => onSelect(note.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="icon">{note.icon || "📄"}</span>
              <div className="info">
                <div className="title">{note.title || "Untitled"}</div>
                <div className="meta">
                  {note.updated_at
                    ? dayjs(note.updated_at).fromNow()
                    : dayjs(note.created_at).fromNow()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
