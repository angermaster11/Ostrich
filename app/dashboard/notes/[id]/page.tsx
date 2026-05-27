"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { NotionEditor } from "@/components/editor/notion-editor";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import type { Editor } from "@tiptap/react";
import { markdownToHtml } from "@/lib/markdown";
import { useNotesStore } from "@/lib/store";
import {
  FileText, Image as ImageIcon, FileType, X, Loader2,
  CheckCircle, Paperclip, Send, Lock, Unlock, Bot,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  url: string;
  created_at: string;
}

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { addNote, updateNote: storeUpdateNote } = useNotesStore();
  const [note, setNote] = useState<any>(null);
  const [parentNote, setParentNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [postToast, setPostToast] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [pendingPostData, setPendingPostData] = useState<{ title: string; content: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  // Lock state: null = not yet loaded, then true/false
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockSaving, setLockSaving] = useState(false);

  // Copilot panel — only open when user clicks
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadNote() {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);

      let data = null;
      try {
        if (session) {
          const res = await apiFetch(`/notes/${resolvedParams.id}`, session.access_token);
          if (res.ok) data = await res.json();
        }
      } catch (err) {
        console.error("Backend fetch failed, trying Supabase direct:", err);
      }

      if (!data) {
        const { data: supabaseData } = await supabase
          .from("notes")
          .select("*")
          .eq("id", resolvedParams.id)
          .single();
        data = supabaseData;
      }

      if (data) {
        let content = data.content || "";
        let cover = data.cover_url || data.icon_cover || "";
        let emoji = data.icon || "";
        try {
          if (content.startsWith("{")) {
            const parsed = JSON.parse(content);
            content = parsed.content || "";
            if (!cover) cover = parsed.cover || "";
            if (!emoji) emoji = parsed.emoji || "";
          }
        } catch (e) {}
        setNote({ ...data, content, cover, emoji });
        setIsLocked(!!data.is_locked);

        if (data.parent_id && session) {
          try {
            const parentRes = await apiFetch(`/notes/${data.parent_id}`, session.access_token);
            if (parentRes.ok) setParentNote(await parentRes.json());
          } catch {}
        }
      }
      setLoading(false);
    }
    loadNote();
  }, [resolvedParams.id]);

  // Load attachments
  useEffect(() => {
    async function loadAttachments() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await apiFetch(`/notes/${resolvedParams.id}/attachments`, session.access_token);
        if (res.ok) setAttachments(await res.json());
      } catch {}
    }
    loadAttachments();
  }, [resolvedParams.id]);

  const handleSave = async (data: { title: string; content: string; cover?: string; emoji?: string }) => {
    if (isLocked) return; // don't save when locked
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setAccessToken(session.access_token);
    const patchData: any = { title: data.title, content: data.content };
    if (data.emoji !== undefined) patchData.icon = data.emoji || null;
    if (data.cover !== undefined) patchData.cover_url = data.cover || null;
    await apiFetch(`/notes/${resolvedParams.id}`, session.access_token, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
  };

  const handleToggleLock = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const newLocked = !isLocked;
    setLockSaving(true);
    setIsLocked(newLocked);
    storeUpdateNote(resolvedParams.id, { is_locked: newLocked });
    await apiFetch(`/notes/${resolvedParams.id}`, session.access_token, {
      method: "PATCH",
      body: JSON.stringify({ is_locked: newLocked }),
    });
    setLockSaving(false);
  };

  const handlePost = async (title: string, content: string) => {
    setPendingPostData({ title, content });
    setCaption("");
    setShowPostModal(true);
  };

  const submitPost = async () => {
    if (!pendingPostData) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setPosting(true);
    const res = await apiFetch("/social/posts", session.access_token, {
      method: "POST",
      body: JSON.stringify({
        note_id: resolvedParams.id,
        title: pendingPostData.title,
        content: pendingPostData.content,
        caption: caption.trim() || undefined,
      }),
    });
    setPosting(false);
    setShowPostModal(false);
    setPendingPostData(null);
    if (res.ok) {
      setPostToast("Posted to feed!");
      setTimeout(() => setPostToast(null), 3000);
    }
  };

  const handleAddChild = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: { user } } = await supabase.auth.getUser();
    const res = await apiFetch("/notes", session.access_token, {
      method: "POST",
      body: JSON.stringify({
        workspace_id: user?.email || "default",
        title: "Untitled",
        path: `/${Date.now()}`,
        parent_id: resolvedParams.id,
      }),
    });
    if (res.ok) {
      const childNote = await res.json();
      addNote(childNote);
      router.push(`/dashboard/notes/${childNote.id}`);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUploadingFile(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/notes/${resolvedParams.id}/attachments`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
      );
      if (res.ok) {
        const att = await res.json();
        setAttachments((prev) => [...prev, att]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingFile(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await apiFetch(
      `/notes/${resolvedParams.id}/attachments/${attachmentId}`,
      session.access_token, { method: "DELETE" }
    );
    if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // Copilot AI chat
  const handleCopilotSend = async () => {
    if (!copilotInput.trim() || copilotLoading) return;
    const userMsg = copilotInput.trim();
    setCopilotInput("");
    setCopilotMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setCopilotLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const noteText = editor?.getText() || "";
      const res = await apiFetch("/ai/chat", session.access_token, {
        method: "POST",
        body: JSON.stringify({
          message: userMsg,
          context: noteText.slice(0, 3000),
          note_id: resolvedParams.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotMessages((prev) => [...prev, { role: "assistant", content: data.reply || data.content || "..." }]);
      }
    } catch {
      setCopilotMessages((prev) => [...prev, { role: "assistant", content: "Could not connect to AI." }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const addMarkdownToNotes = async (markdown: string) => {
    if (!editor) return;
    const html = await markdownToHtml(markdown);
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent("<p></p>" + html).run();
  };

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function AttachmentIcon({ type }: { type: string }) {
    if (type === "image") return <ImageIcon className="w-4 h-4 text-[var(--accent-2)]" />;
    if (type === "pdf") return <FileType className="w-4 h-4 text-[var(--danger)]" />;
    return <FileText className="w-4 h-4 text-[var(--accent)]" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-8 h-8 border-2 border-[var(--brd2)] border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--t3)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-semibold mb-1 text-[var(--t)]">Note not found</h3>
          <p className="text-sm text-[var(--t2)]">This page may have been deleted or moved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto relative">
      {/* ── Lock/Copilot toolbar ─────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-end gap-2 px-4 py-2 bg-[var(--bg)]/80 backdrop-blur-sm border-b border-[var(--brd)]">
        {isLocked && (
          <span className="text-[11px] font-medium text-[var(--accent)] flex items-center gap-1">
            <Lock className="w-3 h-3" /> Read-only
          </span>
        )}
        <button
          onClick={handleToggleLock}
          disabled={lockSaving}
          title={isLocked ? "Unlock to edit" : "Lock note (read-only)"}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium border transition-all ${
            isLocked
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20"
              : "border-[var(--brd)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {lockSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isLocked ? (
            <><Lock className="w-3.5 h-3.5" /> Locked</>
          ) : (
            <><Unlock className="w-3.5 h-3.5" /> Lock</>
          )}
        </button>

        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          title="AI Copilot"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium border transition-all ${
            copilotOpen
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
              : "border-[var(--brd)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          <Bot className="w-3.5 h-3.5" /> AI
        </button>
      </div>

      {/* ── Post toast ─────────────────────────────────────── */}
      {postToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-semibold shadow-xl">
          <CheckCircle className="w-4 h-4" /> {postToast}
        </div>
      )}

      {/* ── Editor ─────────────────────────────────────────── */}
      <NotionEditor
        noteId={resolvedParams.id}
        initialTitle={note.title}
        initialContent={note.content}
        initialCover={note.cover}
        initialEmoji={note.emoji}
        parentTitle={parentNote?.title}
        readOnly={isLocked}
        onSave={handleSave}
        onEditorReady={setEditor}
        onPost={!isLocked ? handlePost : undefined}
        onAddChild={!isLocked ? handleAddChild : undefined}
        onUploadAttachment={!isLocked ? handleUploadAttachment : undefined}
      />

      {/* ── Attachments ─────────────────────────────────────── */}
      {(attachments.length > 0 || uploadingFile) && (
        <div className="max-w-[900px] mx-auto w-full px-12 md:px-24 pb-8">
          <div className="border-t border-[var(--brd)] pt-6">
            <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--t3)] mb-3">
              <Paperclip className="w-3.5 h-3.5" /> Attachments
            </h4>
            <div className="flex flex-wrap gap-2">
              {uploadingFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brd2)] bg-[var(--bg-s)] text-[13px] text-[var(--t2)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                  <span className="truncate max-w-[140px]">{uploadingFile}</span>
                </div>
              )}
              {attachments.map((att) => (
                <div key={att.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brd)] bg-[var(--bg-s)] hover:border-[var(--brd2)] transition-colors">
                  <AttachmentIcon type={att.file_type} />
                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                    className="text-[13px] text-[var(--t)] hover:text-[var(--accent)] truncate max-w-[140px] transition-colors"
                    title={att.file_name}
                  >
                    {att.file_name}
                  </a>
                  <span className="text-[11px] text-[var(--t3)]">{formatSize(att.file_size)}</span>
                  {!isLocked && (
                    <button onClick={() => handleDeleteAttachment(att.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--t3)] hover:text-[var(--danger)] transition-all ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Copilot side panel ─────────────────────────────── */}
      <AnimatePresence>
        {copilotOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-12 bottom-0 w-80 bg-[var(--bg)] border-l border-[var(--brd)] shadow-xl z-30 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--brd)]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[14px] font-semibold text-[var(--t)]">AI Copilot</span>
              </div>
              <button onClick={() => setCopilotOpen(false)} className="p-1 text-[var(--t3)] hover:text-[var(--t)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {copilotMessages.length === 0 && (
                <p className="text-[12px] text-[var(--t3)] text-center mt-8">
                  Ask me anything about this note, or ask me to help write something.
                </p>
              )}
              {copilotMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-s2)] text-[var(--t)]"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {copilotLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-[var(--bg-s2)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--t3)]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--brd)]">
              {copilotMessages.length > 0 && (
                <button
                  onClick={() => copilotMessages.length > 0 && addMarkdownToNotes(copilotMessages[copilotMessages.length - 1].content)}
                  className="w-full mb-2 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[var(--brd)] text-[var(--t2)] hover:bg-[var(--bg-s2)] transition-colors"
                >
                  Insert last response into note
                </button>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCopilotSend()}
                  placeholder="Ask AI..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)] text-[13px] text-[var(--t)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleCopilotSend}
                  disabled={copilotLoading || !copilotInput.trim()}
                  className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Post Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="w-full max-w-md rounded-2xl border border-[var(--brd)] bg-[var(--bg)] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brd)]">
                <h3 className="text-[15px] font-bold text-[var(--t)]">Share to Feed</h3>
                <button onClick={() => setShowPostModal(false)} className="p-1 text-[var(--t3)] hover:text-[var(--t)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {pendingPostData && (
                <div className="mx-5 mt-4 p-3 rounded-xl border border-[var(--brd)] bg-[var(--bg-s)]">
                  {pendingPostData.title && (
                    <p className="text-[13px] font-semibold text-[var(--t)] mb-1">{pendingPostData.title}</p>
                  )}
                  <p className="text-[12px] text-[var(--t3)] line-clamp-2">
                    {pendingPostData.content?.replace(/<[^>]+>/g, " ").slice(0, 120) || "No content"}
                  </p>
                </div>
              )}

              <div className="px-5 py-4">
                <textarea
                  autoFocus
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption... (optional)"
                  rows={3}
                  className="w-full px-0 py-1 text-[14px] bg-transparent text-[var(--t)] outline-none resize-none placeholder:text-[var(--t3)] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 px-5 pb-4">
                <button
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 text-[13px] font-medium rounded-xl border border-[var(--brd2)] text-[var(--t2)] hover:bg-[var(--bg-s2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPost}
                  disabled={posting}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
