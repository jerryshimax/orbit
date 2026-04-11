"use client";

import { useEntity, type EntityCode } from "./entity-provider";
import { cn } from "@/lib/cn";

const ENTITIES: { code: EntityCode; label: string; color: string }[] = [
  { code: "All", label: "All", color: "var(--text-tertiary)" },
  { code: "CE", label: "CE", color: "#d4a017" },
  { code: "SYN", label: "SYN", color: "#5b9cf5" },
  { code: "UUL", label: "UUL", color: "#34d399" },
  { code: "FO", label: "FO", color: "#a78bfa" },
];

const ENTITY_LABELS: Record<EntityCode, string> = {
  All: "All Entities",
  CE: "Current Equities",
  SYN: "Synergis Capital",
  UUL: "UUL Global",
  FO: "Family Office",
};

export function EntitySwitcher({ collapsed }: { collapsed?: boolean }) {
  const { entity, setEntity } = useEntity();
  const active = ENTITIES.find((e) => e.code === entity) ?? ENTITIES[0];

  if (collapsed) {
    return (
      <button
        onClick={() => {
          const idx = ENTITIES.findIndex((e) => e.code === entity);
          setEntity(ENTITIES[(idx + 1) % ENTITIES.length].code);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-[10px] font-bold font-[Space_Grotesk] transition-colors hover:brightness-110"
        style={{ background: `${active.color}20`, color: active.color }}
        title={ENTITY_LABELS[entity]}
      >
        {entity === "All" ? "*" : entity}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {ENTITIES.map((e) => (
          <button
            key={e.code}
            onClick={() => setEntity(e.code)}
            className={cn(
              "flex-1 py-1.5 rounded-md text-[10px] font-bold font-[Space_Grotesk] transition-all",
              entity === e.code ? "scale-[1.02]" : "opacity-50 hover:opacity-80"
            )}
            style={{
              background:
                entity === e.code ? `${e.color}20` : "transparent",
              color: e.color,
            }}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div
        className="text-[10px] font-[Space_Grotesk] tracking-wide"
        style={{ color: active.color }}
      >
        {ENTITY_LABELS[entity]}
      </div>
    </div>
  );
}
