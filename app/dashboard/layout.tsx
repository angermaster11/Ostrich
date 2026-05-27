"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Settings,
  Plus,
  Search,
  Star,
  Trash2,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Rss,
  Brain,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useNotesStore, Note } from "@/lib/store";
import { SearchModal } from "@/components/search-modal";
import { ContextMenu } from "@/components/context-menu";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const navItems = [
  { name: "Feed", href: "/dashboard/feed", icon: Home },
  { name: "Notes", href: "/dashboard/notes", icon: FileText },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "AI Brain", href: "/dashboard/ai", icon: Brain },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [favCollapsed, setFavCollapsed] = useState(false);
  const [privateCollapsed, setPrivateCollapsed] = useState(false);
  const [trashCollapsed, setTrashCollapsed] = useState(true);
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [panelHovered, setPanelHovered] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const {
    notes,
    setNotes,
    addNote,
    updateNote: storeUpdateNote,
    removeNote,
    sidebarOpen,
    sidebarWidth,
    sidebarExpanded,
    toggleSidebar,
    setSidebarWidth,
    setSidebarExpanded,
    searchOpen,
    setSearchOpen,
  } = useNotesStore();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Sync localStorage → store (client-only, after hydration)
  useEffect(() => {
    const w = localStorage.getItem("sidebar-width");
    if (w) setSidebarWidth(parseInt(w));
    const model = localStorage.getItem("ai-model");
    if (model === "flash" || model === "main") useNotesStore.getState().setAiModel(model);
    const lang = localStorage.getItem("voice-language");
    if (lang) useNotesStore.getState().setVoiceLanguage(lang);
    const speaker = localStorage.getItem("voice-speaker");
    if (speaker) useNotesStore.getState().setVoiceSpeaker(speaker);
  }, []);

  // Load user + avatar
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        // Try user_profiles first, fallback to auth metadata
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single();
        const url = profile?.avatar_url || data.user.user_metadata?.avatar_url || null;
        setAvatarUrl(url);
      }
    });
  }, [supabase]);

  // Fetch notes
  useEffect(() => {
    if (!user) return;
    const fetchNotes = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const res = await apiFetch(
          `/notes?workspace_id=${user.email || "default"}`,
          session.access_token
        );
        if (res.ok) {
          setNotes(await res.json());
        }
      } catch (err) {
        console.error("Backend not reachable:", err);
      }
    };
    fetchNotes();
  }, [user, pathname]);

  // Fetch trash
  useEffect(() => {
    if (!user || trashCollapsed) return;
    const fetchTrash = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const res = await apiFetch("/notes/trash", session.access_token);
        if (res.ok) {
          setTrashNotes(await res.json());
        }
      } catch (err) {
        console.error("Trash fetch error:", err);
      }
    };
    fetchTrash();
  }, [user, trashCollapsed]);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  // Sidebar resize
  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(200, e.clientX - 56), 480);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [setSidebarWidth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const handleCreateNote = async (parentId?: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await apiFetch("/notes", session.access_token, {
      method: "POST",
      body: JSON.stringify({
        workspace_id: user?.email || "default",
        title: "Untitled",
        path: `/${Date.now()}`,
        parent_id: parentId || null,
      }),
    });

    if (res.ok) {
      const note = await res.json();
      addNote(note);
      router.push(`/dashboard/notes/${note.id}`);
    }
  };

  const handleNoteAction = async (
    action: string,
    noteId: string
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    switch (action) {
      case "favorite": {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        const newFav = !note.is_favorite;
        storeUpdateNote(noteId, { is_favorite: newFav });
        await apiFetch(`/notes/${noteId}`, session.access_token, {
          method: "PATCH",
          body: JSON.stringify({ is_favorite: newFav }),
        });
        break;
      }
      case "duplicate": {
        const res = await apiFetch(
          `/notes/${noteId}/duplicate`,
          session.access_token,
          { method: "POST" }
        );
        if (res.ok) {
          const dup = await res.json();
          addNote(dup);
          router.push(`/dashboard/notes/${dup.id}`);
        }
        break;
      }
      case "delete": {
        storeUpdateNote(noteId, {
          deleted_at: new Date().toISOString(),
        });
        removeNote(noteId);
        await apiFetch(`/notes/${noteId}`, session.access_token, {
          method: "PATCH",
          body: JSON.stringify({
            deleted_at: new Date().toISOString(),
          }),
        });
        if (pathname === `/dashboard/notes/${noteId}`) {
          router.push("/dashboard");
        }
        break;
      }
      case "restore": {
        await apiFetch(`/notes/${noteId}`, session.access_token, {
          method: "PATCH",
          body: JSON.stringify({ deleted_at: "" }),
        });
        setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
        // Refresh notes list
        const res = await apiFetch(
          `/notes?workspace_id=${user?.email || "default"}`,
          session.access_token
        );
        if (res.ok) setNotes(await res.json());
        break;
      }
      case "permanentDelete": {
        await apiFetch(`/notes/${noteId}`, session.access_token, {
          method: "DELETE",
        });
        setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
        break;
      }
      case "addChild": {
        handleCreateNote(noteId);
        break;
      }
    }
    setContextMenu(null);
  };

  const toggleExpanded = (noteId: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  // Build note tree
  const rootNotes = notes.filter((n) => !n.parent_id && !n.deleted_at);
  const favoriteNotes = notes.filter((n) => n.is_favorite && !n.deleted_at);
  const getChildren = (parentId: string) =>
    notes.filter((n) => n.parent_id === parentId && !n.deleted_at);

  const showPanel = sidebarExpanded || panelHovered;

  const renderNoteItem = (note: Note, depth: number = 0) => {
    const active = pathname === `/dashboard/notes/${note.id}`;
    const children = getChildren(note.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedPages.has(note.id);
    const emoji = note.icon || "📄";

    return (
      <div key={note.id}>
        <div
          className="page-row group relative"
          style={{ paddingLeft: `${12 + depth * 18}px` }}
        >
          {/* Expand toggle — only shown when page has children */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(note.id);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-s2)] transition-colors shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-[var(--t3)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--t3)]" />
              )}
            </button>
          ) : (
            <span className="w-5 h-5 shrink-0" />
          )}

          <Link
            href={`/dashboard/notes/${note.id}`}
            className={`flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1 rounded-md text-[13px] font-medium transition-all ${
              active
                ? "bg-[var(--bg-s3)] text-[var(--t)] border-l-2 border-[var(--accent)]"
                : "text-[var(--t2)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--t)]"
            }`}
          >
            <span className="page-icon shrink-0">{emoji}</span>
            <span className="truncate">{note.title || "Untitled"}</span>
            {note.is_favorite && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0 ml-auto self-center" />
            )}
          </Link>

          {/* Hover actions */}
          <div className="page-hover-menu flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  noteId: note.id,
                });
              }}
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNote(note.id);
              }}
              title="Add sub-page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderNoteItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTrashItem = (note: Note) => (
    <div
      key={note.id}
      className="page-row group relative flex items-center gap-2 px-3 py-1.5"
    >
      <span className="text-sm">{note.icon || "📄"}</span>
      <span className="truncate text-[13px] text-[var(--t2)] flex-1">
        {note.title || "Untitled"}
      </span>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={() => handleNoteAction("restore", note.id)}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-s2)] text-[var(--t2)] hover:text-[var(--t)] transition-colors"
        >
          Restore
        </button>
        <button
          onClick={() => handleNoteAction("permanentDelete", note.id)}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-s2)] text-[var(--danger)] hover:bg-red-500/10 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 mt-12 h-[calc(100vh-48px)] overflow-hidden">
      {/* ── Icon Rail ────────────────────── */}
      <div className="icon-rail shrink-0">
        {/* User avatar */}
        <div className="icon-rail-top">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              className="icon-rail-avatar object-cover"
              title={user?.user_metadata?.full_name || user?.email || "User"}
            />
          ) : (
            <div
              className="icon-rail-avatar"
              title={user?.user_metadata?.full_name || user?.email || "User"}
            >
              {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
            </div>
          )}
        </div>

        {/* Nav icons */}
        <nav className="icon-rail-nav">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`icon-rail-btn ${active ? "active" : ""}`}
                title={item.name}
              >
                <Icon className="w-[18px] h-[18px]" />
              </Link>
            );
          })}

          <div className="icon-rail-divider" />

          <button
            className="icon-rail-btn"
            onClick={() => handleCreateNote()}
            title="New Note"
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>

          <button
            className={`icon-rail-btn ${sidebarExpanded ? "active" : ""}`}
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            title={sidebarExpanded ? "Collapse Panel" : "Expand Panel"}
          >
            {sidebarExpanded ? (
              <PanelLeftClose className="w-[18px] h-[18px]" />
            ) : (
              <PanelLeft className="w-[18px] h-[18px]" />
            )}
          </button>
        </nav>

        {/* Bottom icons */}
        <div className="icon-rail-bottom">
          <Link
            href="/dashboard/settings"
            className={`icon-rail-btn ${pathname?.startsWith("/dashboard/settings") ? "active" : ""}`}
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>

      {/* ── Expandable Notes Panel ─────── */}
      <aside
        ref={sidebarRef}
        className={`notes-panel ${showPanel ? "open" : "closed"}`}
        style={{ width: showPanel ? sidebarWidth : 0 }}
        onMouseEnter={() => setPanelHovered(true)}
        onMouseLeave={() => setPanelHovered(false)}
      >
        <div className="notes-panel-inner" style={{ width: sidebarWidth }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--brd)]">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[var(--t3)]" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)]">
                Pages
              </span>
            </div>
            <button
              onClick={() => handleCreateNote()}
              className="w-6 h-6 rounded flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
              title="New page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-2">
            {/* Favorites */}
            {favoriteNotes.length > 0 && (
              <div className="mb-2">
                <div
                  className="sidebar-section-header"
                  onClick={() => setFavCollapsed(!favCollapsed)}
                >
                  <span className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider flex items-center gap-1">
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${
                        favCollapsed ? "" : "rotate-90"
                      }`}
                    />
                    Favorites
                  </span>
                </div>
                {!favCollapsed && (
                  <nav className="flex flex-col gap-0.5 mt-0.5">
                    {favoriteNotes.map((note) => renderNoteItem(note))}
                  </nav>
                )}
              </div>
            )}

            {/* Private — main notes */}
            <div className="mb-2">
              <div className="sidebar-section-header">
                <span
                  className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  onClick={() => setPrivateCollapsed(!privateCollapsed)}
                >
                  <ChevronRight
                    className={`w-3 h-3 transition-transform ${
                      privateCollapsed ? "" : "rotate-90"
                    }`}
                  />
                  Private
                </span>
                <button
                  onClick={() => handleCreateNote()}
                  className="text-[var(--t3)] hover:text-[var(--t)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {!privateCollapsed && (
                <nav className="flex flex-col gap-0.5 mt-0.5">
                  {rootNotes.map((note) => renderNoteItem(note))}
                  {rootNotes.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-[var(--t3)]">
                      No pages yet
                    </div>
                  )}
                </nav>
              )}
            </div>

            {/* Trash */}
            <div className="mb-2">
              <div
                className="sidebar-section-header"
                onClick={() => setTrashCollapsed(!trashCollapsed)}
              >
                <span className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider flex items-center gap-1">
                  <ChevronRight
                    className={`w-3 h-3 transition-transform ${
                      trashCollapsed ? "" : "rotate-90"
                    }`}
                  />
                  <Trash2 className="w-3 h-3" />
                  Trash
                </span>
              </div>
              {!trashCollapsed && (
                <nav className="flex flex-col gap-0.5 mt-0.5">
                  {trashNotes.map(renderTrashItem)}
                  {trashNotes.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-[var(--t3)]">
                      Trash is empty
                    </div>
                  )}
                </nav>
              )}
            </div>
          </div>
        </div>

        {/* Resize handle */}
        {showPanel && (
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleMouseDown}
          />
        )}
      </aside>

      {/* ── Main content ─────────────── */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)] pb-16 md:pb-0">{children}</main>

      {/* ── Mobile Bottom Nav ────────── */}
      <nav className="fixed bottom-0 inset-x-0 h-14 bg-[var(--bg)] border-t border-[var(--brd)] flex items-center justify-around px-2 z-40 md:hidden">
        {[
          { name: "Feed", href: "/dashboard/feed", icon: Home },
          { name: "Notes", href: "/dashboard/notes", icon: FileText },
          { name: "New", href: "/dashboard/notes", icon: Plus, action: "newNote" },
          { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
          { name: "Settings", href: "/dashboard/settings", icon: Settings },
        ].map((item) => {
          if (item.action === "newNote") {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleCreateNote()}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-medium">New</span>
              </button>
            );
          }
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active ? "text-[var(--accent)]" : "text-[var(--t3)]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Search Modal */}
      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onSelect={(noteId) => {
            setSearchOpen(false);
            router.push(`/dashboard/notes/${noteId}`);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          noteId={contextMenu.noteId}
          note={notes.find((n) => n.id === contextMenu.noteId)!}
          onAction={handleNoteAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
