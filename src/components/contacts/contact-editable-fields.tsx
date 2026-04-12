"use client";

import { useCallback, useMemo, useState } from "react";
import { InlineEditableField } from "@/components/shared/inline-editable-field";
import { useRegisterPageFields } from "@/lib/chat/page-bridge";

type PersonSeed = {
  id: string;
  fullName?: string | null;
  notes?: string | null;
  relationshipStrength?: string | null;
  tags?: string[] | null;
};

const STRENGTH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "strong", label: "Strong" },
  { value: "medium", label: "Medium" },
  { value: "weak", label: "Weak" },
  { value: "cold", label: "Cold" },
];

/**
 * Client wrapper that mounts on the server-rendered contact page.
 * Exposes editable notes, relationship strength, and tags — both inline in the
 * UI and to Cloud via PageBridge.
 */
export function ContactEditableFields({ person }: { person: PersonSeed }) {
  const [notes, setNotes] = useState(person.notes ?? "");
  const [strength, setStrength] = useState(person.relationshipStrength ?? "weak");
  const [tags, setTags] = useState((person.tags ?? []).join(", "));

  const patch = useCallback(
    async (updates: Record<string, unknown>) => {
      await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    [person.id]
  );

  const saveNotes = useCallback(
    async (v: string) => {
      setNotes(v);
      await patch({ notes: v });
    },
    [patch]
  );

  const saveStrength = useCallback(
    async (v: string) => {
      setStrength(v);
      await patch({ relationshipStrength: v });
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
        placeholder: "Relationship notes, context, history…",
      },
      {
        name: "relationshipStrength",
        label: "Relationship Strength",
        type: "select" as const,
        value: strength,
        options: STRENGTH_OPTIONS.map((o) => o.value),
      },
      {
        name: "tags",
        label: "Tags",
        type: "text" as const,
        value: tags,
        placeholder: "comma,separated,tags",
      },
    ],
    [notes, strength, tags]
  );

  const applyBridgeField = useCallback(
    (field: string, value: string) => {
      if (field === "notes") void saveNotes(value);
      else if (field === "relationshipStrength") void saveStrength(value);
      else if (field === "tags") void saveTags(value);
    },
    [saveNotes, saveStrength, saveTags]
  );

  useRegisterPageFields({
    route: `/contacts/${person.id}`,
    title: person.fullName
      ? `Contact — ${person.fullName}`
      : "Contact",
    summary: person.fullName
      ? `Editing ${person.fullName}`
      : undefined,
    fields: bridgeFields,
    setter: applyBridgeField,
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">CRM</h3>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          Relationship Strength
        </div>
        <InlineEditableField
          type="select"
          value={strength}
          onSave={saveStrength}
          options={STRENGTH_OPTIONS}
        />
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
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
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
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
