"use client";

import { useEffect, useState, use } from "react";
import { NotionEditor } from "@/components/editor/notion-editor";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { AiCopilotDrawer } from "@/components/ai-copilot/ai-copilot-drawer";
import type { Editor } from "@tiptap/react";
import { markdownToHtml } from "@/lib/markdown";

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [note, setNote] = useState<any>(null);
  const [parentNote, setParentNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadNote() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);

      // Try backend API first, fallback to Supabase direct
      let data = null;
      try {
        if (session) {
          const res = await apiFetch(
            `/notes/${resolvedParams.id}`,
            session.access_token
          );
          if (res.ok) {
            data = await res.json();
          }
        }
      } catch (err) {
        console.error("Backend fetch failed, trying Supabase direct:", err);
      }

      // Fallback to Supabase client
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

        // Try parsing legacy JSON content format
        try {
          if (content.startsWith("{")) {
            const parsed = JSON.parse(content);
            content = parsed.content || "";
            if (!cover) cover = parsed.cover || "";
            if (!emoji) emoji = parsed.emoji || "";
          }
        } catch (e) {}

        setNote({ ...data, content, cover, emoji });

        // Load parent note for breadcrumbs
        if (data.parent_id && session) {
          try {
            const parentRes = await apiFetch(
              `/notes/${data.parent_id}`,
              session.access_token
            );
            if (parentRes.ok) {
              setParentNote(await parentRes.json());
            }
          } catch {}
        }
      }
      setLoading(false);
    }
    loadNote();
  }, [resolvedParams.id]);

  const handleSave = async (data: {
    title: string;
    content: string;
    cover?: string;
    emoji?: string;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setAccessToken(session.access_token);

    // Store metadata in proper columns now (not JSON-in-content)
    const patchData: any = {
      title: data.title,
      content: data.content,
    };

    // Only include icon/cover if they're being used
    if (data.emoji !== undefined) patchData.icon = data.emoji || null;
    if (data.cover !== undefined) patchData.cover_url = data.cover || null;

    await apiFetch(`/notes/${resolvedParams.id}`, session.access_token, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
  };

  const addMarkdownToNotes = async (markdown: string) => {
    if (!editor) return;
    const html = await markdownToHtml(markdown);

    // Append cleanly at the end with a spacer paragraph.
    const spacer = "<p></p>";
    editor
      .chain()
      .focus()
      .setTextSelection(editor.state.doc.content.size)
      .insertContent(spacer + html)
      .run();
  };

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
          <h3 className="text-lg font-semibold mb-1 text-[var(--t)]">
            Note not found
          </h3>
          <p className="text-sm text-[var(--t2)]">
            This page may have been deleted or moved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto relative">
      <NotionEditor
        noteId={resolvedParams.id}
        initialTitle={note.title}
        initialContent={note.content}
        initialCover={note.cover}
        initialEmoji={note.emoji}
        parentTitle={parentNote?.title}
        onSave={handleSave}
        onEditorReady={setEditor}
      />

      <AiCopilotDrawer
        accessToken={accessToken}
        noteId={resolvedParams.id}
        noteTitle={note.title}
        getNoteText={() => editor?.getText() || ""}
        onAddToNotes={addMarkdownToNotes}
      />
    </div>
  );
}
