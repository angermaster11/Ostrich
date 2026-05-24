"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Brain, Send, Mic, MicOff, Volume2, VolumeX,
  Sparkles, RotateCcw, MessageSquare, Loader2,
  ChevronDown, Copy, Check, StopCircle, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useNotesStore, ChatMessage } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useVAD } from "@/lib/use-vad";

export default function AIBrainPage() {
  const supabase = createClient();
  const {
    aiMessages, addAiMessage, updateLastAiMessage, setAiMessages,
    aiSessionId, setAiSessionId, aiStreaming, setAiStreaming,
    aiMode, setAiMode, clearAiChat, voiceLanguage, voiceSpeaker,
    aiModel, setAiModel,
  } = useNotesStore();

  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("Tap mic to start");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Simple audio playback queue — no AnalyserNode overhead
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (isMuted) {
      audioQueueRef.current = [];
      setIsPlayingAudio(false);
      if (useNotesStore.getState().aiMode === "voice") {
        setTimeout(() => startListening(), 300);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsPlayingAudio(true);
    setVoiceStatus("Speaking...");

    const b64 = audioQueueRef.current.shift()!;

    try {
      const audio = new Audio(`data:audio/mp3;base64,${b64}`);
      audio.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextAudio();
        } else {
          setIsPlayingAudio(false);
          setVoiceStatus("Tap mic to speak");
          if (useNotesStore.getState().aiMode === "voice") {
            setTimeout(() => startListening(), 300);
          }
        }
      };
      audio.onerror = () => {
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
      };
      await audio.play();
    } catch {
      isPlayingRef.current = false;
      setIsPlayingAudio(false);
    }
  }, [isMuted]);

  // VAD: auto-detect silence and send audio
  const handleSpeechEnd = useCallback(async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connectWS();
    }

    setVoiceStatus("Processing...");

    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setAiStreaming(true);
      wsRef.current.send(JSON.stringify({
        type: "voice",
        audio: base64,
        language: useNotesStore.getState().voiceLanguage,
        speaker: useNotesStore.getState().voiceSpeaker,
        session_id: aiSessionId,
      }));
    }
  }, [aiSessionId]);

  const { isListening, isSpeaking, startListening, stopListening } = useVAD({
    silenceThreshold: 0.015,
    silenceTimeout: 1500,
    onSpeechEnd: handleSpeechEnd,
    onVolumeChange: setVolume,
  });

  // Auto-scroll (chat mode only)
  useEffect(() => {
    if (aiMode === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, aiMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // WebSocket connection
  const connectWS = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
      .replace("http", "ws") + "/ws/chat";

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token: session.access_token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentMode = useNotesStore.getState().aiMode;

      switch (data.type) {
        case "meta":
          setAiSessionId(data.session_id);
          break;
        case "delta":
          if (currentMode === "chat") {
            useNotesStore.getState().appendLastAiMessage(data.content);
          }
          break;
        case "transcript":
          if (currentMode === "voice") {
            setVoiceStatus(`You: "${data.text}"`);
          } else {
            const store = useNotesStore.getState();
            const msgs = store.aiMessages;
            const lastUserIdx = msgs.findLastIndex((m: ChatMessage) => m.role === "user");
            if (lastUserIdx >= 0 && msgs[lastUserIdx].content === "🎤 ...") {
              const updated = [...msgs];
              updated[lastUserIdx] = { ...updated[lastUserIdx], content: data.text };
              store.setAiMessages(updated);
            }
          }
          break;
        case "audio":
          audioQueueRef.current.push(data.audio);
          playNextAudio();
          break;
        case "memory_saved":
          setVoiceStatus("Memory saved!");
          break;
        case "sources":
          break;
        case "done":
          setAiStreaming(false);
          if (currentMode === "voice" && audioQueueRef.current.length === 0 && !isPlayingRef.current) {
            setVoiceStatus("Tap mic to speak");
            setTimeout(() => {
              if (useNotesStore.getState().aiMode === "voice") {
                startListening();
              }
            }, 500);
          }
          break;
        case "error":
          setAiStreaming(false);
          if (currentMode === "voice") {
            setVoiceStatus("Error — tap mic to retry");
          } else {
            addAiMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: `⚠️ ${data.message}`,
              created_at: new Date().toISOString(),
            });
          }
          break;
      }
    };

    ws.onerror = () => console.error("WebSocket error");
    ws.onclose = () => { wsRef.current = null; };

    return ws;
  }, [supabase.auth, playNextAudio]);

  // SSE fallback (chat mode)
  const sendMessageSSE = async (query: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setAiStreaming(true);
    addAiMessage({ id: crypto.randomUUID(), role: "user", content: query, created_at: new Date().toISOString() });
    addAiMessage({ id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() });

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ query, session_id: aiSessionId, model: useNotesStore.getState().aiModel }),
        }
      );

      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
          else if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (currentEvent === "delta" || payload.content) { fullContent += payload.content || ""; updateLastAiMessage(fullContent); }
              if (currentEvent === "meta" || payload.session_id) setAiSessionId(payload.session_id);
            } catch {}
            currentEvent = "";
          }
        }
      }
    } catch { updateLastAiMessage("⚠️ Failed to get response."); }
    setAiStreaming(false);
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || aiStreaming) return;
    setInput("");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setAiStreaming(true);
      addAiMessage({ id: crypto.randomUUID(), role: "user", content: query, created_at: new Date().toISOString() });
      addAiMessage({ id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() });
      wsRef.current.send(JSON.stringify({ type: "message", query, session_id: aiSessionId, model: useNotesStore.getState().aiModel }));
    } else {
      await sendMessageSSE(query);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
      setVoiceStatus("Mic off");
    } else {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) connectWS();
      startListening();
      setVoiceStatus("Listening...");
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const suggestions = [
    "Summarize my recent uploads",
    "What are the key insights from my PDFs?",
    "Help me connect ideas across my notes",
    "Create a study plan from my materials",
  ];

  // ─── VOICE MODE UI ─────────────────────────────────────
  if (aiMode === "voice") {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="ai-brain-header">
          <div className="flex items-center gap-2.5">
            <div className="ai-brain-logo">
              <Brain className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--t)]">AI Brain</h1>
              <p className="text-[11px] text-[var(--t3)]">Voice conversation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="ai-mode-toggle">
              <button onClick={() => { setAiMode("chat"); stopListening(); }} className="">
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </button>
              <button className="active">
                <Mic className="w-3.5 h-3.5" /> Voice
              </button>
            </div>
            <div className="ai-mode-toggle">
              <button onClick={() => setAiModel("flash")} className={aiModel === "flash" ? "active" : ""}>
                <Zap className="w-3.5 h-3.5" /> Flash
              </button>
              <button onClick={() => setAiModel("main")} className={aiModel === "main" ? "active" : ""}>
                <Sparkles className="w-3.5 h-3.5" /> Main
              </button>
            </div>
            <button onClick={clearAiChat} className="ai-header-btn" title="New conversation">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Avatar + Voice UI */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          {/* Simple lightweight avatar */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Ambient glow */}
              <div
                className={`absolute inset-0 rounded-full blur-2xl opacity-30 transition-all duration-700 ${
                  isPlayingAudio ? "bg-violet-500 scale-110" : isListening ? "bg-green-500 scale-105" : "bg-indigo-500"
                }`}
              />

              {/* Main circle */}
              <div className={`relative w-40 h-40 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                isPlayingAudio
                  ? "border-violet-400 bg-gradient-to-br from-violet-500/20 to-purple-600/20 shadow-lg shadow-violet-500/20"
                  : isListening
                    ? "border-green-400 bg-gradient-to-br from-green-500/20 to-emerald-600/20 shadow-lg shadow-green-500/20"
                    : "border-[var(--brd)] bg-[var(--bg-s2)]"
              }`}>
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  {/* Ostrich bird icon */}
                  <circle cx="50" cy="38" r="18" fill="currentColor" className="text-[var(--accent)]" opacity="0.15" />
                  <path d="M50 20 C35 20 28 30 28 42 C28 54 38 60 50 60 C62 60 72 54 72 42 C72 30 65 20 50 20" fill="none" stroke="currentColor" className="text-[var(--accent)]" strokeWidth="2" />
                  <circle cx="42" cy="36" r="2.5" fill="currentColor" className="text-[var(--accent)]" />
                  <circle cx="58" cy="36" r="2.5" fill="currentColor" className="text-[var(--accent)]" />
                  <path d="M44 46 Q50 50 56 46" stroke="currentColor" className="text-[var(--accent)]" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M50 60 L50 78" stroke="currentColor" className="text-[var(--accent)]" strokeWidth="2" strokeLinecap="round" />
                  <path d="M50 78 L44 88 M50 78 L56 88" stroke="currentColor" className="text-[var(--accent)]" strokeWidth="2" strokeLinecap="round" />
                </svg>

                {/* Pulse rings when active */}
                {isListening && !isPlayingAudio && (
                  <>
                    <div className="absolute inset-0 rounded-full border border-green-400/40 animate-ping" />
                    <div className="absolute inset-[-4px] rounded-full border border-green-400/20 animate-pulse" />
                  </>
                )}
                {isPlayingAudio && (
                  <div className="absolute inset-0 rounded-full border border-violet-400/40 animate-pulse" />
                )}
              </div>
            </div>

            {/* Name */}
            <p className="mt-2 text-[14px] font-semibold text-[var(--t)]">Ostrich - Rangam AI</p>
          </div>

          {/* Status text */}
          <p className="text-[13px] text-[var(--t2)] text-center min-h-[20px]">
            {voiceStatus}
          </p>

          {/* Controls bar */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--brd)] bg-[var(--glass)] backdrop-blur-xl">
            {/* Mic toggle */}
            <button
              onClick={toggleVoice}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                  : "bg-[var(--bg-s2)] text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)]"
              }`}
              title={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-[var(--brd)]" />

            {/* Speaker toggle */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) {
                  audioQueueRef.current = [];
                  isPlayingRef.current = false;
                  setIsPlayingAudio(false);
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted
                  ? "bg-red-500/20 text-red-400"
                  : "bg-[var(--bg-s2)] text-[var(--t2)] hover:text-[var(--t)]"
              }`}
              title={isMuted ? "Unmute speaker" : "Mute speaker"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-[var(--t3)] text-center max-w-xs">
            Auto-sends after 1.5s silence. AI will respond with voice and auto-listen again.
          </p>
        </div>
      </div>
    );
  }

  // ─── CHAT MODE UI ──────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="ai-brain-header">
        <div className="flex items-center gap-2.5">
          <div className="ai-brain-logo">
            <Brain className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[var(--t)]">AI Brain</h1>
            <p className="text-[11px] text-[var(--t3)]">Chat with your second brain</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="ai-mode-toggle">
            <button className="active">
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </button>
            <button onClick={() => { setAiMode("voice"); connectWS(); }} className="">
              <Mic className="w-3.5 h-3.5" /> Voice
            </button>
          </div>
          <div className="ai-mode-toggle">
            <button onClick={() => setAiModel("flash")} className={aiModel === "flash" ? "active" : ""}>
              <Zap className="w-3.5 h-3.5" /> Flash
            </button>
            <button onClick={() => setAiModel("main")} className={aiModel === "main" ? "active" : ""}>
              <Sparkles className="w-3.5 h-3.5" /> Main
            </button>
          </div>
          <button onClick={clearAiChat} className="ai-header-btn" title="New conversation">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages-container">
        {aiMessages.length === 0 ? (
          <div className="ai-empty-state">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="ai-empty-orb"
            >
              <Sparkles className="w-8 h-8 text-[var(--accent)]" />
            </motion.div>
            <h2 className="text-[18px] font-bold text-[var(--t)] mt-6">Ask me anything</h2>
            <p className="text-[13px] text-[var(--t2)] mt-1 max-w-md text-center">
              I can search your knowledge vault, summarize documents, answer questions,
              and help you connect ideas across your notes.
            </p>
            <div className="ai-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="ai-suggestion-chip"
                >
                  <Zap className="w-3 h-3" /> {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages-list">
            <AnimatePresence initial={false}>
              {aiMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`ai-message ${msg.role}`}
                >
                  {msg.role === "assistant" && (
                    <div className="ai-message-avatar">
                      <Brain className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                  )}
                  <div className={`ai-message-bubble ${msg.role}`}>
                    {msg.role === "assistant" ? (
                      <div className="ai-markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || (aiStreaming ? "●" : "")}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    {msg.role === "assistant" && msg.content && !aiStreaming && (
                      <div className="ai-message-actions">
                        <button onClick={() => handleCopy(msg.content, msg.id)} className="ai-action-btn">
                          {copied === msg.id ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {aiStreaming && (
              <div className="ai-typing-indicator">
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="ai-input-container">
        <div className="ai-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your brain anything..."
            className="ai-input-field"
            rows={1}
          />
          <button onClick={handleSend} disabled={!input.trim() || aiStreaming} className="ai-send-btn">
            {aiStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--t3)] text-center mt-2">
          Say "remember this: ..." to save memories. AI can make mistakes.
        </p>
      </div>
    </div>
  );
}
