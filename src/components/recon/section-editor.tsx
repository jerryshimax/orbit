"use client";

import { useState, useCallback, useRef } from "react";

type Props = {
  sectionId: string;
  projectId: string;
  title: string;
  content: string;
  sectionType: string;
  aiGenerated?: boolean;
  onSave: (sectionId: string, content: string) => void;
  onRefineComplete: () => void;
};

export function SectionEditor({
  sectionId,
  projectId,
  title,
  content,
  sectionType,
  aiGenerated,
  onSave,
  onRefineComplete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const [showRefine, setShowRefine] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (localContent !== content) {
      onSave(sectionId, localContent);
    }
  }, [localContent, content, sectionId, onSave]);

  const handleRefine = useCallback(async () => {
    if (!refinePrompt.trim() || refining) return;
    setRefining(true);
    setStreamedContent("");

    try {
      const res = await fetch(`/api/recon/${projectId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          prompt: refinePrompt,
          currentContent: localContent,
          sectionTitle: title,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text_delta") {
              accumulated += event.content;
              setStreamedContent(accumulated);
            }
            if (event.type === "done") {
              setLocalContent(event.content);
              setShowRefine(false);
              setRefinePrompt("");
              onRefineComplete();
            }
            if (event.type === "error") {
              console.error("Refine error:", event.message);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      console.error("Refine failed:", err);
    } finally {
      setRefining(false);
      setStreamedContent("");
    }
  }, [refinePrompt, refining, projectId, sectionId, localContent, title, onRefineComplete]);

  const borderColor =
    sectionType === "pitch_script"
      ? "var(--accent)"
      : sectionType === "positioning"
        ? "#8b5cf6"
        : sectionType === "intel_summary"
          ? "#3b82f6"
          : "#4e4639";

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#181c22", borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h3
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ color: borderColor }}
          >
            {title}
          </h3>
          {aiGenerated && (
            <span className="material-symbols-outlined text-[12px]" style={{ color: "var(--text-tertiary)" }} title="AI generated">
              auto_awesome
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRefine(!showRefine)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-[Space_Grotesk] uppercase tracking-wider transition-colors hover:brightness-110"
            style={{
              background: showRefine ? "var(--accent)" : "transparent",
              color: showRefine ? "#412d00" : "var(--accent)",
            }}
          >
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            Refine
          </button>
          <button
            onClick={() => {
              setEditing(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-[Space_Grotesk] uppercase tracking-wider transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Edit
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            className="w-full min-h-[120px] bg-transparent text-sm leading-relaxed resize-y outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        ) : (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            onClick={() => {
              setEditing(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          >
            {refining ? streamedContent || "Refining..." : localContent || "Click to add content..."}
          </p>
        )}
      </div>

      {showRefine && (
        <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#262a31", borderTop: "1px solid #31353c" }}>
          <span className="material-symbols-outlined text-[16px] shrink-0" style={{ color: "var(--accent)" }}>auto_awesome</span>
          <input
            type="text"
            placeholder="How should Cloud refine this section?"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRefine()}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          <button
            onClick={handleRefine}
            disabled={refining || !refinePrompt.trim()}
            className="px-3 py-1 rounded text-[10px] font-[Space_Grotesk] uppercase tracking-wider font-bold transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#412d00" }}
          >
            {refining ? "Refining..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
