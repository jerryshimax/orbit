"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InlineEditableField } from "@/components/shared/inline-editable-field";
import { useRegisterPageFields } from "@/lib/chat/page-bridge";

type OrgSeed = {
  id: string;
  name?: string | null;
  notes?: string | null;
  aumUsd?: string | number | null;
  targetCommitment?: string | number | null;
  tags?: string[] | null;
};

function asString(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Client wrapper for the organization detail page. Exposes editable notes,
 * aum, target commitment, and tags via InlineEditableField + PageBridge.
 */
export function OrgEditableFields({
  org,
  onSaved,
}: {
  org: OrgSeed;
  onSaved?: () => void;
}) {
  const [notes, setNotes] = useState(org.notes ?? "");
  const [aum, setAum] = useState(asString(org.aumUsd));
  const [target, setTarget] = useState(asString(org.targetCommitment));
  const [tags, setTags] = useState((org.tags ?? []).join(", "));

  // Keep local state aligned when the parent refetches.
  useEffect(() => {
    setNotes(org.notes ?? "");
    setAum(asString(org.aumUsd));
    setTarget(asString(org.targetCommitment));
    setTags((org.tags ?? []).join(", "));
  }, [org.notes, org.aumUsd, org.targetCommitment, org.tags]);

  const patch = useCallback(
    async (updates: Record<string, unknown>) => {
      await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      onSaved?.();
    },
    [org.id, onSaved]
  );

  const saveNotes = useCallback(
    async (v: string) => {
      setNotes(v);
      await patch({ notes: v });
    },
    [patch]
  );

  const saveAum = useCallback(
    async (v: string) => {
      setAum(v);
      await patch({ aum: v });
    },
    [patch]
  );

  const saveTarget = useCallback(
    async (v: string) => {
      setTarget(v);
      await patch({ targetCommitment: v });
    },
    [patch]
  );

  const saveTags = useCallback(
    async (v: string) => {
      setTags(v);
      await patch({ tags: v });
    },
    [patch]
  );

  const bridgeFields = useMemo(
    () => [
      {
        name: "notes",
        label: "Notes",
        type: "textarea" as const,
        value: notes,
        placeholder: "Organization notes, thesis fit, context…",
      },
      {
        name: "aum",
        label: "AUM (USD)",
        type: "text" as const,
        value: aum,
        placeholder: "e.g. 1500000000",
      },
      {
        name: "targetCommitment",
        label: "Target Commitment (USD)",
        type: "text" as const,
        value: target,
        placeholder: "e.g. 25000000",
      },
      {
        name: "tags",
        label: "Tags",
        type: "text" as const,
        value: tags,
        placeholder: "comma,separated,tags",
      },
    ],
    [notes, aum, target, tags]
  );

  const applyBridgeField = useCallback(
    (field: string, value: string) => {
      if (field === "notes") void saveNotes(value);
      else if (field === "aum") void saveAum(value);
      else if (field === "targetCommitment") void saveTarget(value);
      else if (field === "tags") void saveTags(value);
    },
    [saveNotes, saveAum, saveTarget, saveTags]
  );

  useRegisterPageFields({
    route: `/organizations/${org.id}`,
    title: org.name ? `Org — ${org.name}` : "Organization",
    summary: org.name ? `Editing ${org.name}` : undefined,
    fields: bridgeFields,
    setter: applyBridgeField,
  });

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            AUM (USD)
          </div>
          <InlineEditableField
            type="text"
            value={aum}
            onSave={saveAum}
            placeholder="—"
          />
        </div>
        <div>
          <div
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Target Commitment
          </div>
          <InlineEditableField
            type="text"
            value={target}
            onSave={saveTarget}
            placeholder="—"
          />
        </div>
      </div>

      <div>
        <div
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          Tags
        </div>
        <InlineEditableField
          type="text"
          value={tags}
          onSave={saveTags}
          placeholder="comma,separated,tags"
        />
      </div>

      <div>
        <div
          className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          Notes
        </div>
        <InlineEditableField
          type="textarea"
          value={notes}
          onSave={saveNotes}
          placeholder="Click to add notes…"
          rows={4}
        />
      </div>
    </div>
  );
}
