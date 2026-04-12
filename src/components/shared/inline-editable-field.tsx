"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FieldType = "text" | "textarea" | "select" | "number";

type Props = {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  type?: FieldType;
  options?: Array<{ value: string; label: string }> | string[];
  label?: string;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  rows?: number;
  multiline?: boolean;
};

/**
 * Renders a value as plain text until clicked. On click it swaps to an input,
 * textarea, or select. Enter (or blur) commits via onSave. Escape cancels.
 *
 * Styling matches the existing Orbit dark tokens (#181c22 / #31353c borders /
 * var(--accent) focus). Keep the wrapper classes minimal so the parent can
 * position the field however it wants.
 */
export function InlineEditableField({
  value,
  onSave,
  type = "text",
  options,
  label,
  placeholder,
  className,
  displayClassName,
  rows = 3,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  // Keep draft in sync when the parent value changes (e.g. from Cloud or a refetch).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    if (type === "textarea") textareaRef.current?.focus();
    else if (type === "select") selectRef.current?.focus();
    else inputRef.current?.focus();
  }, [editing, type]);

  const commit = useCallback(async () => {
    setEditing(false);
    if (draft !== value) {
      await onSave(draft);
    }
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const normalizedOptions = options
    ? options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o
      )
    : [];

  const inputStyle: React.CSSProperties = {
    background: "#181c22",
    color: "var(--text-primary)",
    border: "1px solid #31353c",
  };

  const displayStyle: React.CSSProperties = {
    color: "var(--text-primary)",
  };

  if (!editing) {
    const shown = value && value.trim() ? value : placeholder ?? "Click to add…";
    const muted = !value || !value.trim();
    return (
      <div className={className}>
        {label && (
          <div
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {label}
          </div>
        )}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditing(true);
            }
          }}
          className={`cursor-text rounded px-2 py-1.5 -mx-2 hover:bg-[#1c2026] transition-colors whitespace-pre-wrap text-sm leading-relaxed ${displayClassName ?? ""}`}
          style={{
            ...displayStyle,
            color: muted ? "var(--text-tertiary)" : "var(--text-primary)",
          }}
        >
          {shown}
        </div>
      </div>
    );
  }

  const commonKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div className={className}>
      {label && (
        <div
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </div>
      )}
      {type === "textarea" ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded text-sm outline-none resize-y"
          style={inputStyle}
        />
      ) : type === "select" ? (
        <select
          ref={selectRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else {
              commonKey(e);
            }
          }}
          className="w-full px-3 py-2 rounded text-sm outline-none appearance-none"
          style={inputStyle}
        >
          {normalizedOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef}
          type={type === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else {
              commonKey(e);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded text-sm outline-none"
          style={inputStyle}
        />
      )}
    </div>
  );
}
