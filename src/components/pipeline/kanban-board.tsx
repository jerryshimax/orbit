"use client";

import type { LPCard } from "@/app/(dashboard)/page";
import { LPCardComponent } from "./lp-card";
import { StageBadge } from "../shared/stage-badge";

type Stage = { key: string; label: string };

export function KanbanBoard({
  cards,
  stages,
}: {
  cards: LPCard[];
  stages: readonly Stage[];
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageCards = cards.filter((c) => c.stage === stage.key);
        const stageTarget = stageCards.reduce(
          (sum, c) => sum + parseFloat(c.targetCommitment ?? "0"),
          0
        );

        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-72 bg-zinc-900/50 rounded-lg border border-zinc-800"
          >
            {/* Column header */}
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StageBadge stage={stage.key} />
                <span className="text-xs text-zinc-500">
                  {stageCards.length}
                </span>
              </div>
              {stageTarget > 0 && (
                <span className="text-xs text-zinc-500">
                  ${stageTarget >= 1000
                    ? `${(stageTarget / 1000).toFixed(1)}B`
                    : `${stageTarget.toFixed(0)}M`}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px]">
              {stageCards.map((card) => (
                <LPCardComponent key={card.id} card={card} />
              ))}
              {stageCards.length === 0 && (
                <div className="text-xs text-zinc-600 text-center py-8">
                  No LPs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
