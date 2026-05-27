"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, MessageSquare, Search, ArrowLeft,
  Smile, X,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// ── Lightweight inline emoji picker (no external dep) ─────────
const EMOJI_ROWS = [
  ["😀","😂","😍","🥰","😎","🤔","😢","😡","🤩","🥳"],
  ["👍","👎","❤️","🔥","✨","🎉","💯","🙏","👀","💪"],
  ["😅","🤣","😊","😇","🤗","🫡","😴","🤯","🥸","😤"],
  ["🎂","🍕","🍔","☕","🍺","🎵","📸","🚀","💡","🎯"],
  ["🐶","🐱","🦊","🐻","🐼","🦁","🐸","🐧","🦋","🌸"],
  ["⭐","🌈","🌙","☀️","🌊","🏖️","🏔️","🌿","🍀","🌺"],
];
function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [filter, setFilter] = useState("");
  const allEmojis = EMOJI_ROWS.flat();
  const shown = filter
    ? allEmojis
    : EMOJI_ROWS.flat();
  return (
    <div className="w-[280px] rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--brd)]">
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search emoji..."
          className="w-full text-[12px] bg-transparent text-[var(--t)] outline-none placeholder:text-[var(--t3)]"
        />
      </div>
      <div className="grid grid-cols-10 gap-0.5 p-2 max-h-[200px] overflow-y-auto">
        {shown.map((em, i) => (
          <button
            key={i}
            onClick={() => onSelect(em)}
            className="text-[18px] p-1 rounded hover:bg-[var(--bg-s2)] transition-colors"
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tenor GIF search (free demo key, replace in production) ──
const TENOR_KEY = "LIVDSRZULELA";
async function searchGifs(q: string): Promise<{ id: string; url: string; preview: string }[]> {
  try {
    const r = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=20&media_filter=gif,tinygif`
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results || []).map((item: any) => ({
      id: item.id,
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || "",
      preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || "",
    }));
  } catch { return []; }
}

// ── Types ─────────────────────────────────────────────────────
interface Author { id: string; full_name: string; avatar_url: string | null; }
interface Conversation {
  id: string; participant_a: string; participant_b: string;
  last_message: string | null; last_message_at: string;
  unread_count: number; other: Author;
}
interface Message {
  id: string; sender_id: string; content: string;
  created_at: string; read: boolean; is_gif?: boolean;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, size = "md" }: { user: Author; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-8 h-8 text-[12px]" : size === "lg" ? "w-12 h-12 text-[17px]" : "w-10 h-10 text-[14px]";
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt={user.full_name} className={`${s} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${s} rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white font-bold flex items-center justify-center shrink-0`}>
      {user.full_name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── GIF Picker ────────────────────────────────────────────────
function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending on open
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=tinygif`);
        if (r.ok) {
          const d = await r.json();
          setGifs((d.results || []).map((item: any) => ({
            id: item.id,
            url: item.media_formats?.gif?.url || "",
            preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || "",
          })));
        }
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) return;
      setLoading(true);
      const results = await searchGifs(q);
      setGifs(results);
      setLoading(false);
    }, 500);
  }, [q]);

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl overflow-hidden z-50">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--brd)]">
        <Search className="w-3.5 h-3.5 text-[var(--t3)] shrink-0" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 text-[13px] bg-transparent text-[var(--t)] outline-none placeholder:text-[var(--t3)]"
        />
        <button onClick={onClose} className="p-1 text-[var(--t3)] hover:text-[var(--t)]"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" /></div>
        ) : gifs.length === 0 ? (
          <p className="text-center text-[12px] text-[var(--t3)] pt-8">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g.id} src={g.preview} alt="gif"
                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onSelect(g.url)}
              />
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-[9px] text-[var(--t3)] py-1 border-t border-[var(--brd)]">Powered by Tenor</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Author[]>([]);
  const [searching, setSearching] = useState(false);

  // Emoji / GIF state
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const msgListRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const loadConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await apiFetch("/social/conversations", session.access_token);
      if (res.ok) return (await res.json()) as Conversation[];
    } catch {}
    return [];
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setCurrentUserId(data.user.id);
      const convs = await loadConversations();
      if (convs) {
        setConversations(convs);
        // Auto-open first (most recent) conversation
        if (convs.length > 0) openConversationById(convs[0], convs);
      }
      setLoading(false);
    })();
  }, []);

  const openConversationById = async (conv: Conversation, convList?: Conversation[]) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    setShowEmoji(false);
    setShowGif(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingMsgs(false); return; }
    try {
      const res = await apiFetch(`/social/conversations/${conv.id}/messages`, session.access_token);
      if (res.ok) {
        setMessages(await res.json());
        const list = convList || conversations;
        setConversations(list.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      }
    } catch {} finally { setLoadingMsgs(false); }
  };

  // Real-time incoming messages
  useEffect(() => {
    if (!activeConv?.id) return;
    const channel = supabase
      .channel(`msg:${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dm_messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id !== currentUserId) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id, currentUserId, supabase]);

  // Real-time new conversations
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("conv-updates")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "dm_conversations",
      }, () => { loadConversations().then((c) => { if (c) setConversations(c); }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, supabase, loadConversations]);

  useEffect(() => {
    const el = msgListRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Close emoji/gif when clicking outside
  useEffect(() => {
    if (!showEmoji && !showGif) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-picker]")) {
        setShowEmoji(false);
        setShowGif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji, showGif]);

  const send = async (content?: string, isGif = false) => {
    const msg = content ?? text.trim();
    if (!msg || sending || !activeConv) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      content: msg,
      created_at: new Date().toISOString(),
      read: false,
      is_gif: isGif,
    };
    setMessages((prev) => [...prev, tempMsg]);
    if (!content) setText("");
    setShowEmoji(false);
    setShowGif(false);

    try {
      const res = await apiFetch(`/social/conversations/${activeConv.other.id}/send`, session.access_token, {
        method: "POST",
        body: JSON.stringify({ content: msg }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? { ...saved, is_gif: isGif } : m));
        setConversations((prev) =>
          prev.map((c) => c.id === activeConv.id ? { ...c, last_message: isGif ? "GIF" : msg, last_message_at: saved.created_at } : c)
        );
        if (!activeConv.id) {
          setActiveConv((prev) => prev ? { ...prev, id: saved.conversation_id || "" } : prev);
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      if (!content) setText(msg);
    } finally {
      setSending(false);
    }
  };

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await apiFetch(`/social/users/search?q=${encodeURIComponent(q)}`, session.access_token);
      if (res.ok) setSearchResults(await res.json());
    } catch {} finally { setSearching(false); }
  }, [supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(searchQuery), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchUsers]);

  const startConversationWith = (user: Author) => {
    setSearchQuery("");
    setSearchResults([]);
    const existing = conversations.find((c) => c.other.id === user.id);
    if (existing) { openConversationById(existing); return; }
    const fakeConv: Conversation = {
      id: "", participant_a: currentUserId, participant_b: user.id,
      last_message: null, last_message_at: new Date().toISOString(),
      unread_count: 0, other: user,
    };
    setActiveConv(fakeConv);
    setMessages([]);
  };

  const isGifMessage = (content: string) =>
    content.startsWith("https://media.tenor.com") || content.endsWith(".gif");

  return (
    <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-48px)] flex overflow-hidden"
      style={{ maxHeight: "calc(100vh - 48px)" }}
    >
      {/* ── Sidebar ── */}
      <div className={`w-full md:w-72 shrink-0 border-r border-[var(--brd)] flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-4 border-b border-[var(--brd)]">
          <h1 className="text-[18px] font-bold text-[var(--t)] mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t3)]" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] rounded-xl border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--t3)] transition-colors"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[var(--t3)]" />
            )}
          </div>
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute z-20 left-4 right-4 mt-1 rounded-xl border border-[var(--brd)] bg-[var(--bg)] shadow-xl overflow-hidden"
              >
                {searchResults.map((u: any) => (
                  <button key={u.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-s2)] transition-colors"
                    onClick={() => startConversationWith(u)}
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-[13px] font-medium text-[var(--t)] truncate">{u.full_name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
              <MessageSquare className="w-8 h-8 text-[var(--t3)]" />
              <p className="text-[13px] text-[var(--t3)]">Search for people above to start messaging</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isUnread = conv.unread_count > 0;
              return (
                <button
                  key={conv.id || conv.other.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-s2)] transition-colors border-b border-[var(--brd)] ${
                    activeConv?.id === conv.id || activeConv?.other.id === conv.other.id ? "bg-[var(--bg-s2)]" : ""
                  }`}
                  onClick={() => openConversationById(conv)}
                >
                  <div className="relative shrink-0">
                    <Avatar user={conv.other} size="md" />
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2 border-[var(--bg)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-[13px] truncate ${isUnread ? "font-bold text-[var(--t)]" : "font-medium text-[var(--t2)]"}`}>
                        {conv.other.full_name}
                      </p>
                      <p className="text-[10px] text-[var(--t3)] shrink-0">
                        {dayjs(conv.last_message_at).fromNow()}
                      </p>
                    </div>
                    <p className={`text-[12px] truncate mt-0.5 ${isUnread ? "font-semibold text-[var(--t)]" : "text-[var(--t3)]"}`}>
                      {conv.last_message === "GIF" ? "🎞 GIF" : (conv.last_message || "Start chatting")}
                    </p>
                  </div>
                  {isUnread && (
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!activeConv ? "hidden md:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <MessageSquare className="w-12 h-12 text-[var(--t3)]" />
            <div>
              <p className="text-[16px] font-bold text-[var(--t)]">Your messages</p>
              <p className="text-[13px] text-[var(--t3)] mt-1">Select a conversation or search for someone</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--brd)] shrink-0">
              <button onClick={() => setActiveConv(null)}
                className="md:hidden p-1.5 rounded-lg text-[var(--t3)] hover:bg-[var(--bg-s2)]">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <Avatar user={activeConv.other} size="md" />
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[var(--t)]">{activeConv.other.full_name}</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={msgListRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
              {loadingMsgs ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--t3)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 py-10">
                  <p className="text-[13px] text-[var(--t3)]">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === currentUserId;
                  const isGif = m.is_gif || isGifMessage(m.content);
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      {isGif ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.content} alt="gif"
                          className="max-w-[200px] rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(m.content, "_blank")}
                        />
                      ) : (
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words ${
                          isMine
                            ? "bg-[var(--accent)] text-white rounded-br-sm"
                            : "bg-[var(--bg-s)] text-[var(--t)] border border-[var(--brd)] rounded-bl-sm"
                        }`}>
                          {m.content}
                          <p className={`text-[10px] mt-1 ${isMine ? "text-white/70 text-right" : "text-[var(--t3)]"}`}>
                            {dayjs(m.created_at).fromNow()}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="relative shrink-0 border-t border-[var(--brd)]">
              {/* Emoji picker */}
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full left-0 mb-1 z-50" data-picker
                  >
                    <EmojiPicker
                      onSelect={(em) => {
                        setText((t) => t + em);
                        inputRef.current?.focus();
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GIF picker */}
              <AnimatePresence>
                {showGif && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full right-0 mb-1 z-50" data-picker
                  >
                    <GifPicker
                      onSelect={(url) => { send(url, true); setShowGif(false); }}
                      onClose={() => setShowGif(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 px-3 py-3">
                {/* Emoji button */}
                <button
                  onClick={() => { setShowEmoji((v) => !v); setShowGif(false); }}
                  className={`p-2 rounded-xl transition-colors ${showEmoji ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)]"}`}
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* GIF button */}
                <button
                  onClick={() => { setShowGif((v) => !v); setShowEmoji(false); }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${showGif ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--brd2)] text-[var(--t3)] hover:text-[var(--t)] hover:border-[var(--t3)]"}`}
                  title="GIF"
                >
                  GIF
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    if (e.key === "Escape") { setShowEmoji(false); setShowGif(false); }
                  }}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2.5 text-[14px] rounded-full border border-[var(--brd2)] bg-[var(--bg-s)] text-[var(--t)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--t3)] transition-colors"
                />
                <button
                  onClick={() => send()}
                  disabled={!text.trim() || sending}
                  className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
