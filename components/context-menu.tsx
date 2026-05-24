"use client";

import { useEffect, useRef } from "react";
import {
  Star,
  Copy,
  Trash2,
  Edit3,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Note } from "@/lib/store";

interface ContextMenuProps {
  x: number;
  y: number;
  noteId: string;
  note: Note;
  onAction: (action: string, noteId: string) => void;
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  noteId,
  note,
  onAction,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedY = Math.min(y, window.innerHeight - 250);
  const adjustedX = Math.min(x, window.innerWidth - 220);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: adjustedY, left: adjustedX }}
    >
      <div
        className="context-menu-item"
        onClick={() => onAction("favorite", noteId)}
      >
        <Star
          className={`w-4 h-4 ${
            note?.is_favorite ? "fill-yellow-500 text-yellow-500" : ""
          }`}
        />
        {note?.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
      </div>
      <div
        className="context-menu-item"
        onClick={() => onAction("duplicate", noteId)}
      >
        <Copy className="w-4 h-4" />
        Duplicate
      </div>
      <div
        className="context-menu-item"
        onClick={() => onAction("addChild", noteId)}
      >
        <Plus className="w-4 h-4" />
        Add sub-page
      </div>
      <div className="context-menu-divider" />
      <div
        className="context-menu-item danger"
        onClick={() => onAction("delete", noteId)}
      >
        <Trash2 className="w-4 h-4" />
        Move to Trash
      </div>
    </div>
  );
}
