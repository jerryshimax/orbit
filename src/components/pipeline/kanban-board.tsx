"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { LPCardComponent } from "./lp-card";
import { StageBadge } from "../shared/stage-badge";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { OrgWithMeta } from "@/db/queries/organizations";

function StageColumn({
  stage,
  cards,
  sparklines,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  cards: OrgWithMeta[];
  sparklines: Record<string, number[]>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  const stageTarget = cards.reduce(
    (sum, c) => sum + parseFloat(c.targetCommitment ?? "0"),
    0
  );

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 rounded-xl transition-colors"
      style={{
        background: isOver ? "var(--accent-surface)" : "var(--bg-surface-hover)",
        border: isOver
          ? "1.5px dashed var(--accent)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {/* Column header */}
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <StageBadge stage={stage.key} />
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {cards.length}
          </span>
        </div>
        {stageTarget > 0 && (
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {formatMoney(stageTarget)}
          </span>
        )}
      </div>

      {/* Cards */}
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[120px]">
          {cards.map((card) => (
            <LPCardComponent
              key={card.id}
              card={card}
              sparklineData={sparklines[card.id]}
            />
          ))}
          {cards.length === 0 && (
            <div
              className="text-xs text-center py-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  orgs,
  sparklines,
  onStageChange,
}: {
  orgs: OrgWithMeta[];
  sparklines: Record<string, number[]>;
  onStageChange: (orgId: string, newStage: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const activeCard = activeId ? orgs.find((o) => o.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const orgId = String(active.id);
      const org = orgs.find((o) => o.id === orgId);
      if (!org) return;

      // Check if dropped on a stage column
      const orgStage = org.primaryOpportunity?.stage ?? "prospect";
      const targetStage = PIPELINE_STAGES.find((s) => s.key === over.id);
      if (targetStage && targetStage.key !== orgStage) {
        onStageChange(orgId, targetStage.key);
        return;
      }

      // Check if dropped on another card — get that card's stage
      const targetCard = orgs.find((o) => o.id === String(over.id));
      const targetCardStage = targetCard?.primaryOpportunity?.stage ?? "prospect";
      if (targetCard && targetCardStage !== orgStage) {
        onStageChange(orgId, targetCardStage);
      }
    },
    [orgs, onStageChange]
  );

  // Only show active pipeline stages (exclude passed)
  const activeStages = PIPELINE_STAGES.filter((s) => s.key !== "passed");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const stageCards = orgs.filter((o) => (o.primaryOpportunity?.stage ?? "prospect") === stage.key);
          return (
            <StageColumn
              key={stage.key}
              stage={stage}
              cards={stageCards}
              sparklines={sparklines}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard && (
          <div style={{ width: 272 }}>
            <LPCardComponent
              card={activeCard}
              sparklineData={sparklines[activeCard.id]}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
