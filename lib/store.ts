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
  sidebarWidth: parseInt(
    typeof window !== "undefined"
      ? localStorage.getItem("sidebar-width") || "260"
      : "260"
  ),
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

  // ── AI Brain ───────────────────────
  aiMessages: [],
  aiSessionId: null,
  aiStreaming: false,
  aiMode: "chat",
  aiModel: (typeof window !== "undefined" ? localStorage.getItem("ai-model") || "flash" : "flash") as "flash" | "main",
  voiceLanguage: typeof window !== "undefined" ? localStorage.getItem("voice-language") || "hi-IN" : "hi-IN",
  voiceSpeaker: typeof window !== "undefined" ? localStorage.getItem("voice-speaker") || "anushka" : "anushka",
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
