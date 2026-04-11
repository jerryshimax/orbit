"use client";

import { useState, useCallback, useRef } from "react";
import type { ReconAttachment } from "@/db/queries/recon";

type Props = {
  projectId: string;
  attachments: ReconAttachment[];
  onUpdate: () => void;
};

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "picture_as_pdf",
  "text/plain": "description",
  "text/csv": "table_chart",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentZone({ projectId, attachments, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        await fetch(`/api/recon/${projectId}/attachments`, {
          method: "POST",
          body: form,
        });
        onUpdate();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [projectId, onUpdate]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      try {
        await fetch(`/api/recon/${projectId}/attachments`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachmentId }),
        });
        onUpdate();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [projectId, onUpdate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="space-y-3">
      <h3
        className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold px-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        Reference Docs ({attachments.length})
      </h3>

      <div
        className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--accent)" : "#31353c",
          background: dragOver ? "#262a31" : "transparent",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
        <span
          className="material-symbols-outlined text-2xl mb-1 block"
          style={{ color: uploading ? "var(--accent)" : "var(--text-tertiary)" }}
        >
          {uploading ? "hourglass_top" : "upload_file"}
        </span>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {uploading ? "Uploading..." : "Drop files or click to upload"}
        </span>
      </div>

      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg group"
          style={{ background: "#181c22" }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--text-tertiary)" }}>
            {FILE_ICONS[a.contentType] ?? "attach_file"}
          </span>
          <div className="flex-1 min-w-0">
            <a
              href={a.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium truncate block hover:underline"
              style={{ color: "var(--text-primary)" }}
            >
              {a.filename}
            </a>
            <span className="text-[10px] font-[JetBrains_Mono]" style={{ color: "var(--text-tertiary)" }}>
              {formatSize(a.sizeBytes)}
              {a.extractedText ? " · text extracted" : ""}
            </span>
          </div>
          <button
            onClick={() => deleteAttachment(a.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--text-tertiary)" }}>close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
