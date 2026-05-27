"use client";

import { useEditor, Editor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExt from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { common, createLowlight } from "lowlight";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Smile,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  Plus,
  Trash2,
  Type,
  Heading1,
  Heading2,
  Palette,
  Send,
  FileText,
  FileImage,
  FilePlus,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useNotesStore } from "@/lib/store";
import { ImageInsertModal } from "./image-insert-modal";
import { CoverModal } from "./cover-modal";
import { CodeBlockComponent } from "./code-block";
import * as Tabs from "@radix-ui/react-tabs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const lowlight = createLowlight(common);

interface EditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  initialCover?: string;
  initialEmoji?: string;
  parentTitle?: string;
  readOnly?: boolean;
  onSave: (data: {
    title: string;
    content: string;
    cover?: string;
    emoji?: string;
  }) => Promise<void>;
  onEditorReady?: (editor: Editor) => void;
  onPost?: (title: string, content: string) => Promise<void>;
  onAddChild?: () => void;
  onUploadAttachment?: (file: File) => Promise<void>;
}

import SlashCommand from "./slash-extension";
import { suggestion } from "./slash-suggestion";

const EMOJI_QUICK_PICKS = [
  "📄", "📝", "📋", "📌", "🎯", "💡", "🚀", "⭐",
  "❤️", "🔥", "💎", "🎨", "📚", "🗂️", "💼", "🧪",
  "🏠", "🌍", "🎵", "📸", "🛠️", "🧠", "✅", "📊",
  "🎉", "💬", "🔗", "📱", "💻", "🌟", "🎓", "🏆",
];

