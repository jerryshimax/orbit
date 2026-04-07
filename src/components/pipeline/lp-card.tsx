"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OrgWithMeta } from "@/db/queries/organizations";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { Sparkline } from "@/components/shared/sparkline";
import { formatMoney } from "@/lib/format";
import { LP_TYPES } from "@/lib/constants";

export function LPCardComponent({
  card,
  sparklineData,
}: {
  card: OrgWithMeta;
  sparklineData?: number[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="p-3 rounded-lg cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
      data-org-id={card.id}
      role="button"
      tabIndex={0}
      onDoubleClick={() => {
        window.location.href = `/organizations/${card.id}`;
      }}
      title="Drag to move stage. Double-click for details."
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header: name + type */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-medium leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {card.name}
        </span>
        <WarmthDot daysSinceTouch={card.daysSinceInteraction} size={6} />
      </div>

      {/* Type badge + commitment */}
      <div className="flex items-center gap-2 mt-1.5">
        {card.lpType && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--bg-surface-hover)",
              color: "var(--text-tertiary)",
            }}
          >
            {LP_TYPES[card.lpType] ?? card.lpType}
          </span>
        )}
        {card.targetCommitment && parseFloat(card.targetCommitment) > 0 && (
          <span
            className="text-xs tabular-nums font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {formatMoney(card.targetCommitment)}
          </span>
        )}
      </div>

      {/* Primary contact */}
      {card.primaryContact && (
        <div
          className="text-xs mt-1.5 truncate"
          style={{ color: "var(--text-tertiary)" }}
        >
          {card.primaryContact}
          {card.primaryTitle && ` · ${card.primaryTitle}`}
        </div>
      )}

      {/* Footer: owner + sparkline */}
      <div className="flex items-center justify-between mt-2">
        {card.relationshipOwner && (
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {card.relationshipOwner}
          </span>
        )}
        {sparklineData && <Sparkline data={sparklineData} width={52} height={14} />}
      </div>
    </div>
  );
}
