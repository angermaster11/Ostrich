import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
];

export function CodeBlockComponent({
  node,
  updateAttributes,
  extension,
}: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="code-block-wrapper relative group rounded-lg overflow-hidden my-6 border border-[var(--code-brd)] bg-[var(--code-bg)] shadow-sm">
      <div className="code-block-header flex items-center justify-between px-3 py-1.5 border-b border-[var(--code-brd)] transition-opacity opacity-100 group-hover:opacity-100 sm:opacity-0">
        <select
          contentEditable={false}
          value={node.attrs.language || "javascript"}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="code-block-select bg-transparent text-[12px] text-[var(--t2)] hover:text-[var(--t)] outline-none cursor-pointer transition-colors"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <button
          contentEditable={false}
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre p-4 m-0 overflow-x-auto text-[14px] leading-[1.6] font-mono text-[var(--t)]">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}
