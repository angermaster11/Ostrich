"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, Search, UserPlus, UserCheck,
  Users, Loader2, Bell, X, MoreHorizontal, Trash2, Check,
  MessageSquare, Globe, BookOpen, ArrowLeft, ChevronRight,
} from "lucide-react";
import { useNotesStore, FeedPost } from "@/lib/store";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const LIMIT = 15;
const STALE_MS = 3 * 60 * 1000; // 3 min before re-fetch

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = "following" | "explore";

interface Author { id: string; full_name: string; avatar_url: string | null; }
interface Comment {
  id: string; user_id: string; content: string; created_at: string; author: Author;
}
interface Notification {
  id: string; type: string; actor_id: string; actor: Author;
  entity_id: string; read: boolean; created_at: string;
}
interface SearchUser {
  id: string; full_name: string; avatar_url: string | null;
  follower_count?: number;
  follow_status: { id: string; status: string } | null;
}

// ── Supabase session helper ───────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({
  user, size = "md",
}: { user: Author; size?: "xs" | "sm" | "md" | "lg" }) {
  const s = size === "xs" ? "w-6 h-6 text-[10px]"
    : size === "sm" ? "w-8 h-8 text-[12px]"
    : size === "lg" ? "w-12 h-12 text-[18px]"
    : "w-10 h-10 text-[14px]";
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt={user.full_name}
      className={`${s} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${s} rounded-full shrink-0 font-bold flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white`}>
      {user.full_name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── Follow Button ─────────────────────────────────────────────────────────

function FollowBtn({
  userId, followStatus, onStatusChange, size = "xs",
}: {
  userId: string;
  followStatus: FeedPost["follow_status"];
  onStatusChange: (s: FeedPost["follow_status"]) => void;
  size?: "xs" | "sm";
}) {
  const [loading, setLoading] = useState(false);
  const px = size === "xs" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]";

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      if (followStatus) {
        await apiFetch(`/social/follow/${userId}`, token, { method: "DELETE" });
        onStatusChange(null);
      } else {
        const res = await apiFetch(`/social/follow/${userId}`, token, { method: "POST" });
        if (res.ok) { const d = await res.json(); onStatusChange(d); }
        else if (res.status === 400) {
          // Already following / self-follow — treat as success
          const d = await res.json().catch(() => ({}));
          if (d.id) onStatusChange(d);
        }
      }
    } catch {
      // Backend offline — show brief visual feedback, don't crash
      console.warn("Follow failed: backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  if (followStatus?.status === "accepted")
    return (
      <button onClick={toggle} disabled={loading}
        className={`flex items-center gap-1 ${px} font-medium rounded-lg border border-[var(--brd2)] text-[var(--t2)] hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50`}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
        Following
      </button>
    );
  if (followStatus?.status === "pending")
    return (
      <button onClick={toggle} disabled={loading}
        className={`${px} font-medium rounded-lg border border-[var(--brd2)] text-[var(--t3)] hover:text-[var(--danger)] transition-colors disabled:opacity-50`}>
        Requested
      </button>
    );
  return (
    <button onClick={toggle} disabled={loading}
      className={`flex items-center gap-1 ${px} font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50`}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      Follow
    </button>
  );
}

// ── Read-only Note Viewer ─────────────────────────────────────────────────

function NoteViewer({
  post, onClose, currentUserId,
}: { post: FeedPost; onClose: () => void; currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await apiFetch(`/social/posts/${post.id}/comments`, token);
      if (res.ok) setComments(await res.json());
      setLoadingComments(false);
    })();
  }, [post.id]);

  const sendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    const token = await getToken();
    if (!token) { setSending(false); return; }
    const res = await apiFetch(`/social/posts/${post.id}/comments`, token, {
      method: "POST",
      body: JSON.stringify({ content: commentText.trim() }),
    });
    if (res.ok) { const c = await res.json(); setComments((p) => [...p, c]); setCommentText(""); }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.97 }}
        className="w-full max-w-2xl rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl overflow-hidden mt-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--brd)] sticky top-0 bg-[var(--bg)] z-10">
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Avatar user={post.author} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--t)] truncate">{post.author.full_name}</p>
            <p className="text-[11px] text-[var(--t3)]">{dayjs(post.created_at).fromNow()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          {post.caption && (
            <p className="text-[15px] font-semibold text-[var(--t)] mb-4 leading-snug">{post.caption}</p>
          )}
          {post.title && (
            <h1 className="text-[24px] font-bold text-[var(--t)] mb-4 leading-tight">{post.title}</h1>
          )}
          {post.content && (
            <div
              className="prose prose-sm max-w-none text-[var(--t)] prose-headings:text-[var(--t)] prose-p:text-[var(--t2)] prose-strong:text-[var(--t)] prose-a:text-[var(--accent)] prose-code:text-[var(--accent-2)] prose-pre:bg-[var(--bg-s)] prose-blockquote:border-[var(--accent)] prose-li:text-[var(--t2)]"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </div>

        {/* Comments */}
        <div className="border-t border-[var(--brd)] px-6 py-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3">
            Comments {comments.length > 0 && `(${comments.length})`}
          </p>
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[var(--t3)]" /></div>
          ) : (
            <div className="flex flex-col gap-3 mb-4">
              {comments.length === 0 && (
                <p className="text-[13px] text-[var(--t3)] text-center py-2">No comments yet. Be the first!</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar user={c.author} size="xs" />
                  <div className="flex-1 bg-[var(--bg-s)] rounded-2xl px-3 py-2">
                    <p className="text-[12px] font-bold text-[var(--t)] mb-0.5">{c.author.full_name}</p>
                    <p className="text-[13px] text-[var(--t2)] leading-snug">{c.content}</p>
                    <p className="text-[10px] text-[var(--t3)] mt-1">{dayjs(c.created_at).fromNow()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 text-[13px] rounded-full border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--t3)] transition-colors"
            />
            <button
              onClick={sendComment}
              disabled={!commentText.trim() || sending}
              className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────

function PostCard({
  post, currentUserId, onLike, onDelete, onFollowChange, onOpenDm, onOpen,
}: {
  post: FeedPost; currentUserId: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onFollowChange: (id: string, s: FeedPost["follow_status"]) => void;
  onOpenDm: (u: Author) => void;
  onOpen: (p: FeedPost) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = post.user_id === currentUserId;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--brd)] bg-[var(--bg)] overflow-hidden"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar user={post.author} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[var(--t)] leading-tight truncate">{post.author.full_name}</p>
          <p className="text-[11px] text-[var(--t3)]">{dayjs(post.created_at).fromNow()}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isOwn && (
            <>
              <button
                onClick={() => onOpenDm(post.author)}
                className="p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
                title="Message"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <FollowBtn
                userId={post.user_id}
                followStatus={post.follow_status}
                onStatusChange={(s) => onFollowChange(post.id, s)}
              />
            </>
          )}
          {isOwn && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-9 w-32 rounded-xl border border-[var(--brd)] bg-[var(--bg)] shadow-xl z-30 py-1"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--danger)] hover:bg-red-50/10 transition-colors"
                      onClick={() => { setShowMenu(false); onDelete(post.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Caption + Title — clickable to open full view */}
      <button
        className="w-full text-left px-4 py-2 hover:bg-[var(--bg-s)] transition-colors group"
        onClick={() => onOpen(post)}
      >
        {post.caption && (
          <p className="text-[14px] font-semibold text-[var(--t)] mb-1 leading-snug">{post.caption}</p>
        )}
        {post.title ? (
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-[var(--t)] leading-tight group-hover:text-[var(--accent)] transition-colors">
              {post.title}
            </h3>
            <ChevronRight className="w-4 h-4 text-[var(--t3)] shrink-0 group-hover:text-[var(--accent)] transition-colors" />
          </div>
        ) : (
          !post.caption && (
            <p className="text-[13px] text-[var(--t3)] italic">Tap to read</p>
          )
        )}
        {!post.title && !post.caption && post.content && (
          <p className="text-[13px] text-[var(--t3)] mt-1 line-clamp-1"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/<[^>]+>/g, " ").slice(0, 80) }}
          />
        )}
        {/* Note indicator */}
        {(post.content && post.content.length > 10) && (
          <p className="text-[11px] text-[var(--accent)] mt-1.5 font-medium">
            📄 Tap to read full note
          </p>
        )}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-2 pt-1">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
            post.liked_by_me ? "text-red-500" : "text-[var(--t3)] hover:text-red-500 hover:bg-[var(--bg-s2)]"
          }`}
        >
          <Heart className={`w-4 h-4 transition-all ${post.liked_by_me ? "fill-red-500 scale-110" : ""}`} />
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>
        <button
          onClick={() => onOpen(post)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium text-[var(--t3)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
        </button>
      </div>
    </motion.div>
  );
}

// ── Notification Bell ─────────────────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await apiFetch("/social/notifications/unread-count", token);
        if (res.ok) { const d = await res.json(); setUnread(d.count); }
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, []);

  const openPanel = async () => {
    setOpen(true);
    if (notifs.length > 0) return;
    setLoading(true);
    const token = await getToken();
    if (!token) return;
    try {
      const res = await apiFetch("/social/notifications", token);
      if (res.ok) {
        setNotifs(await res.json());
        if (unread > 0) {
          await apiFetch("/social/notifications/read-all", token, { method: "POST" });
          setUnread(0);
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const accept = async (followId: string, notifId: string) => {
    const token = await getToken();
    if (!token) return;
    await apiFetch(`/social/follow-requests/${followId}/accept`, token, { method: "PATCH" });
    setNotifs((p) => p.map((n) => n.id === notifId ? { ...n, type: "follow_accept_done" } : n));
  };

  const ignore = async (followId: string, notifId: string) => {
    const token = await getToken();
    if (!token) return;
    await apiFetch(`/social/follow-requests/${followId}`, token, { method: "DELETE" });
    setNotifs((p) => p.filter((n) => n.id !== notifId));
  };

  const notifText = (t: string) => ({
    follow: "started following you",
    follow_request: "sent you a follow request",
    follow_accept: "accepted your follow request",
    like: "liked your post",
    comment: "commented on your post",
  }[t] || "interacted with you");

  return (
    <div className="relative">
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute right-0 top-11 w-80 sm:w-96 max-h-[480px] rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl z-40 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--brd)] shrink-0">
                <span className="text-[14px] font-bold text-[var(--t)]">Notifications</span>
                <button onClick={() => setOpen(false)} className="p-1 text-[var(--t3)] hover:text-[var(--t)]"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" /></div>
                ) : notifs.length === 0 ? (
                  <p className="text-center text-[13px] text-[var(--t3)] py-10">No notifications yet</p>
                ) : (
                  notifs.map((n) => (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-s2)] transition-colors ${!n.read ? "bg-[var(--bg-s)]" : ""}`}>
                      <Avatar user={n.actor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[var(--t)] leading-snug">
                          <span className="font-bold">{n.actor?.full_name}</span> {notifText(n.type)}
                        </p>
                        <p className="text-[11px] text-[var(--t3)] mt-0.5">{dayjs(n.created_at).fromNow()}</p>
                        {n.type === "follow_request" && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => accept(n.entity_id, n.id)}
                              className="px-3 py-1 text-[12px] font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90">Accept</button>
                            <button onClick={() => ignore(n.entity_id, n.id)}
                              className="px-3 py-1 text-[12px] font-medium rounded-lg border border-[var(--brd2)] text-[var(--t2)] hover:bg-[var(--bg-s2)]">Ignore</button>
                          </div>
                        )}
                        {n.type === "follow_accept_done" && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--success)] mt-1">
                            <Check className="w-3 h-3" /> Accepted
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── User Search ───────────────────────────────────────────────────────────

