"use client";

import { useOrganizations } from "@/hooks/use-organizations";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { useEntity } from "@/components/shared/entity-provider";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { mutate } from "swr";
import { useCallback } from "react";

export default function PipelinePage() {
  const { entityParam } = useEntity();
  const { data: orgs } = useOrganizations({ entity: entityParam });
  const { data: pipeline } = usePipelineSummary({ entity: entityParam });

  const orgKey = entityParam
    ? `/api/organizations?entity=${entityParam}`
    : "/api/organizations";
  const pipelineKey = entityParam
    ? `/api/pipeline/summary?entity=${entityParam}`
    : "/api/pipeline/summary";

  const handleStageChange = useCallback(
    async (orgId: string, newStage: string) => {
      // Optimistic update
      if (orgs) {
        const updated = orgs.map((o) =>
          o.id === orgId
            ? {
                ...o,
                primaryOpportunity: o.primaryOpportunity
                  ? { ...o.primaryOpportunity, stage: newStage }
                  : null,
              }
            : o
        );
        mutate(orgKey, updated, false);
      }

      // Server update — routes through opportunities now
      await fetch(`/api/organizations/${orgId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, changedBy: "jerry" }),
      });

      // Revalidate
      mutate(orgKey);
      mutate(pipelineKey);
    },
    [orgs, orgKey, pipelineKey]
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
          orgs={orgs.filter((o) => (o.primaryOpportunity?.stage ?? "prospect") !== "passed")}
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
