"use client";

import { useEffect, useState } from "react";

type BrainFile = {
  name: string;
  content: string;
};

/**
 * Brain Context Panel — pulls linked [People] and [Meetings] .md files
 * from the Obsidian vault. This is the Claude Code + Obsidian edge —
 * curated intel surfaced inline, no other CRM can do this.
 */
export function BrainPanel({ orgName }: { orgName: string }) {
  const [files, setFiles] = useState<BrainFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrainFiles() {
      setLoading(true);
      try {
        // Search for related brain files
        const res = await fetch(
          `/api/brain?pattern=${encodeURIComponent(orgName)}`
        );
        const { matches } = await res.json();

        if (matches && matches.length > 0) {
          // Fetch content for each match
          const fileContents = await Promise.all(
            matches.slice(0, 5).map(async (name: string) => {
              const fileRes = await fetch(
                `/api/brain?file=${encodeURIComponent(name)}`
              );
              const { content } = await fileRes.json();
              return { name, content: content ?? "" };
            })
          );
          setFiles(fileContents);
        }
      } catch {
        // Brain files not available
      }
      setLoading(false);
    }

    fetchBrainFiles();
  }, [orgName]);

  if (loading) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-rounded text-[16px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            neurology
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Searching Brain...
          </span>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-rounded text-[16px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            neurology
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No Brain notes found for &ldquo;{orgName}&rdquo;
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#31353c1a",
        border: "1px solid #4e463933",
      }}
    >
      <div
        className="px-5 py-3 flex items-center gap-2"
      >
        <span
          className="material-symbols-outlined text-lg"
          style={{ color: "var(--accent)" }}
        >
          psychology
        </span>
        <h3
          className="font-[Space_Grotesk] text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--accent)" }}
        >
          Intelligence Brief ({files.length})
        </h3>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {files.map((file) => (
          <div key={file.name}>
            <button
              className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
              style={{
                background:
                  expanded === file.name
                    ? "var(--bg-surface-hover)"
                    : "transparent",
              }}
              onClick={() =>
                setExpanded(expanded === file.name ? null : file.name)
              }
            >
              <span
                className="text-sm truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {file.name.replace(".md", "")}
              </span>
              <span
                className="material-symbols-rounded text-[16px] shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                {expanded === file.name ? "expand_less" : "expand_more"}
              </span>
            </button>
            {expanded === file.name && (
              <div
                className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
                style={{
                  color: "var(--text-secondary)",
                  background: "var(--bg-surface-hover)",
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {file.content || "Empty file"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
