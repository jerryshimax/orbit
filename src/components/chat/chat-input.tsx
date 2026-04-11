"use client";

import { useState, useRef, useCallback } from "react";

export type Attachment = {
  url: string;
  filename: string;
  contentType: string;
};

export function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (text: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    if ((!text.trim() && files.length === 0) || isLoading || uploading) return;

    let attachments: Attachment[] = [];

    // Upload files first
    if (files.length > 0) {
      setUploading(true);
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            attachments.push(data);
          }
        } catch {}
      }
      setUploading(false);
    }

    onSend(text.trim() || "(attached files)", attachments.length > 0 ? attachments : undefined);
    setText("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, files, isLoading, uploading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (text.trim() || files.length > 0) && !isLoading && !uploading;

  return (
    <div style={{ borderTop: "1px solid #262a31" }}>
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto hide-scrollbar">
          {files.map((file, i) => (
            <div
              key={i}
              className="relative shrink-0 rounded-lg overflow-hidden"
              style={{ background: "#262a31" }}
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-16 w-16 object-cover rounded-lg"
                />
              ) : (
                <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 px-1">
                  <span
                    className="material-symbols-rounded text-lg"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    description
                  </span>
                  <span
                    className="text-[8px] truncate w-full text-center"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {file.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                <span className="material-symbols-rounded text-[12px]">
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* Attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.csv"
          multiple
          onChange={handleFileSelect}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:brightness-125"
          style={{ background: "#262a31", color: "var(--text-tertiary)" }}
          title="Attach file"
        >
          <span className="material-symbols-rounded text-xl">attach_file</span>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask Cloud anything..."
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm py-2.5 px-3 rounded-lg"
          style={{
            background: "#262a31",
            color: "var(--text-primary)",
            maxHeight: 120,
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
          style={{
            background: canSend ? "var(--accent)" : "#262a31",
            color: canSend ? "#412d00" : "var(--text-tertiary)",
          }}
        >
          <span className="material-symbols-rounded text-xl">
            {uploading ? "hourglass_top" : isLoading ? "more_horiz" : "arrow_upward"}
          </span>
        </button>
      </div>
    </div>
  );
}