function SearchModal({ onClose, onOpenDm }: { onClose: () => void; onOpenDm: (u: Author) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setBackendDown(false); return; }
    setLoading(true);
    setBackendDown(false);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    let found = false;
    try {
      const res = await apiFetch(`/social/users/search?q=${encodeURIComponent(q)}`, token);
      if (res.ok) { setResults(await res.json()); found = true; }
    } catch {
      // Backend down — fall back to direct Supabase query
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url, follower_count, following_count")
          .ilike("full_name", `%${q}%`)
          .neq("id", (await supabase.auth.getUser()).data.user?.id || "")
          .limit(20);
        if (data && data.length > 0) {
          setResults(data.map((u) => ({ ...u, follow_status: null })));
          found = true;
        } else {
          setBackendDown(true);
        }
      } catch {
        setBackendDown(true);
      }
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        className="w-full max-w-md rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--brd)]">
          <Search className="w-4 h-4 text-[var(--t3)] shrink-0" />
          <input autoFocus type="text" placeholder="Search by name or email..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-[14px] bg-transparent text-[var(--t)] outline-none placeholder:text-[var(--t3)]"
          />
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin text-[var(--t3)]" />
            : <button onClick={onClose} className="p-1 text-[var(--t3)] hover:text-[var(--t)]"><X className="w-4 h-4" /></button>
          }
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 && query.trim() && !loading && !backendDown && (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--t3)]">No users found</p>
          )}
          {backendDown && query.trim() && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--danger)] font-medium mb-1">Backend offline</p>
              <p className="text-[11px] text-[var(--t3)]">Start the backend server to enable search & follow</p>
            </div>
          )}
          {!query.trim() && (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--t3)]">Type a name or email to search</p>
          )}
          {results.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-s2)] transition-colors">
              <Avatar user={{ id: user.id, full_name: user.full_name, avatar_url: user.avatar_url }} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--t)] truncate">{user.full_name}</p>
                {(user.follower_count ?? 0) > 0 && (
                  <p className="text-[11px] text-[var(--t3)]">{user.follower_count} followers</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { onOpenDm({ id: user.id, full_name: user.full_name, avatar_url: user.avatar_url }); onClose(); }}
                  className="p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors" title="Message"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <FollowBtn
                  userId={user.id}
                  followStatus={user.follow_status as FeedPost["follow_status"]}
                  onStatusChange={(s) => setResults((p) => p.map((u2) => u2.id === user.id ? { ...u2, follow_status: s } : u2))}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── DM Popup ──────────────────────────────────────────────────────────────

function DmPopup({ user, currentUserId, onClose }: { user: Author; currentUserId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string }[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await apiFetch("/social/conversations", token);
      if (res.ok) {
        const convs = await res.json();
        const c = convs.find((x: any) => x.other?.id === user.id);
        if (c) {
          setConvId(c.id);
          const msgRes = await apiFetch(`/social/conversations/${c.id}/messages`, token);
          if (msgRes.ok) setMessages(await msgRes.json());
        }
      }
    })();
  }, [user.id]);

  useEffect(() => {
    if (!convId) return;
    const ch = supabase.channel(`dm:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${convId}` }, (p) => {
        const m = p.new as any;
        if (m.sender_id !== currentUserId) setMessages((prev) => [...prev, m]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, currentUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const token = await getToken();
    if (!token) { setSending(false); return; }
    const temp = { id: `t${Date.now()}`, sender_id: currentUserId, content: text.trim(), created_at: new Date().toISOString() };
    setMessages((p) => [...p, temp]);
    const t2 = text.trim(); setText("");
    try {
      const res = await apiFetch(`/social/conversations/${user.id}/send`, token, {
        method: "POST", body: JSON.stringify({ content: t2 }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((p) => p.map((m) => m.id === temp.id ? msg : m));
        if (!convId) setConvId(msg.conversation_id);
      }
    } catch {
      // Revert optimistic message if send failed
      setMessages((p) => p.filter((m) => m.id !== temp.id));
      setText(t2);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      className="fixed bottom-4 right-4 w-80 sm:w-96 h-[460px] rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--brd)] shrink-0">
        <Avatar user={user} size="sm" />
        <span className="flex-1 text-[13px] font-bold text-[var(--t)] truncate">{user.full_name}</span>
        <button onClick={onClose} className="p-1 text-[var(--t3)] hover:text-[var(--t)]"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <MessageSquare className="w-6 h-6 text-[var(--t3)]" />
            <p className="text-[12px] text-[var(--t3)]">Start a conversation</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] leading-snug ${mine ? "bg-[var(--accent)] text-white rounded-br-sm" : "bg-[var(--bg-s)] text-[var(--t)] rounded-bl-sm border border-[var(--brd)]"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-3 border-t border-[var(--brd)] shrink-0">
        <input
          type="text" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message..." className="flex-1 px-3 py-2 text-[13px] rounded-full border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--t3)] transition-colors"
        />
        <button onClick={send} disabled={!text.trim() || sending}
          className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 shrink-0">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Feed Page ────────────────────────────────────────────────────────

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>("following");
  const [currentUserId, setCurrentUserId] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [dmUser, setDmUser] = useState<Author | null>(null);
  const [openPost, setOpenPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const store = useNotesStore();
  const posts = tab === "following" ? store.feedFollowing : store.feedExplore;
  const offset = tab === "following" ? store.feedFollowingOffset : store.feedExploreOffset;
  const hasMore = tab === "following" ? store.feedFollowingHasMore : store.feedExploreHasMore;
  const lastFetch = store.feedLastFetch[tab];

  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const supabase = createClient();

  const fetchPosts = useCallback(async (t: Tab, off: number, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!append) setLoading(true); else setLoadingMore(true);

    const token = await getToken();
    if (!token) { fetchingRef.current = false; setLoading(false); return; }

    const endpoint = t === "following"
      ? `/social/feed?limit=${LIMIT}&offset=${off}`
      : `/social/feed/explore?limit=${LIMIT}&offset=${off}`;

    try {
      const res = await apiFetch(endpoint, token);
      if (res.ok) {
        const data: FeedPost[] = await res.json();
        const newOffset = off + data.length;
        const more = data.length === LIMIT;
        if (append) store.appendFeedPosts(t, data, newOffset, more);
        else { store.setFeedPosts(t, data, newOffset, more); store.setFeedLastFetch(t); }
      }
    } catch {} finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Init user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch on tab change — skip if cache is fresh
  useEffect(() => {
    const isStale = Date.now() - lastFetch > STALE_MS;
    const isEmpty = posts.length === 0;
    if (isEmpty || isStale) {
      fetchPosts(tab, 0, false);
    }
  }, [tab]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current?.disconnect();
    if (!hasMore || loading) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current)
          fetchPosts(tab, offset, true);
      },
      { rootMargin: "400px" }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, tab, offset]);

  const handleLike = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    store.updateFeedPost(postId, {
      liked_by_me: !post.liked_by_me,
      like_count: post.liked_by_me ? post.like_count - 1 : post.like_count + 1,
    });
    (async () => {
      const token = await getToken();
      if (token) await apiFetch(`/social/posts/${postId}/like`, token, { method: "POST" });
    })();
  };

  const handleDelete = async (postId: string) => {
    const token = await getToken();
    if (!token) return;
    await apiFetch(`/social/posts/${postId}`, token, { method: "DELETE" });
    store.removeFeedPost(postId);
  };

  const handleFollowChange = (postId: string, status: FeedPost["follow_status"]) => {
    store.updateFeedPost(postId, { follow_status: status });
  };

  const isInitialLoading = loading && posts.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[640px] mx-auto px-4 pt-4 pb-20 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sticky top-0 z-20 py-2 bg-[var(--bg)] -mx-4 px-4">
          <h1 className="font-heading text-[20px] font-bold text-[var(--t)] tracking-tight">Feed</h1>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
              title="Find people"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-s)] border border-[var(--brd)] mb-5">
          {([
            { key: "following", label: "Following", icon: BookOpen },
            { key: "explore", label: "Explore", icon: Globe },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === key
                  ? "bg-[var(--bg)] text-[var(--t)] shadow-sm border border-[var(--brd)]"
                  : "text-[var(--t3)] hover:text-[var(--t2)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
            <span className="text-[13px] text-[var(--t3)]">Loading...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-s)] border border-[var(--brd)] flex items-center justify-center">
              {tab === "following" ? <BookOpen className="w-7 h-7 text-[var(--t3)]" /> : <Globe className="w-7 h-7 text-[var(--t3)]" />}
            </div>
            <div>
              <p className="text-[16px] font-bold text-[var(--t)]">
                {tab === "following" ? "Follow people to see their posts" : "No posts yet"}
              </p>
              <p className="text-[13px] text-[var(--t3)] mt-1">
                {tab === "following" ? "Search for people and follow them" : "Be the first to post something!"}
              </p>
            </div>
            {tab === "following" && (
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                <Users className="w-4 h-4" /> Find people
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onLike={handleLike}
                onDelete={handleDelete}
                onFollowChange={handleFollowChange}
                onOpenDm={setDmUser}
                onOpen={setOpenPost}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-8 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />}
              {!hasMore && posts.length > 0 && (
                <p className="text-[12px] text-[var(--t3)]">You&apos;re all caught up ✓</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Note viewer modal */}
      <AnimatePresence>
        {openPost && (
          <NoteViewer
            post={openPost}
            currentUserId={currentUserId}
            onClose={() => setOpenPost(null)}
          />
        )}
      </AnimatePresence>

      {/* Search modal */}
      <AnimatePresence>
        {showSearch && (
          <SearchModal onClose={() => setShowSearch(false)} onOpenDm={(u) => { setDmUser(u); setShowSearch(false); }} />
        )}
      </AnimatePresence>

      {/* DM popup */}
      <AnimatePresence>
        {dmUser && (
          <DmPopup key={dmUser.id} user={dmUser} currentUserId={currentUserId} onClose={() => setDmUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
