"use client";

import { useState, useRef, useCallback } from "react";
import { X, Link, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as Tabs from "@radix-ui/react-tabs";

interface ImageInsertModalProps {
  onInsert: (url: string) => void;
  onClose: () => void;
}

export function ImageInsertModal({ onInsert, onClose }: ImageInsertModalProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setError("");
    if (
      val.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
      val.match(/^https?:\/\/(images|plus)\.unsplash\.com/i) ||
      val.match(/^https?:\/\/source\.unsplash\.com/i)
    ) {
      setPreview(val);
    } else {
      setPreview("");
    }
  };

  const handleUrlInsert = () => {
    if (!url.trim()) {
      setError("Please enter an image URL");
      return;
    }
    onInsert(url.trim());
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");

    // Simulate upload progress (real upload would go to Supabase Storage)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    try {
      // Create a local object URL for now
      // In production, this would upload to Supabase Storage
      const objectUrl = URL.createObjectURL(file);
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        onInsert(objectUrl);
      }, 300);
    } catch (err) {
      clearInterval(interval);
      setError("Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onInsert]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-[520px] bg-[var(--bg-s)] border border-[var(--brd)] rounded-xl shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--brd)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-s2)] flex items-center justify-center">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--t2)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--t)]">
              Insert Image
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs.Root defaultValue="upload" className="flex flex-col">
          <Tabs.List className="flex border-b border-[var(--brd)] px-5 gap-1">
            {[
              { value: "upload", icon: Upload, label: "Upload" },
              { value: "url", icon: Link, label: "Embed Link" },
            ].map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium text-[var(--t3)] border-b-2 border-transparent data-[state=active]:text-[var(--t)] data-[state=active]:border-[var(--accent)] transition-colors -mb-[1px]"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Upload Tab */}
          <Tabs.Content value="upload" className="p-5">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-[var(--brd2)] hover:border-[var(--t3)] hover:bg-[var(--bg-s2)]"
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                  <div className="w-48 h-1.5 bg-[var(--bg-s2)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--t3)]">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-s2)] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[var(--t3)]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--t)]">
                      {isDragActive
                        ? "Drop image here"
                        : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-[11px] text-[var(--t3)] mt-1">
                      JPG, PNG, GIF, WebP · Max 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* URL Tab */}
          <Tabs.Content value="url" className="p-5">
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[var(--t2)] block mb-1.5">
                  Image URL
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUrlInsert();
                    if (e.key === "Escape") onClose();
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2.5 bg-[var(--input)] border border-[var(--input-brd)] rounded-lg text-[13px] text-[var(--t)] placeholder:text-[var(--t3)] outline-none focus:border-[var(--accent)] transition-colors"
                  autoFocus
                />
              </div>

              {/* Preview */}
              {preview && (
                <div className="rounded-lg overflow-hidden border border-[var(--brd)] bg-[var(--bg)]">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-36 object-cover"
                    onError={() => setPreview("")}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[13px] font-medium text-[var(--t2)] rounded-lg hover:bg-[var(--bg-s2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlInsert}
                  disabled={!url.trim()}
                  className="px-4 py-2 text-[13px] font-medium bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Error */}
        {error && (
          <div className="px-5 pb-3 text-[12px] text-[var(--danger)]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
