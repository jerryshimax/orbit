"use client";

import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { mutate } from "swr";
import { useCallback } from "react";

export default function PipelinePage() {
  const { data: orgs } = useOrganizations();
  const { data: pipeline } = usePipelineSummary();

  const handleStageChange = useCallback(
    async (orgId: string, newStage: string) => {
      // Optimistic update
      if (orgs) {
        const updated = orgs.map((o) =>
          o.id === orgId ? { ...o, stage: newStage } : o
        );
        mutate("/api/organizations", updated, false);
      }

      // Server update
      await fetch(`/api/organizations/${orgId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, changedBy: "jerry" }),
      });

      // Revalidate
      mutate("/api/organizations");
      mutate("/api/pipeline/summary");
    },
    [orgs]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Pipeline
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Drag cards between columns to move stages
        </p>
      </div>

      {orgs && pipeline && (
        <KanbanBoard
          orgs={orgs.filter((o) => o.stage !== "passed")}
          sparklines={pipeline.sparklines ?? {}}
          onStageChange={handleStageChange}
        />
      )}

      {!orgs && (
        <div
          className="p-12 text-center text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          Loading pipeline...
        </div>
      )}
    </div>
  );
}
