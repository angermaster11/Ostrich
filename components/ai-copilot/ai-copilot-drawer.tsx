"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronRight, Loader2, Copy, Plus, X, Zap, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AiMarkdown } from "./ai-markdown";
import { getMarkdownSelection, MarkdownSelection } from "./selection";
import { useNotesStore } from "@/lib/store";

type Source = { title: string; url: string };

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; sources?: Source[] };

type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function parseSseEvent(raw: string): { event: string; data: unknown } | null {
  const lines = raw.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

export function AiCopilotDrawer({
  accessToken,
  noteId,
  noteTitle,
  getNoteText,
  onAddToNotes,
}: {
  accessToken: string | null;
  noteId?: string;
  noteTitle?: string;
  getNoteText?: () => string;
  onAddToNotes: (markdown: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSelection, setActiveSelection] = useState<
    (MarkdownSelection & { messageId: string }) | null
  >(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const canSend = useMemo(() => !!input.trim() && !loading, [input, loading]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    if (!shouldAutoScrollRef.current) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const updateAutoScrollIntent = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!accessToken) {
        setSessionId(null);
        setMessages([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const qs = noteId ? `?note_id=${encodeURIComponent(noteId)}` : "";
        const res = await apiFetch(`/chat/sessions/latest${qs}`, accessToken);
        if (!res.ok) throw new Error("Unable to load chat history");

        const data = await res.json();
        if (cancelled) return;

        setSessionId(data?.session?.id || null);
        const storedMessages = Array.isArray(data?.messages)
          ? (data.messages as StoredChatMessage[])
          : [];
        setMessages(
          storedMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) =>
              m.role === "assistant"
                ? {
                    id: m.id,
                    role: "assistant",
                    content: m.content,
                    sources: Array.isArray(m.sources) ? m.sources : [],
                  }
                : { id: m.id, role: "user", content: m.content }
            )
        );
      } catch {
        if (!cancelled) {
          setSessionId(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [accessToken, noteId]);

  const updateSelectionFromDom = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setActiveSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as Element)
        : range.endContainer.parentElement;

    const root = startEl?.closest(
      "[data-ai-md-root='true']"
    ) as HTMLElement | null;
    const endRoot = endEl?.closest("[data-ai-md-root='true']");
    const messageId = root?.getAttribute("data-message-id") || "";

    if (!root || !messageId || root !== endRoot) {
      setActiveSelection(null);
      return;
    }

    const msg = messages.find(
      (m) => m.id === messageId && m.role === "assistant"
    ) as Extract<ChatMessage, { role: "assistant" }> | undefined;

    if (!msg) {
      setActiveSelection(null);
      return;
    }

    const extracted = getMarkdownSelection(root);
    if (!extracted) {
      setActiveSelection(null);
      return;
    }

    setActiveSelection({ ...extracted, messageId });
  }, [messages]);

  useEffect(() => {
    const handler = () => updateSelectionFromDom();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateSelectionFromDom]);

  const getFreshActiveSelection = useCallback(() => {
    if (!activeSelection) return null;
    const root = document.querySelector(
      `[data-ai-md-root='true'][data-message-id='${activeSelection.messageId}']`
    ) as HTMLElement | null;
    if (!root) return activeSelection;

    const fresh = getMarkdownSelection(root);
    return fresh ? { ...fresh, messageId: activeSelection.messageId } : activeSelection;
  }, [activeSelection]);

  const send = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setLoading(true);
    setStreamStatus("Starting...");

    const userMsg: ChatMessage = { id: uid(), role: "user", content: query };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      sources: [],
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const note_content = getNoteText ? getNoteText() : undefined;

      const res = await apiFetch("/chat", accessToken || "", {
        method: "POST",
        body: JSON.stringify({
          query,
          session_id: sessionId,
          note_id: noteId,
          note_title: noteTitle,
          note_content,
          model: useNotesStore.getState().aiModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed");
      }

      if (!res.body) {
        throw new Error("Streaming response unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const parsed = parseSseEvent(rawEvent);
          if (!parsed || typeof parsed.data !== "object" || parsed.data === null) {
            continue;
          }

          const data = parsed.data as Record<string, unknown>;

          if (parsed.event === "meta" || parsed.event === "done") {
            if (typeof data.session_id === "string") {
              setSessionId(data.session_id);
            }
          }

          if (parsed.event === "status" && typeof data.message === "string") {
            setStreamStatus(data.message);
          }

          if (parsed.event === "sources" && Array.isArray(data.sources)) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === "assistant"
                  ? { ...m, sources: data.sources as Source[] }
                  : m
              )
            );
          }

          if (parsed.event === "delta" && typeof data.content === "string") {
            setStreamStatus("Writing answer...");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === "assistant"
                  ? { ...m, content: m.content + data.content }
                  : m
              )
            );
          }

          if (parsed.event === "error") {
            throw new Error(
              typeof data.message === "string" ? data.message : "AI streaming failed"
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === "assistant"
            ? {
                ...m,
                content:
                  "### Error\n\nI couldn’t reach the AI backend stream. Please try again.\n\n**Summary**\n- Backend streaming request failed.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setStreamStatus(null);
    }
  }, [input, loading, accessToken, sessionId, noteId, noteTitle, getNoteText]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const SelectionToolbar = useMemo(() => {
    if (!activeSelection) return null;

    const rect = activeSelection.rect;
    const top = Math.max(12, rect.top - 44);
    const left = Math.min(
      window.innerWidth - 12,
      Math.max(12, rect.left + rect.width / 2)
    );

    const onCopy = async () => {
      const selection = getFreshActiveSelection();
      if (!selection) return;
      await copyToClipboard(selection.markdown);
      setActiveSelection(null);
      window.getSelection()?.removeAllRanges();
    };

    const onAdd = async () => {
      const selection = getFreshActiveSelection();
      if (!selection) return;
      await onAddToNotes(selection.markdown);
      setActiveSelection(null);
      window.getSelection()?.removeAllRanges();
    };

    return (
      <div
        className="fixed z-[120] -translate-x-1/2 rounded-xl border border-[var(--brd)] bg-[var(--glass)] backdrop-blur-xl shadow-lg px-2 py-1.5 flex items-center gap-1"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
        >
          Add to Notes
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => setActiveSelection(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }, [activeSelection, getFreshActiveSelection, onAddToNotes]);

  return (
    <>
      {/* Collapsed floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            type="button"
            onClick={() => setOpen(true)}
            className="fixed z-[110] right-4 bottom-5 w-12 h-12 rounded-2xl border border-[var(--brd)] bg-[var(--glass)] backdrop-blur-xl shadow-xl flex items-center justify-center hover:bg-[var(--bg-s2)] transition-colors"
            aria-label="Open AI Copilot"
          >
            <Bot className="w-5 h-5 text-[var(--t)]" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed z-[110] top-16 right-4 bottom-5 w-[92vw] max-w-[420px] rounded-2xl border border-[var(--brd)] bg-[var(--glass)] backdrop-blur-xl shadow-2xl overflow-hidden"
            ref={panelRef}
          >
            {/* Header */}
            <div className="h-12 px-3.5 flex items-center justify-between border-b border-[var(--brd)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-s2)] border border-[var(--brd)] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[var(--t)]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--t)] leading-none">
                    Copilot
                  </div>
                  <div className="text-[11px] text-[var(--t3)] leading-none mt-1">
                    Ask, summarize, generate, explain
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg border border-[var(--brd)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => useNotesStore.getState().setAiModel("flash")}
                    className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 transition-colors ${useNotesStore.getState().aiModel === "flash" ? "bg-[var(--accent)] text-white" : "text-[var(--t3)] hover:text-[var(--t)]"}`}
                  >
                    <Zap className="w-3 h-3" /> Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => useNotesStore.getState().setAiModel("main")}
                    className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 transition-colors ${useNotesStore.getState().aiModel === "main" ? "bg-[var(--accent)] text-white" : "text-[var(--t3)] hover:text-[var(--t)]"}`}
                  >
                    <Sparkles className="w-3 h-3" /> Main
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
                  aria-label="Collapse"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[calc(100%-96px)] overflow-y-auto px-3.5 py-3 space-y-3"
              onScroll={updateAutoScrollIntent}
              onMouseUp={updateSelectionFromDom}
              onKeyUp={updateSelectionFromDom}
            >
              {historyLoading ? (
                <div className="rounded-2xl border border-[var(--brd)] bg-[var(--bg)]/40 px-3 py-3 flex items-center gap-2 text-[13px] text-[var(--t2)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading chat history...
                </div>
              ) : null}

              {!historyLoading && messages.length === 0 ? (
                <div className="p-4 rounded-xl border border-[var(--brd)] bg-[var(--bg)]/40">
                  <div className="text-[13px] font-semibold text-[var(--t)]">
                    Try asking
                  </div>
                  <div className="mt-2 text-[13px] text-[var(--t2)] space-y-1">
                    <div>• “Explain RAG like I’m new”</div>
                    <div>• “Summarize this note into bullets”</div>
                    <div>• “Generate Python code for BFS”</div>
                  </div>
                </div>
              ) : null}

              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[92%] rounded-2xl px-3 py-2 bg-[var(--accent-light)] border border-[var(--brd)] text-[13px] text-[var(--t)]">
                        {m.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[var(--brd)] bg-[var(--bg)]/40 overflow-hidden"
                  >
                    <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--brd)]">
                      <div className="text-[12px] font-semibold text-[var(--t2)]">
                        AI
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAddToNotes(m.content)}
                          className="h-8 px-2.5 rounded-xl text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Notes
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyToClipboard(m.content)}
                          className="h-8 px-2.5 rounded-xl text-[12px] font-semibold text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div
                      className="px-3 py-2"
                      data-ai-md-root="true"
                      data-message-id={m.id}
                    >
                      <AiMarkdown content={m.content} />

                      {Array.isArray(m.sources) && m.sources.length > 0 ? (
                        <div className="mt-3 pt-2 border-t border-[var(--brd)] text-[12px] text-[var(--t2)]">
                          <div className="font-semibold text-[var(--t3)] mb-1">
                            Sources
                          </div>
                          <div className="space-y-1">
                            {m.sources.slice(0, 6).map((s) => (
                              <a
                                key={s.url}
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate hover:underline"
                              >
                                {s.title || s.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loading ? (
                <div className="rounded-2xl border border-[var(--brd)] bg-[var(--bg)]/40 px-3 py-3 flex items-center gap-2 text-[13px] text-[var(--t2)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {streamStatus || "Thinking..."}
                </div>
              ) : null}
            </div>

            {/* Input */}
            <div className="h-12 border-t border-[var(--brd)] px-3.5 py-2 flex items-center gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="flex-1 resize-none bg-[var(--input)] border border-[var(--input-brd)] rounded-xl px-3 py-2 text-[13px] text-[var(--t)] outline-none focus:ring-2 focus:ring-[var(--accent-light)]"
              />
              <button
                type="button"
                disabled={!canSend || !accessToken}
                onClick={() => void send()}
                className="h-9 px-3 rounded-xl text-[13px] font-semibold bg-[var(--btn)] text-[var(--btn-t)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--btn-hover)] transition-colors"
              >
                Send
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {SelectionToolbar}
    </>
  );
}
