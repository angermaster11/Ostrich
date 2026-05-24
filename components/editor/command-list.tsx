"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Image as ImageIcon,
  Quote,
  Minus,
  Table,
  AlertCircle,
  Type,
} from "lucide-react";

export type CommandGroup = "basic" | "media" | "advanced";

export interface CommandItem {
  title: string;
  description: string;
  icon: any;
  group: CommandGroup;
  command: (props: { editor: any; range: any }) => void;
  /** If true, this command triggers a modal instead of inline action */
  opensModal?: string;
}

export const COMMAND_ITEMS: CommandItem[] = [
  // === BASIC BLOCKS ===
  {
    title: "Text",
    description: "Just start writing with plain text.",
    icon: Type,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    icon: Heading1,
    group: "basic",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    icon: Heading2,
    group: "basic",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    icon: Heading3,
    group: "basic",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    icon: List,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list.",
    icon: ListOrdered,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list.",
    icon: CheckSquare,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    icon: Quote,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    description: "Visually divide blocks.",
    icon: Minus,
    group: "basic",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },

  // === MEDIA ===
  {
    title: "Image",
    description: "Upload or embed an image.",
    icon: ImageIcon,
    group: "media",
    opensModal: "image",
    command: ({ editor, range }) => {
      // This is handled by the modal — the command just deletes the slash
      editor.chain().focus().deleteRange(range).run();
    },
  },

  // === ADVANCED ===
  {
    title: "Code Block",
    description: "Capture a code snippet.",
    icon: Code,
    group: "advanced",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Add a simple table.",
    icon: Table,
    group: "advanced",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Callout",
    description: "Make writing stand out.",
    icon: AlertCircle,
    group: "advanced",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "💡 " }],
            },
          ],
        })
        .run();
    },
  },
];

const GROUP_LABELS: Record<CommandGroup, string> = {
  basic: "Basic Blocks",
  media: "Media",
  advanced: "Advanced",
};

const GROUP_ORDER: CommandGroup[] = ["basic", "media", "advanced"];

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return (
      <div className="slash-command-menu">
        <p className="px-3 py-4 text-[13px] text-[var(--t3)] text-center">
          No results
        </p>
      </div>
    );
  }

  // Group items
  const grouped = new Map<CommandGroup, typeof props.items>();
  for (const item of props.items) {
    const group = item.group || "basic";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }

  let flatIndex = 0;

  return (
    <div className="slash-command-menu">
      {GROUP_ORDER.map((groupKey) => {
        const items = grouped.get(groupKey);
        if (!items || items.length === 0) return null;
        return (
          <div key={groupKey}>
            <div className="slash-group-label">{GROUP_LABELS[groupKey]}</div>
            {items.map((item: any) => {
              const Icon = item.icon;
              const currentIndex = flatIndex;
              flatIndex++;
              return (
                <div
                  key={currentIndex}
                  onClick={() => selectItem(currentIndex)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                  className={`slash-command-item ${
                    currentIndex === selectedIndex ? "selected" : ""
                  }`}
                >
                  <div className="slash-command-icon">
                    <Icon />
                  </div>
                  <div className="slash-command-info">
                    <div className="slash-command-title">{item.title}</div>
                    {item.description && (
                      <div className="slash-command-desc">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
CommandList.displayName = "CommandList";
