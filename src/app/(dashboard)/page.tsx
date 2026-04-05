import { db } from "@/db";
import { lpOrganizations, lpContacts, interactions } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { KanbanBoard } from "@/components/pipeline/kanban-board";

const STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "intro", label: "Intro" },
  { key: "meeting", label: "Meeting" },
  { key: "dd", label: "DD" },
  { key: "soft_circle", label: "Soft Circle" },
  { key: "committed", label: "Committed" },
  { key: "closed", label: "Closed" },
] as const;

export type LPCard = {
  id: string;
  name: string;
  lpType: string | null;
  stage: string;
  targetCommitment: string | null;
  actualCommitment: string | null;
  primaryContact: string | null;
  primaryTitle: string | null;
  owner: string | null;
  daysSinceInteraction: number | null;
};

async function getPipelineData() {
  const orgs = await db
    .select({
      id: lpOrganizations.id,
      name: lpOrganizations.name,
      lpType: lpOrganizations.lpType,
      stage: lpOrganizations.pipelineStage,
      targetCommitment: lpOrganizations.targetCommitment,
      actualCommitment: lpOrganizations.actualCommitment,
      owner: lpOrganizations.relationshipOwner,
    })
    .from(lpOrganizations)
    .where(sql`${lpOrganizations.pipelineStage} != 'passed'`)
    .orderBy(lpOrganizations.name);

  const cards: LPCard[] = [];

  for (const org of orgs) {
    // Get primary contact
    const contact = await db
      .select({
        name: lpContacts.fullName,
        title: lpContacts.title,
      })
      .from(lpContacts)
      .where(eq(lpContacts.organizationId, org.id))
      .orderBy(desc(lpContacts.isPrimary))
      .limit(1);

    // Get last interaction date
    const lastInteraction = await db
      .select({
        maxDate: sql<string>`max(${interactions.interactionDate})`,
      })
      .from(interactions)
      .where(eq(interactions.organizationId, org.id));

    const lastDate = lastInteraction[0]?.maxDate;
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    cards.push({
      id: org.id,
      name: org.name,
      lpType: org.lpType,
      stage: org.stage,
      targetCommitment: org.targetCommitment,
      actualCommitment: org.actualCommitment,
      primaryContact: contact[0]?.name ?? null,
      primaryTitle: contact[0]?.title ?? null,
      owner: org.owner,
      daysSinceInteraction: daysSince,
    });
  }

  // Summary stats
  const totalTarget = orgs.reduce(
    (sum, o) => sum + parseFloat(o.targetCommitment ?? "0"),
    0
  );
  const totalCommitted = orgs
    .filter((o) => o.stage === "committed" || o.stage === "closed")
    .reduce((sum, o) => sum + parseFloat(o.actualCommitment ?? "0"), 0);

  return { cards, stages: STAGES, totalTarget, totalCommitted };
}

export default async function PipelinePage() {
  const { cards, stages, totalTarget, totalCommitted } =
    await getPipelineData();

  return (
    <div className="p-6">
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div className="text-zinc-400">
          <span className="text-white font-medium">{cards.length}</span> LPs in
          pipeline
        </div>
        <div className="text-zinc-400">
          Target:{" "}
          <span className="text-white font-medium">
            ${totalTarget >= 1000
              ? `${(totalTarget / 1000).toFixed(1)}B`
              : `${totalTarget.toFixed(0)}M`}
          </span>
        </div>
        <div className="text-zinc-400">
          Committed:{" "}
          <span className="text-emerald-400 font-medium">
            ${totalCommitted >= 1000
              ? `${(totalCommitted / 1000).toFixed(1)}B`
              : `${totalCommitted.toFixed(0)}M`}
          </span>
          <span className="text-zinc-500 ml-1">/ $300-500M</span>
        </div>
      </div>

      {/* Kanban board */}
      <KanbanBoard cards={cards} stages={stages} />
    </div>
  );
}
