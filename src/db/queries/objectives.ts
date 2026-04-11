import { db } from "@/db";
import { objectives, keyResults } from "@/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";

export async function getObjectives(opts?: {
  status?: string;
  entityCode?: string;
  owner?: string;
}) {
  const conditions = [];
  if (opts?.status) conditions.push(eq(objectives.status, opts.status));
  if (opts?.entityCode)
    conditions.push(eq(objectives.entityCode, opts.entityCode));
  if (opts?.owner) conditions.push(eq(objectives.owner, opts.owner));

  const objs = await db
    .select()
    .from(objectives)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(objectives.priority), asc(objectives.deadline));

  if (objs.length === 0) return [];

  const krs = await db
    .select()
    .from(keyResults)
    .where(
      inArray(
        keyResults.objectiveId,
        objs.map((o) => o.id)
      )
    );

  const krsByObj: Record<string, (typeof krs)[number][]> = {};
  for (const kr of krs) {
    if (!krsByObj[kr.objectiveId]) krsByObj[kr.objectiveId] = [];
    krsByObj[kr.objectiveId].push(kr);
  }

  return objs.map((o) => ({
    ...o,
    keyResults: krsByObj[o.id] ?? [],
    progress: calculateProgress(krsByObj[o.id] ?? []),
  }));
}

function calculateProgress(
  krs: Array<{ targetValue: string | null; currentValue: string | null }>
): number {
  if (krs.length === 0) return 0;
  let total = 0;
  for (const kr of krs) {
    const target = Number(kr.targetValue ?? 0);
    const current = Number(kr.currentValue ?? 0);
    if (target > 0) total += Math.min(current / target, 1);
  }
  return Math.round((total / krs.length) * 100);
}

export async function getObjectiveDetail(id: string) {
  const [obj] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, id))
    .limit(1);

  if (!obj) return null;

  const krs = await db
    .select()
    .from(keyResults)
    .where(eq(keyResults.objectiveId, id));

  return { ...obj, keyResults: krs, progress: calculateProgress(krs) };
}
