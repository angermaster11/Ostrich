"use client";

import { create } from "zustand";

export interface Note {
  id: string;
  workspace_id: string;
  title: string;
  content: string | null;
  parent_id: string | null;
  icon: string | null;
  cover_url: string | null;
  is_favorite: boolean;
  is_locked?: boolean;
  deleted_at: string | null;
  position: number;
  path: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface VaultFile {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  file_type: string;
  processing_status: string;
  thumbnail_url: string | null;
  tags: string[];
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
  created_at: string;
}

export interface FeedPost {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  content: string | null;
  created_at: string;
  author: { id: string; full_name: string; avatar_url: string | null };
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  follow_status: { id: string; status: "pending" | "accepted" } | null;
}

interface AppState {
  // ── Notes ──────────────────────────
  notes: Note[];
  activeNoteId: string | null;
  saving: boolean;
  lastSaved: Date | null;
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date | null) => void;

  // ── Sidebar ────────────────────────
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarExpanded: boolean;
  searchOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  // ── Vault ──────────────────────────
  vaultFiles: VaultFile[];
  vaultLoading: boolean;
  uploadModalOpen: boolean;
  setVaultFiles: (files: VaultFile[]) => void;
  addVaultFile: (file: VaultFile) => void;
  removeVaultFile: (id: string) => void;
  setVaultLoading: (loading: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;

  // ── Feed cache ─────────────────────
  feedFollowing: FeedPost[];
  feedExplore: FeedPost[];
  feedFollowingOffset: number;
  feedExploreOffset: number;
  feedFollowingHasMore: boolean;
  feedExploreHasMore: boolean;
  feedLastFetch: { following: number; explore: number };
  setFeedPosts: (tab: "following" | "explore", posts: FeedPost[], offset: number, hasMore: boolean) => void;
  appendFeedPosts: (tab: "following" | "explore", posts: FeedPost[], offset: number, hasMore: boolean) => void;
  updateFeedPost: (postId: string, updates: Partial<FeedPost>) => void;
  removeFeedPost: (postId: string) => void;
  setFeedLastFetch: (tab: "following" | "explore") => void;

  // ── AI Brain ───────────────────────
  aiMessages: ChatMessage[];
  aiSessionId: string | null;
  aiStreaming: boolean;
  aiMode: "chat" | "voice";
  aiModel: "flash" | "main";
  voiceLanguage: string;
  voiceSpeaker: string;
  setAiMessages: (msgs: ChatMessage[]) => void;
  addAiMessage: (msg: ChatMessage) => void;
  updateLastAiMessage: (content: string) => void;
  appendLastAiMessage: (delta: string) => void;
  setAiSessionId: (id: string | null) => void;
  setAiStreaming: (streaming: boolean) => void;
  setAiMode: (mode: "chat" | "voice") => void;
  setAiModel: (model: "flash" | "main") => void;
  setVoiceLanguage: (lang: string) => void;
  setVoiceSpeaker: (speaker: string) => void;
  clearAiChat: () => void;
}

export const useNotesStore = create<AppState>((set) => ({
  // ── Notes ──────────────────────────
  notes: [],
  activeNoteId: null,
  saving: false,
  lastSaved: null,
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
    })),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setSaving: (saving) => set({ saving }),
  setLastSaved: (date) => set({ lastSaved: date }),

  // ── Sidebar ────────────────────────
  sidebarOpen: true,
  sidebarWidth: 260,
  sidebarExpanded: false,
  searchOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (width) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-width", String(width));
    }
    set({ sidebarWidth: width });
  },
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

  // ── Vault ──────────────────────────
  vaultFiles: [],
  vaultLoading: false,
  uploadModalOpen: false,
  setVaultFiles: (files) => set({ vaultFiles: files }),
  addVaultFile: (file) => set((s) => ({ vaultFiles: [file, ...s.vaultFiles] })),
  removeVaultFile: (id) =>
    set((s) => ({
      vaultFiles: s.vaultFiles.filter((f) => f.id !== id),
    })),
  setVaultLoading: (loading) => set({ vaultLoading: loading }),
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),

  // ── Feed cache ─────────────────────
  feedFollowing: [],
  feedExplore: [],
  feedFollowingOffset: 0,
  feedExploreOffset: 0,
  feedFollowingHasMore: true,
  feedExploreHasMore: true,
  feedLastFetch: { following: 0, explore: 0 },
  setFeedPosts: (tab, posts, offset, hasMore) =>
    set(tab === "following"
      ? { feedFollowing: posts, feedFollowingOffset: offset, feedFollowingHasMore: hasMore }
      : { feedExplore: posts, feedExploreOffset: offset, feedExploreHasMore: hasMore }),
  appendFeedPosts: (tab, posts, offset, hasMore) =>
    set((s) => tab === "following"
      ? { feedFollowing: [...s.feedFollowing, ...posts], feedFollowingOffset: offset, feedFollowingHasMore: hasMore }
      : { feedExplore: [...s.feedExplore, ...posts], feedExploreOffset: offset, feedExploreHasMore: hasMore }),
  updateFeedPost: (postId, updates) =>
    set((s) => ({
      feedFollowing: s.feedFollowing.map((p) => p.id === postId ? { ...p, ...updates } : p),
      feedExplore: s.feedExplore.map((p) => p.id === postId ? { ...p, ...updates } : p),
    })),
  removeFeedPost: (postId) =>
    set((s) => ({
      feedFollowing: s.feedFollowing.filter((p) => p.id !== postId),
      feedExplore: s.feedExplore.filter((p) => p.id !== postId),
    })),
  setFeedLastFetch: (tab) =>
    set((s) => ({ feedLastFetch: { ...s.feedLastFetch, [tab]: Date.now() } })),

  // ── AI Brain ───────────────────────
  aiMessages: [],
  aiSessionId: null,
  aiStreaming: false,
  aiMode: "chat",
  aiModel: "flash" as "flash" | "main",
  voiceLanguage: "hi-IN",
  voiceSpeaker: "anushka",
  setAiMessages: (msgs) => set({ aiMessages: msgs }),
  addAiMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),
  updateLastAiMessage: (content) =>
    set((s) => {
      const msgs = [...s.aiMessages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content,
        };
      }
      return { aiMessages: msgs };
    }),
  appendLastAiMessage: (delta: string) =>
    set((s) => {
      const msgs = [...s.aiMessages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: (msgs[msgs.length - 1].content || "") + delta,
        };
      }
      return { aiMessages: msgs };
    }),
  setAiSessionId: (id) => set({ aiSessionId: id }),
  setAiStreaming: (streaming) => set({ aiStreaming: streaming }),
  setAiMode: (mode) => set({ aiMode: mode }),
  setAiModel: (model) => { localStorage.setItem("ai-model", model); set({ aiModel: model }); },
  setVoiceLanguage: (lang) => { localStorage.setItem("voice-language", lang); set({ voiceLanguage: lang }); },
  setVoiceSpeaker: (speaker) => { localStorage.setItem("voice-speaker", speaker); set({ voiceSpeaker: speaker }); },
  clearAiChat: () => set({ aiMessages: [], aiSessionId: null }),
}));
