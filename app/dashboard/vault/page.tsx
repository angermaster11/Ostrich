"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Upload, HardDrive, FileText, Image, FileType, BookOpen,
  Trash2, Search, Grid, List, Plus, X, CheckCircle,
  AlertCircle, Loader2, FolderPlus, Folder, FolderOpen,
  ChevronRight, ArrowLeft, Eye, Move,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useNotesStore, VaultFile } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface VaultFolder {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  created_at: string;
}

interface FilePreview {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  content_text: string;
  signed_url: string;
}

const FILE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  pdf: { icon: FileType, color: "var(--danger)", bg: "rgba(235,87,87,0.1)" },
  docx: { icon: FileText, color: "var(--accent)", bg: "var(--accent-light)" },
  txt: { icon: BookOpen, color: "var(--success)", bg: "rgba(77,182,172,0.1)" },
  image: { icon: Image, color: "var(--accent-2)", bg: "rgba(139,92,246,0.1)" },
  screenshot: { icon: Image, color: "var(--accent-3)", bg: "rgba(245,158,11,0.1)" },
  scanned_note: { icon: Image, color: "var(--warning)", bg: "rgba(245,166,35,0.1)" },
};

const STATUS_MAP: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Loader2, color: "var(--accent-3)", label: "Pending" },
  processing: { icon: Loader2, color: "var(--accent)", label: "Processing" },
  completed: { icon: CheckCircle, color: "var(--success)", label: "Ready" },
  failed: { icon: AlertCircle, color: "var(--danger)", label: "Failed" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VaultPage() {
  const supabase = createClient();
  const { vaultFiles, setVaultFiles, addVaultFile, removeVaultFile, setVaultLoading, vaultLoading } = useNotesStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Folder state
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<VaultFolder[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Preview state
  const [previewFile, setPreviewFile] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch files and folders
  useEffect(() => {
    const fetchData = async () => {
      setVaultLoading(true);
      setFolders([]);  // Clear folders immediately to prevent stale display
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const params = new URLSearchParams();
        if (filterType) params.set("file_type", filterType);
        if (currentFolder) params.set("folder_id", currentFolder);
        const fileUrl = `/vault${params.toString() ? `?${params}` : ""}`;
        const folderUrl = currentFolder
          ? `/vault/folders?parent_id=${currentFolder}`
          : `/vault/folders`;
        const [filesRes, foldersRes] = await Promise.all([
          apiFetch(fileUrl, session.access_token),
          apiFetch(folderUrl, session.access_token),
        ]);
        if (filesRes.ok) setVaultFiles(await filesRes.json());
        if (foldersRes.ok) setFolders(await foldersRes.json());
      } catch {} finally {
        setVaultLoading(false);
      }
    };
    fetchData();
  }, [filterType, currentFolder, supabase.auth]);

  // Navigate into folder
  const openFolder = (folder: VaultFolder) => {
    setFolderPath((prev) => [...prev, folder]);
    setCurrentFolder(folder.id);
  };

  // Navigate back
  const goBack = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const goToRoot = () => {
    setFolderPath([]);
    setCurrentFolder(null);
  };

  // Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await apiFetch("/vault/folders", session.access_token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentFolder }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders((prev) => [...prev, folder]);
      }
    } catch {}
    setNewFolderName("");
    setShowNewFolder(false);
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await apiFetch(`/vault/folders/${folderId}`, session.access_token, { method: "DELETE" });
      if (res.ok) setFolders((prev) => prev.filter((f) => f.id !== folderId));
    } catch {}
  };

  // Upload handler
  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUploading(true);

    for (const file of acceptedFiles) {
      setUploadProgress(`Uploading ${file.name}...`);
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolder) formData.append("folder_id", currentFolder);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/vault/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          }
        );
        if (res.ok) {
          const record = await res.json();
          addVaultFile(record);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploadProgress(null);
    setUploading(false);
  }, [supabase.auth, currentFolder]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxSize: 50 * 1024 * 1024,
    noClick: true,
  });

  // Delete file
  const handleDelete = async (fileId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await apiFetch(`/vault/${fileId}`, session.access_token, { method: "DELETE" });
      if (res.ok) removeVaultFile(fileId);
    } catch {}
  };

  // Preview file
  const openPreview = async (fileId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setPreviewLoading(true);
    try {
      const res = await apiFetch(`/vault/${fileId}/preview`, session.access_token);
      if (res.ok) {
        const data = await res.json();
        setPreviewFile(data);
      }
    } catch {} finally {
      setPreviewLoading(false);
    }
  };

  // Filter files by search
  const filtered = vaultFiles.filter((f) =>
    f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filterOptions = [
    { value: null, label: "All" },
    { value: "pdf", label: "PDFs" },
    { value: "docx", label: "Docs" },
    { value: "txt", label: "Text" },
    { value: "image", label: "Images" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* ── Header ─────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-[24px] font-bold tracking-tight flex items-center gap-2.5">
              <HardDrive className="w-6 h-6 text-[var(--accent)]" />
              Knowledge Vault
            </h1>
            <p className="text-[13px] text-[var(--t2)] mt-1">
              Upload PDFs, documents, images — organized in folders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <label className="vault-upload-btn">
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  if (e.target.files) handleUpload(Array.from(e.target.files));
                }}
              />
              <Upload className="w-4 h-4" />
              Upload
            </label>
          </div>
        </div>

        {/* ── Breadcrumb ─────────────────── */}
        {folderPath.length > 0 && (
          <div className="flex items-center gap-1 mb-4 text-[13px]">
            <button onClick={goToRoot} className="text-[var(--accent)] hover:underline font-medium">
              Vault
            </button>
            {folderPath.map((f, i) => (
              <span key={`${f.id}-${i}`} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-[var(--t3)]" />
                {i === folderPath.length - 1 ? (
                  <span className="text-[var(--t)] font-medium">{f.name}</span>
                ) : (
                  <button
                    onClick={() => {
                      const newPath = folderPath.slice(0, i + 1);
                      setFolderPath(newPath);
                      setCurrentFolder(f.id);
                    }}
                    className="text-[var(--accent)] hover:underline font-medium"
                  >
                    {f.name}
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* ── New Folder Input ────────────── */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex items-center gap-2"
            >
              <Folder className="w-5 h-5 text-[var(--accent)]" />
              <input
                autoFocus
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-[var(--brd2)] bg-[var(--bg)] text-[var(--t)] outline-none focus:border-[var(--accent)]"
              />
              <button onClick={createFolder} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-[var(--btn)] text-[var(--btn-t)]">
                Create
              </button>
              <button onClick={() => setShowNewFolder(false)} className="p-2 text-[var(--t3)] hover:text-[var(--t)]">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toolbar ────────────────────── */}
        <div className="vault-toolbar">
          <div className="vault-search">
            <Search className="w-4 h-4 text-[var(--t3)]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="vault-filters">
            {filterOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setFilterType(opt.value)}
                className={`vault-filter-chip ${filterType === opt.value ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="vault-view-toggle">
            <button onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "active" : ""}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={viewMode === "list" ? "active" : ""}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Upload Progress ────────────── */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="vault-upload-progress"
            >
              <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
              <span className="text-[13px] text-[var(--t2)]">{uploadProgress}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Drop Zone / Folders + Files ── */}
        <div {...getRootProps()} className={`vault-dropzone ${isDragActive ? "dragging" : ""}`}>
          <input {...getInputProps()} />

          {isDragActive ? (
            <div className="vault-drop-overlay">
              <Upload className="w-10 h-10 text-[var(--accent)]" />
              <p className="text-[15px] font-semibold text-[var(--t)] mt-3">Drop files here</p>
              <p className="text-[12px] text-[var(--t3)]">PDF, DOCX, TXT, PNG, JPEG, WebP</p>
            </div>
          ) : folders.length === 0 && filtered.length === 0 && !vaultLoading ? (
            <label className="vault-empty-state">
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  if (e.target.files) handleUpload(Array.from(e.target.files));
                }}
              />
              <div className="vault-empty-icon">
                <HardDrive className="w-8 h-8" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--t)] mt-4">
                {currentFolder ? "This folder is empty" : "Your vault is empty"}
              </p>
              <p className="text-[13px] text-[var(--t3)] mt-1 max-w-sm">
                Upload documents, images, and scanned notes to build your AI knowledge base
              </p>
              <div className="flex items-center gap-1 mt-4 text-[12px] text-[var(--accent)] font-medium">
                <Plus className="w-3.5 h-3.5" /> Click to upload or drag & drop
              </div>
            </label>
          ) : (
            <div>
              {/* Folders */}
              {folders.length > 0 && (
                <div className={`mb-4 ${viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" : "space-y-1"}`}>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`group cursor-pointer rounded-xl border border-[var(--brd)] hover:border-[var(--brd2)] transition-all ${
                        viewMode === "grid" ? "p-4 flex flex-col items-center gap-2" : "flex items-center gap-3 px-4 py-2.5"
                      }`}
                      onClick={() => openFolder(folder)}
                    >
                      <FolderOpen className={`text-[var(--accent)] ${viewMode === "grid" ? "w-8 h-8" : "w-5 h-5"}`} />
                      <span className="text-[13px] font-medium text-[var(--t)] truncate">{folder.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-[var(--t3)] hover:text-[var(--danger)] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              {viewMode === "grid" ? (
                <div className="vault-file-grid">
                  {filtered.map((file) => {
                    const typeInfo = FILE_ICONS[file.file_type] || FILE_ICONS.txt;
                    const TypeIcon = typeInfo.icon;
                    const statusInfo = STATUS_MAP[file.processing_status] || STATUS_MAP.pending;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="vault-file-card group"
                        onClick={() => openPreview(file.id)}
                      >
                        <div className="vault-file-card-icon" style={{ background: typeInfo.bg }}>
                          <TypeIcon className="w-6 h-6" style={{ color: typeInfo.color }} />
                        </div>
                        <div className="vault-file-card-info">
                          <span className="vault-file-name">{file.file_name}</span>
                          <div className="vault-file-meta">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>·</span>
                            <span>{dayjs(file.created_at).fromNow()}</span>
                          </div>
                        </div>
                        <div className="vault-file-card-status">
                          <StatusIcon
                            className={`w-3.5 h-3.5 ${file.processing_status === "processing" ? "animate-spin" : ""}`}
                            style={{ color: statusInfo.color }}
                          />
                        </div>
                        <div className="vault-file-card-actions">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPreview(file.id); }}
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="vault-file-list">
                  {filtered.map((file) => {
                    const typeInfo = FILE_ICONS[file.file_type] || FILE_ICONS.txt;
                    const TypeIcon = typeInfo.icon;
                    const statusInfo = STATUS_MAP[file.processing_status] || STATUS_MAP.pending;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="vault-list-row group cursor-pointer"
                        onClick={() => openPreview(file.id)}
                      >
                        <div className="vault-list-icon" style={{ background: typeInfo.bg }}>
                          <TypeIcon className="w-4 h-4" style={{ color: typeInfo.color }} />
                        </div>
                        <span className="vault-list-name">{file.file_name}</span>
                        <span className="vault-list-meta">{formatFileSize(file.file_size)}</span>
                        <span className="vault-list-meta">{dayjs(file.created_at).format("MMM D")}</span>
                        <div className="vault-list-status">
                          <StatusIcon
                            className={`w-3 h-3 ${file.processing_status === "processing" ? "animate-spin" : ""}`}
                            style={{ color: statusInfo.color }}
                          />
                          <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                          className="vault-list-action"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── File Preview Modal ────────── */}
      <AnimatePresence>
        {(previewFile || previewLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-[var(--bg)] rounded-2xl border border-[var(--brd)] shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                </div>
              ) : previewFile ? (
                <>
                  {/* Preview header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--brd)]">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const typeInfo = FILE_ICONS[previewFile.file_type] || FILE_ICONS.txt;
                        const TypeIcon = typeInfo.icon;
                        return <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />;
                      })()}
                      <h3 className="text-[15px] font-bold text-[var(--t)] truncate max-w-md">
                        {previewFile.file_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewFile.signed_url && (
                        <a
                          href={previewFile.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[var(--brd2)] text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
                        >
                          Open original
                        </a>
                      )}
                      <button
                        onClick={() => setPreviewFile(null)}
                        className="p-2 text-[var(--t3)] hover:text-[var(--t)] transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {previewFile.file_type === "image" || previewFile.file_type === "screenshot" || previewFile.file_type === "scanned_note" ? (
                      previewFile.signed_url ? (
                        <div className="flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewFile.signed_url}
                            alt={previewFile.file_name}
                            className="max-w-full max-h-[60vh] rounded-lg object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-[var(--t3)] text-center">Image preview not available</p>
                      )
                    ) : previewFile.file_type === "pdf" && previewFile.signed_url ? (
                      <iframe
                        src={previewFile.signed_url}
                        className="w-full h-[65vh] rounded-lg border border-[var(--brd)]"
                        title={previewFile.file_name}
                      />
                    ) : previewFile.content_text ? (
                      <pre className="text-[13px] text-[var(--t)] whitespace-pre-wrap font-mono leading-relaxed bg-[var(--bg-s)] rounded-xl p-5 border border-[var(--brd)]">
                        {previewFile.content_text}
                      </pre>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-[var(--t3)] mx-auto mb-3" />
                        <p className="text-[14px] text-[var(--t2)]">No preview available</p>
                        {previewFile.signed_url && (
                          <a
                            href={previewFile.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-[13px] text-[var(--accent)] font-medium hover:underline"
                          >
                            Download file <ArrowLeft className="w-3 h-3 rotate-[135deg]" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
