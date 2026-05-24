"use client";

export type MarkdownSelection = {
  markdown: string;
  rect: DOMRect;
};

function selectedTextFromRange(range: Range): string {
  const fragment = range.cloneContents();
  const text = fragment.textContent || range.toString();
  return text.replace(/\u00a0/g, " ").trim();
}

function selectedCodeMarkdown(range: Range): string | null {
  const container =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

  const codeBlock = container?.closest("[data-ai-code-block='true']") as
    | HTMLElement
    | null;

  if (!codeBlock) return null;

  const selectedText = selectedTextFromRange(range);
  if (!selectedText) return null;

  const fullMarkdown = codeBlock.getAttribute("data-markdown") || "";
  const codeBody = codeBlock.querySelector("[data-ai-code-body='true']");
  const codeText = codeBody?.textContent?.trim() || "";

  if (codeText && selectedText === codeText) {
    return fullMarkdown.trim();
  }

  const language = codeBlock.getAttribute("data-language") || "";
  return `\`\`\`${language}\n${selectedText}\n\`\`\``.trim();
}

export function getMarkdownSelection(root: HTMLElement): MarkdownSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  if (!anchorNode || !focusNode) return null;
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }
  if (!root.contains(anchorNode) || !root.contains(focusNode)) return null;

  const markdown = selectedCodeMarkdown(range) || selectedTextFromRange(range);
  if (!markdown) return null;

  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  return { markdown, rect };
}
