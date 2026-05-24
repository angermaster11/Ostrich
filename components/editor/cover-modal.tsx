"use client";

import { useState, useCallback, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { X, Search, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useDebouncedCallback } from "use-debounce";

interface CoverModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
  onRemove: () => void;
}

const COLOR_PRESETS = [
  "#2F2F2F",
  "#3B3A38",
  "#4B5563",
  "#1F2937",
  "#6B7280",
  "#111827",
  "#9CA3AF",
  "#D1D5DB",
];

export function CoverModal({ onClose, onSelect, onRemove }: CoverModalProps) {
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashImages, setUnsplashImages] = useState<any[]>([]);
  const [loadingUnsplash, setLoadingUnsplash] = useState(false);
  const [unsplashError, setUnsplashError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const searchUnsplash = async (query: string) => {
    if (!query) {
      setUnsplashImages([]);
      setUnsplashError("");
      return;
    }
    setLoadingUnsplash(true);
    setUnsplashError("");
    try {
      const res = await fetch(
        `/api/unsplash/search?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setUnsplashImages([]);
        setUnsplashError(
          typeof data?.error === "string"
            ? data.error
            : "Unsplash request failed."
        );
        return;
      }
      setUnsplashImages(data.results || []);
    } catch (err) {
      console.error(err);
      setUnsplashImages([]);
      setUnsplashError("Unsplash request failed. Please try again.");
    } finally {
      setLoadingUnsplash(false);
    }
  };

  const debouncedSearch = useDebouncedCallback((query: string) => {
    searchUnsplash(query);
  }, 500);

  const handleUnsplashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnsplashQuery(e.target.value);
    setUnsplashError("");
    debouncedSearch(e.target.value);
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

    // Simulate upload progress
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
      // In production, this would upload to Supabase Storage bucket 'covers/'
      const objectUrl = URL.createObjectURL(file);
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        onSelect(objectUrl);
      }, 300);
    } catch (err) {
      clearInterval(interval);
      setError("Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-s)] border border-[var(--brd2)] rounded-xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--brd)] shrink-0">
          <h3 className="text-[14px] font-semibold text-[var(--t)]">
            Choose a cover
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Tabs.Root defaultValue="gallery" className="flex flex-col flex-1 overflow-hidden">
          <Tabs.List className="flex border-b border-[var(--brd)] px-5 gap-1 shrink-0">
            {[
              { value: "gallery", label: "Gallery" },
              { value: "unsplash", label: "Unsplash" },
              { value: "upload", label: "Upload" },
              { value: "url", label: "Link" },
            ].map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="px-3 py-2.5 text-[13px] font-medium text-[var(--t3)] border-b-2 border-transparent data-[state=active]:text-[var(--t)] data-[state=active]:border-[var(--accent)] transition-colors -mb-[1px]"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="flex-1 overflow-y-auto">
            {/* Gallery */}
            <Tabs.Content value="gallery" className="p-5">
              <p className="text-[12px] text-[var(--t3)] mb-3 font-medium">
                Color
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {COLOR_PRESETS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => onSelect(g)}
                    className="h-[80px] rounded-lg border border-[var(--brd)] hover:border-[var(--accent)] transition-all hover:scale-[1.03] overflow-hidden"
                    style={{ background: g }}
                  />
                ))}
              </div>
            </Tabs.Content>

            {/* Unsplash */}
            <Tabs.Content value="unsplash" className="p-5 flex flex-col h-full">
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t3)]" />
                <input
                  type="text"
                  placeholder="Search for an image..."
                  value={unsplashQuery}
                  onChange={handleUnsplashChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--input)] border border-[var(--input-brd)] rounded-lg text-[13px] text-[var(--t)] placeholder:text-[var(--t3)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {unsplashError && (
                <div className="-mt-1 mb-4 text-[12px] text-[var(--danger)]">
                  {unsplashError}
                </div>
              )}

              {loadingUnsplash ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--t3)]" />
                </div>
              ) : unsplashImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pb-6">
                  {unsplashImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => onSelect(img.urls.regular)}
                      className="relative group aspect-video rounded-lg overflow-hidden border border-[var(--brd)] hover:border-[var(--accent)] transition-colors bg-[var(--bg-s2)]"
                    >
                      <img
                        src={img.urls.small}
                        alt={img.alt_description || "Unsplash image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white/90 truncate block text-left">
                          By {img.user.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : unsplashQuery ? (
                <div className="flex-1 flex items-center justify-center py-12 text-[13px] text-[var(--t3)]">
                  No images found
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-12 text-[13px] text-[var(--t3)]">
                  Search to find beautiful cover images
                </div>
              )}
              {unsplashImages.length > 0 && (
                <div className="text-center text-[10px] text-[var(--t3)] mt-auto pt-2 shrink-0">
                  Photos from Unsplash
                </div>
              )}
            </Tabs.Content>

            {/* Upload */}
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
              {error && (
                <div className="mt-3 text-[12px] text-[var(--danger)] text-center">
                  {error}
                </div>
              )}
            </Tabs.Content>

            {/* URL */}
            <Tabs.Content value="url" className="p-5">
              <p className="text-[12px] text-[var(--t3)] mb-2 font-medium">
                Paste an image link
              </p>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2.5 bg-[var(--input)] border border-[var(--input-brd)] rounded-lg text-[13px] text-[var(--t)] placeholder:text-[var(--t3)] outline-none focus:border-[var(--accent)] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) {
                      onSelect(val);
                    }
                  }
                }}
              />
            </Tabs.Content>
          </div>

          <div className="p-4 border-t border-[var(--brd)] shrink-0 flex justify-end">
            <button className="btn-ghost" onClick={onRemove}>
              Remove cover
            </button>
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
}
