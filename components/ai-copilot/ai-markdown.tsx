"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

type SyntaxStyle = Record<string, React.CSSProperties>;

function CodeBlock({
  language,
  value,
}: {
  language?: string;
  value: string;
}) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const style = theme === "dark" ? oneDark : oneLight;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="relative group rounded-lg overflow-hidden my-4 border border-[var(--code-brd)] bg-[var(--code-bg)] shadow-sm"
      data-ai-code-block="true"
      data-language={language || ""}
      data-markdown={`\`\`\`${language || ""}\n${value.replace(/\n$/, "")}\n\`\`\``}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--code-brd)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="text-[12px] text-[var(--t3)] font-medium">
          {language || "code"}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg-s2)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--success)]" />
              <span className="text-[var(--success)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="text-[13px] leading-[1.65]" data-ai-code-body="true">
        <SyntaxHighlighter
          language={language}
          style={style as unknown as SyntaxStyle}
          customStyle={{
            margin: 0,
            padding: "14px 16px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.65",
            fontFamily: "var(--font-mono)",
          }}
          codeTagProps={{
            style: { fontFamily: "var(--font-mono)" },
          }}
          wrapLongLines
          showLineNumbers={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function AiMarkdown({ content }: { content: string }) {
  const markdown = useMemo(() => content ?? "", [content]);

  return (
    <div className="ai-markdown text-[14px] text-[var(--t)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              {children}
            </a>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className="my-2 leading-[1.65]">
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="my-2 pl-5 list-disc space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="my-2 pl-5 list-decimal space-y-1">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="leading-[1.6]">
              {children}
            </li>
          ),
          h1: ({ children, ...props }) => (
            <h1 {...props} className="mt-4 mb-2 text-[16px] font-semibold">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props} className="mt-4 mb-2 text-[15px] font-semibold">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="mt-3 mb-1.5 text-[14px] font-semibold">
              {children}
            </h3>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="my-3 pl-3 border-l-2 border-[var(--brd2)] text-[var(--t2)]"
            >
              {children}
            </blockquote>
          ),
          table: ({ children, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[var(--table-brd)]">
              <table {...props} className="w-full text-[13px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead {...props} className="bg-[var(--table-header)]">
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="text-left font-semibold px-3 py-2 border-b border-[var(--table-brd)]"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td {...props} className="px-3 py-2 border-b border-[var(--table-brd)]">
              {children}
            </td>
          ),
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1];
            const value = Array.isArray(children)
              ? children.join("")
              : String(children ?? "");
            const isBlock = (className || "").includes("language-");

            if (isBlock) {
              return (
                <CodeBlock
                  language={language}
                  value={value.replace(/\n$/, "")}
                />
              );
            }

            return (
              <code
                {...props}
                className="px-1 py-0.5 rounded border border-[var(--code-brd)] bg-[var(--code-bg)] font-mono text-[13px]"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