export function NotionEditor({
  noteId,
  initialTitle,
  initialContent,
  initialCover,
  initialEmoji,
  parentTitle,
  readOnly = false,
  onSave,
  onEditorReady,
  onPost,
  onAddChild,
  onUploadAttachment,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [cover, setCover] = useState(initialCover || "");
  const [emoji, setEmoji] = useState(initialEmoji || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showTemplates, setShowTemplates] = useState(
    !initialContent || initialContent === "<p></p>"
  );
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [tableHover, setTableHover] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    visible: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, visible: false });
  const [tableMenu, setTableMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  const titleRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const lastTableCellPosRef = useRef<number | null>(null);
  const lastTableElementRef = useRef<HTMLTableElement | null>(null);
  const { updateNote } = useNotesStore();

  // Auto-focus title on mount for new pages
  useEffect(() => {
    if (
      initialTitle === "Untitled" &&
      (!initialContent || initialContent === "<p></p>")
    ) {
      setTimeout(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      }, 100);
    }
  }, []);

  const performSave = useCallback(
    async (
      newTitle: string,
      newContent: string,
      newCover: string,
      newEmoji: string
    ) => {
      setSaveStatus("saving");
      try {
        await onSave({
          title: newTitle,
          content: newContent,
          cover: newCover,
          emoji: newEmoji,
        });
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        updateNote(noteId, {
          title: newTitle,
          icon: newEmoji || null,
          cover_url: newCover || null,
        });
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("idle");
      }
    },
    [onSave, noteId, updateNote]
  );

  const debouncedSave = useDebouncedCallback(
    (
      newTitle: string,
      newContent: string,
      newCover: string,
      newEmoji: string
    ) => {
      performSave(newTitle, newContent, newCover, newEmoji);
    },
    1000
  );

  const editor = useEditor({
    immediatelyRender: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: "Press '/' for commands, or start typing...",
      }),
      SlashCommand.configure({
        suggestion: {
          ...suggestion,
          command: ({ editor, range, props }: any) => {
            // If the command opens a modal, handle it
            if (props.opensModal === "image") {
              editor.chain().focus().deleteRange(range).run();
              setShowImageModal(true);
              return;
            }
            props.command({ editor, range });
          },
        },
      }),
      ImageExt,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setShowTemplates(html === "<p></p>" || html === "");
      debouncedSave(title, html, cover, emoji);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[500px]",
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          const target = event.target as HTMLElement;
          if (!target) return false;
          const table = target.closest("table");
          if (!table || !editorWrapperRef.current) return false;
          event.preventDefault();
          const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
          setTableMenu({
            x: event.clientX - wrapperRect.left,
            y: event.clientY - wrapperRect.top,
            visible: true,
          });
          return true;
        },
      },
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync readOnly changes at runtime (lock/unlock)
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync metadata changes
  useEffect(() => {
    debouncedSave(title, editor?.getHTML() || "", cover, emoji);
  }, [title, cover, emoji]);

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => setShowAddMenu(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddMenu]);

  // Close pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!editor || !editorWrapperRef.current) return;
    const wrapperElement = editorWrapperRef.current;

    const updateAnchorFromTable = (table: HTMLTableElement, target: HTMLElement) => {
      try {
        const cell = (target.closest("td,th") as HTMLElement | null) ??
          (table.querySelector("td,th") as HTMLElement | null);
        if (!cell) return;
        const pos = editor.view.posAtDOM(cell, 0);
        lastTableCellPosRef.current = Math.max(0, pos + 1);
      } catch {
        // no-op
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.closest('[data-table-control="1"]')) return;
      const table = target?.closest("table");
      if (!table || !editorWrapperRef.current) {
        if (tableHover.visible) {
          setTableHover((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      lastTableElementRef.current = table as HTMLTableElement;
      updateAnchorFromTable(table as HTMLTableElement, target);

      const tableRect = table.getBoundingClientRect();
      const wrapperRect = editorWrapperRef.current.getBoundingClientRect();

      const x = Math.max(0, tableRect.left - wrapperRect.left);
      const y = Math.max(0, tableRect.top - wrapperRect.top);
      const w = Math.max(0, tableRect.width);
      const h = Math.max(0, tableRect.height);

      setTableHover({ x, y, w, h, visible: true });
    };

    const handleMouseLeave = () => {
      setTableHover((prev) => ({ ...prev, visible: false }));
    };

    wrapperElement.addEventListener("mousemove", handleMouseMove);
    wrapperElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      wrapperElement.removeEventListener("mousemove", handleMouseMove);
      wrapperElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, tableHover.visible]);

  const runTableAddRow = () => {
    if (!editor) return;
    const anchorPos = lastTableCellPosRef.current;
    if (typeof anchorPos === "number") {
      editor.chain().focus().setTextSelection(anchorPos).addRowAfter().run();
      return;
    }
    editor.chain().focus().addRowAfter().run();
  };

  const runTableAddColumn = () => {
    if (!editor) return;
    const anchorPos = lastTableCellPosRef.current;
    if (typeof anchorPos === "number") {
      editor.chain().focus().setTextSelection(anchorPos).addColumnAfter().run();
      return;
    }
    editor.chain().focus().addColumnAfter().run();
  };

  useEffect(() => {
    if (!tableMenu.visible) return;
    const closeMenu = () => setTableMenu((prev) => ({ ...prev, visible: false }));
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", handleKey);
    };
  }, [tableMenu.visible]);

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  };

  const handleImageInsert = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
    setShowImageModal(false);
  };

  const addTemplate = (type: string) => {
    if (!editor) return;
    let html = "";
    switch (type) {
      case "journal":
        html = `<h2>Daily Journal</h2><p><strong>Date:</strong> ${dayjs().format("MMMM D, YYYY")}</p><h3>🌅 Morning Intentions</h3><p></p><h3>📝 Today's Notes</h3><p></p><h3>🌙 Evening Reflection</h3><p></p><h3>🙏 Gratitude</h3><ul><li><p></p></li><li><p></p></li><li><p></p></li></ul>`;
        break;
      case "meeting":
        html = `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${dayjs().format("MMMM D, YYYY")}</p><p><strong>Attendees:</strong> </p><h3>📋 Agenda</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Topic 1</p></li><li data-type="taskItem" data-checked="false"><p>Topic 2</p></li></ul><h3>📝 Discussion Notes</h3><p></p><h3>✅ Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul><h3>📅 Next Steps</h3><p></p>`;
        break;
      case "project":
        html = `<h2>Project Plan</h2><h3>🎯 Objective</h3><p></p><h3>📊 Key Results</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>KR 1</p></li><li data-type="taskItem" data-checked="false"><p>KR 2</p></li><li data-type="taskItem" data-checked="false"><p>KR 3</p></li></ul><h3>📅 Timeline</h3><p></p><h3>🚧 Risks & Dependencies</h3><p></p>`;
        break;
      case "techspec":
        html = `<h2>Technical Specification</h2><h3>Overview</h3><p></p><h3>Architecture</h3><p></p><h3>API Design</h3><pre><code>// Endpoint definitions here</code></pre><h3>Data Model</h3><pre><code>// Schema definitions</code></pre><h3>Testing Strategy</h3><ul><li><p>Unit tests</p></li><li><p>Integration tests</p></li><li><p>E2E tests</p></li></ul><h3>Rollout Plan</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Deploy to staging</p></li><li data-type="taskItem" data-checked="false"><p>QA review</p></li><li data-type="taskItem" data-checked="false"><p>Production deploy</p></li></ul>`;
        break;
      case "weekly":
        html = `<h2>Weekly Review — ${dayjs().format("MMM D")}</h2><h3>✅ Wins This Week</h3><ul><li><p></p></li></ul><h3>🔄 In Progress</h3><ul><li><p></p></li></ul><h3>⚠️ Blockers</h3><ul><li><p></p></li></ul><h3>📅 Next Week's Priorities</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Priority 1</p></li><li data-type="taskItem" data-checked="false"><p>Priority 2</p></li><li data-type="taskItem" data-checked="false"><p>Priority 3</p></li></ul>`;
        break;
      case "bug":
        html = `<h2>Bug Report</h2><h3>🐛 Summary</h3><p></p><h3>Steps to Reproduce</h3><ol><li><p>Step 1</p></li><li><p>Step 2</p></li><li><p>Step 3</p></li></ol><h3>Expected Behavior</h3><p></p><h3>Actual Behavior</h3><p></p><h3>Environment</h3><ul><li><p><strong>OS:</strong> </p></li><li><p><strong>Browser:</strong> </p></li><li><p><strong>Version:</strong> </p></li></ul><h3>Priority</h3><p>🔴 High / 🟡 Medium / 🟢 Low</p>`;
        break;
    }
    editor.commands.setContent(html);
    setShowTemplates(false);
  };

  return (
    <div className="w-full relative flex flex-col min-h-[calc(100vh-2rem)]">
      {/* Top Bar — Breadcrumbs + Save Status */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 h-12 bg-[var(--glass)] backdrop-blur-md border-b border-[var(--brd)]">
        <div className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => window.history.back()}
            className="text-[var(--t3)] hover:text-[var(--t)] px-1.5 py-0.5 rounded-md hover:bg-[var(--bg-s2)] transition-colors"
          >
            Home
          </button>
          {parentTitle && (
            <>
              <ChevronRight className="w-3 h-3 text-[var(--t3)] shrink-0" />
              <span className="text-[var(--t3)]">{parentTitle}</span>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-[var(--t3)] shrink-0" />
          <span className="text-[var(--t)] font-medium truncate max-w-[240px]">
            {title || "Untitled"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* + Add Content Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg border border-[var(--brd2)] text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
              title="Add content"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-8 w-48 rounded-xl border border-[var(--brd)] bg-[var(--bg)] shadow-xl z-50 py-1 overflow-hidden">
                {onAddChild && (
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
                    onClick={() => { setShowAddMenu(false); onAddChild(); }}
                  >
                    <FilePlus className="w-4 h-4 text-[var(--accent)]" />
                    New child note
                  </button>
                )}
                {onUploadAttachment && (
                  <>
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
                      onClick={() => { setShowAddMenu(false); imageInputRef.current?.click(); }}
                    >
                      <FileImage className="w-4 h-4 text-[var(--accent-2)]" />
                      Upload image
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
                      onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}
                    >
                      <FileText className="w-4 h-4 text-[var(--accent-3)]" />
                      Upload document
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onUploadAttachment) { onUploadAttachment(f); e.target.value = ""; }
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onUploadAttachment) { onUploadAttachment(f); e.target.value = ""; }
              }}
            />
          </div>

          {/* Post button */}
          {onPost && (
            <button
              disabled={posting}
              onClick={async () => {
                setPosting(true);
                try {
                  await onPost(title, editor?.getHTML() || "");
                } finally {
                  setPosting(false);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post
            </button>
          )}

          <div className="save-status">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--t3)]" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block" />
                <span className="text-[var(--success)]">Saved</span>
              </>
            )}
            {saveStatus === "idle" && lastSavedAt && (
              <span title={lastSavedAt.toLocaleString()}>
                Edited {dayjs(lastSavedAt).fromNow()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image - Full Width */}
      {cover && (
        <div className="cover-container group shrink-0">
          {cover.startsWith("#") || cover.startsWith("rgb") ? (
            <div
              className="w-full h-full"
              style={{ background: cover }}
            />
          ) : (
            <img
              src={cover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-5 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button 
              onClick={() => setShowCoverPicker(true)}
              className="px-3 py-1.5 text-[12px] font-medium bg-black/60 text-white rounded-md hover:bg-black/80 backdrop-blur transition-all"
            >
              Change cover
            </button>
            <button 
              onClick={() => setCover("")}
              className="px-3 py-1.5 text-[12px] font-medium bg-black/60 text-white rounded-md hover:bg-black/80 backdrop-blur transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div
        ref={editorWrapperRef}
        className="max-w-[900px] mx-auto w-full px-12 md:px-24 pt-12 pb-32 flex-1 relative"
      >
        {/* Title & Metadata Area */}
        <div className="relative mb-6 group">
          {!cover && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 mb-4 text-[var(--t3)]">
              <button
                onClick={() => setShowEmojiPicker(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium hover:text-[var(--t)] hover:bg-[var(--bg-s2)] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Smile className="w-3.5 h-3.5" /> Add icon
              </button>
              <button
                onClick={() => setShowCoverPicker(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium hover:text-[var(--t)] hover:bg-[var(--bg-s2)] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Add cover
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            {emoji && (
              <div className="relative group/emoji" ref={emojiRef}>
                <span
                  className="emoji-chip text-5xl cursor-pointer hover:bg-[var(--bg-s2)] rounded-xl p-1.5 transition-colors inline-block"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {emoji}
                </span>
                <button
                  onClick={() => setEmoji("")}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--bg-s2)] rounded-full text-[10px] hidden group-hover/emoji:flex items-center justify-center border border-[var(--brd)] hover:bg-[var(--t)] hover:text-[var(--bg)] transition-colors"
                >
                  ×
                </button>

                {showEmojiPicker && (
                  <div className="emoji-picker-popup absolute top-full left-0 mt-2 bg-[var(--bg-s)] border border-[var(--brd2)] rounded-xl shadow-2xl p-3.5 w-[290px]">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_QUICK_PICKS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setEmoji(e);
                            setShowEmojiPicker(false);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-s2)] text-lg transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setEmoji("");
                        setShowEmojiPicker(false);
                      }}
                      className="mt-2.5 text-xs text-[var(--t3)] hover:text-[var(--t)] transition-colors"
                    >
                      Remove icon
                    </button>
                  </div>
                )}
              </div>
            )}

            {!emoji && showEmojiPicker && (
              <div className="relative" ref={emojiRef}>
                <div className="emoji-picker-popup bg-[var(--bg-s)] border border-[var(--brd2)] rounded-xl shadow-2xl p-3.5 w-[290px]">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_QUICK_PICKS.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-s2)] text-lg transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="w-full text-[40px] font-heading font-extrabold bg-transparent outline-none placeholder:text-[var(--t3)] text-[var(--t)] leading-tight tracking-[-0.02em]"
            />
          </div>
        </div>

        {/* Cover Picker Modal */}
        {showCoverPicker && (
          <CoverModal
            onClose={() => setShowCoverPicker(false)}
            onSelect={(url) => {
              setCover(url);
              setShowCoverPicker(false);
            }}
            onRemove={() => {
              setCover("");
              setShowCoverPicker(false);
            }}
          />
        )}

        {/* Templates */}
        {showTemplates && (
          <div className="mb-12 animate-slideUp">
            <p className="text-[13px] font-medium text-[var(--t3)] mb-5">
              Get started with a template
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: "journal", icon: "📓", title: "Daily Journal", desc: "Reflect on your day.", cat: "Personal" },
                { key: "meeting", icon: "🗓️", title: "Meeting Notes", desc: "Turn meetings into actions.", cat: "Work" },
                { key: "project", icon: "📊", title: "Project Plan", desc: "Plan and track progress.", cat: "Work" },
                { key: "weekly", icon: "📅", title: "Weekly Review", desc: "Review wins & priorities.", cat: "Personal" },
                { key: "techspec", icon: "🧑‍💻", title: "Tech Spec", desc: "Document technical design.", cat: "Dev" },
                { key: "bug", icon: "🐛", title: "Bug Report", desc: "Track and squash bugs.", cat: "Dev" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => addTemplate(t.key)}
                  className="template-card text-left"
                >
                  <span className="text-xl block mb-2">{t.icon}</span>
                  <h4 className="font-semibold text-[13px] mb-0.5 text-[var(--t)]">
                    {t.title}
                  </h4>
                  <p className="text-[12px] text-[var(--t2)]">{t.desc}</p>
                  <span className="text-[10px] text-[var(--t3)] mt-1 inline-block font-medium">
                    {t.cat}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor Body */}
        <div className="relative">
          <EditorContent editor={editor} />

          {editor && (
            <BubbleMenu
              editor={editor}
              shouldShow={({ editor }) => !editor.state.selection.empty}
            >
              <div className="text-format-toolbar">
                <select
                  className="toolbar-select"
                  value={(() => {
                    if (editor.isActive("codeBlock")) return "code";
                    if (editor.isActive("blockquote")) return "quote";
                    if (editor.isActive("taskList")) return "todo";
                    if (editor.isActive("orderedList")) return "ol";
                    if (editor.isActive("bulletList")) return "ul";
                    if (editor.isActive("heading", { level: 1 })) return "h1";
                    if (editor.isActive("heading", { level: 2 })) return "h2";
                    return "p";
                  })()}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "p") {
                      editor.chain().focus().setParagraph().run();
                      return;
                    }
                    if (next === "h1") {
                      editor.chain().focus().setHeading({ level: 1 }).run();
                      return;
                    }
                    if (next === "h2") {
                      editor.chain().focus().setHeading({ level: 2 }).run();
                      return;
                    }
                    if (next === "ul") {
                      if (!editor.isActive("bulletList")) {
                        editor.chain().focus().toggleBulletList().run();
                      }
                      return;
                    }
                    if (next === "ol") {
                      if (!editor.isActive("orderedList")) {
                        editor.chain().focus().toggleOrderedList().run();
                      }
                      return;
                    }
                    if (next === "todo") {
                      if (!editor.isActive("taskList")) {
                        editor.chain().focus().toggleTaskList().run();
                      }
                      return;
                    }
                    if (next === "quote") {
                      if (!editor.isActive("blockquote")) {
                        editor.chain().focus().toggleBlockquote().run();
                      }
                      return;
                    }
                    if (next === "code") {
                      if (!editor.isActive("codeBlock")) {
                        editor.chain().focus().toggleCodeBlock().run();
                      }
                    }
                  }}
                >
                  <option value="p">Turn into: Text</option>
                  <option value="h1">Turn into: Heading 1</option>
                  <option value="h2">Turn into: Heading 2</option>
                  <option value="ul">Turn into: Bulleted list</option>
                  <option value="ol">Turn into: Numbered list</option>
                  <option value="todo">Turn into: To-do list</option>
                  <option value="quote">Turn into: Quote</option>
                  <option value="code">Turn into: Code</option>
                </select>
                <div className="toolbar-divider" />
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive("paragraph") ? "active" : ""}`}
                  onClick={() => editor.chain().focus().setParagraph().run()}
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="toolbar-divider" />
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .setMark("textStyle", { fontFamily: "var(--font-heading)" })
                      .run()
                  }
                >
                  Aa
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .setMark("textStyle", { fontFamily: "var(--font-sans)" })
                      .run()
                  }
                >
                  Sans
                </button>
                <div className="toolbar-divider" />
                <Palette className="w-3.5 h-3.5 text-[var(--t3)]" />
                {[
                  "#E0565B",
                  "#E59F3C",
                  "#2FA76B",
                  "#3E7EFF",
                  "#8B5CF6",
                  "#E5E7EB",
                  "#111111",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="toolbar-color"
                    style={{ background: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
              </div>
            </BubbleMenu>
          )}

          {tableHover.visible && (
            <>
              <button
                type="button"
                data-table-control="1"
                className="table-add-btn"
                style={{
                  left: Math.max(8, tableHover.x + tableHover.w / 2 - 11),
                  top: tableHover.y + tableHover.h + 10,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={runTableAddRow}
                title="Add row"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                data-table-control="1"
                className="table-add-btn"
                style={{
                  left: tableHover.x + tableHover.w + 10,
                  top: Math.max(8, tableHover.y + tableHover.h / 2 - 11),
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={runTableAddColumn}
                title="Add column"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {tableMenu.visible && (
            <div
              className="context-menu"
              style={{ left: tableMenu.x, top: tableMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="context-menu-item"
                onClick={() => {
                  editor?.chain().focus().addRowAfter().run();
                  setTableMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  editor?.chain().focus().addColumnAfter().run();
                  setTableMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add column
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  editor?.chain().focus().deleteRow().run();
                  setTableMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete row
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => {
                  editor?.chain().focus().deleteColumn().run();
                  setTableMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete column
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => {
                  editor?.chain().focus().deleteTable().run();
                  setTableMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete table
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Insert Modal */}
      {showImageModal && (
        <ImageInsertModal
          onInsert={handleImageInsert}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
