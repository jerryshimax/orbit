"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRegisterPageFields } from "@/lib/chat/page-bridge";

const PROJECT_TYPES = [
  { value: "lp_campaign", label: "LP Campaign" },
  { value: "deal_strategy", label: "Deal Strategy" },
  { value: "partnership", label: "Partnership Play" },
  { value: "market_entry", label: "Market Entry" },
  { value: "meeting_prep", label: "Meeting Prep" },
  { value: "custom", label: "Custom" },
];

const ENTITIES = [
  { value: "", label: "None" },
  { value: "CE", label: "Current Equities" },
  { value: "SYN", label: "Synergis Capital" },
  { value: "UUL", label: "UUL Global" },
];

export default function NewReconPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [projectType, setProjectType] = useState("custom");
  const [entityCode, setEntityCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expose form state to Cloud so it can propose values via the PageBridge.
  const cloudFields = useMemo(
    () => [
      {
        name: "name",
        label: "Name",
        type: "text" as const,
        value: name,
        placeholder: "Tiger Global LP Campaign",
      },
      {
        name: "objective",
        label: "Objective",
        type: "textarea" as const,
        value: objective,
        placeholder: "Secure a $25M LP commitment from Tiger Global for CE Fund I",
      },
      {
        name: "projectType",
        label: "Type",
        type: "select" as const,
        value: projectType,
        options: PROJECT_TYPES.map((t) => t.value),
      },
      {
        name: "entityCode",
        label: "Entity",
        type: "select" as const,
        value: entityCode,
        options: ENTITIES.map((e) => e.value).filter(Boolean),
      },
    ],
    [name, objective, projectType, entityCode]
  );

  const applyCloudField = useCallback((field: string, value: string) => {
    switch (field) {
      case "name":
        setName(value);
        break;
      case "objective":
        setObjective(value);
        break;
      case "projectType":
        setProjectType(value);
        break;
      case "entityCode":
        setEntityCode(value);
        break;
    }
  }, []);

  useRegisterPageFields({
    route: "/recon/new",
    title: "New Recon",
    summary: `New Recon project${entityCode ? ` for ${entityCode}` : ""}`,
    fields: cloudFields,
    setter: applyCloudField,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/recon-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          objective: objective.trim() || undefined,
          projectType,
          entityCode: entityCode || undefined,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        router.push(`/recon/${project.id}`);
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="px-4 md:px-8 pt-8 pb-32 lg:pb-8 max-w-2xl mx-auto space-y-6">
      <a href="/recon" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Recon
      </a>

      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl" style={{ color: "var(--accent)" }}>strategy</span>
        <h1 className="font-[Manrope] text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          New Recon
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold block" style={{ color: "var(--text-tertiary)" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tiger Global LP Campaign"
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{ background: "#181c22", color: "var(--text-primary)", border: "1px solid #31353c" }}
            autoFocus
          />
        </div>

        {/* Objective */}
        <div className="space-y-1.5">
          <label className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold block" style={{ color: "var(--text-tertiary)" }}>
            Objective
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Secure a $25M LP commitment from Tiger Global for CE Fund I"
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-y"
            style={{ background: "#181c22", color: "var(--text-primary)", border: "1px solid #31353c" }}
          />
        </div>

        {/* Type + Entity row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold block" style={{ color: "var(--text-tertiary)" }}>
              Type
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none appearance-none"
              style={{ background: "#181c22", color: "var(--text-primary)", border: "1px solid #31353c" }}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.2em] font-bold block" style={{ color: "var(--text-tertiary)" }}>
              Entity
            </label>
            <select
              value={entityCode}
              onChange={(e) => setEntityCode(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none appearance-none"
              style={{ background: "#181c22", color: "var(--text-primary)", border: "1px solid #31353c" }}
            >
              {ENTITIES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-[Space_Grotesk] uppercase tracking-wider font-bold transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#412d00" }}
        >
          <span className="material-symbols-outlined text-[18px]">
            {submitting ? "hourglass_top" : "strategy"}
          </span>
          {submitting ? "Creating..." : "Create Recon"}
        </button>
      </form>
    </main>
  );
}
