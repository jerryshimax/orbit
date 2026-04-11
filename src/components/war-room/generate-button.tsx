"use client";

import { useState, useCallback } from "react";

type Props = {
  meetingId: string;
  hasExistingSections: boolean;
  onComplete: () => void;
};

export function GenerateButton({ meetingId, hasExistingSections, onComplete }: Props) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ count: 0, total: 0 });

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setStatus("Starting...");

    try {
      const res = await fetch(`/api/war-room/${meetingId}/generate`, {
        method: "POST",
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "status") setStatus(event.message);
            if (event.type === "progress") {
              setStatus(event.message);
              setProgress({ count: event.count, total: event.total });
            }
            if (event.type === "done") {
              setStatus("");
              onComplete();
            }
            if (event.type === "error") {
              setStatus(`Error: ${event.message}`);
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setStatus("Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [generating, meetingId, onComplete]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-[Space_Grotesk] uppercase tracking-wider font-bold transition-all disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#412d00" }}
      >
        <span className="material-symbols-outlined text-[16px]">
          {generating ? "hourglass_top" : "auto_awesome"}
        </span>
        {generating
          ? `Generating${progress.total ? ` (${progress.count}/${progress.total})` : ""}...`
          : hasExistingSections
            ? "Regenerate Intel"
            : "Generate War Room"}
      </button>
      {status && (
        <span className="text-[10px] font-[JetBrains_Mono]" style={{ color: "var(--text-tertiary)" }}>
          {status}
        </span>
      )}
    </div>
  );
}
