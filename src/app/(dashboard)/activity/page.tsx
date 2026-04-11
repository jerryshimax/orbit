export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { interactions, organizations, people } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

const INTERACTION_ICONS: Record<string, string> = {
  meeting: "M",
  call: "C",
  email: "E",
  conference: "CF",
  intro: "I",
  dd_session: "DD",
  deck_sent: "D",
  follow_up: "F",
  commitment: "$",
  note: "N",
  telegram_message: "T",
  wechat_message: "W",
  site_visit: "SV",
  dinner: "D",
  board_meeting: "B",
};

async function getActivity(entityCode?: string) {
  const conditions = [];
  if (entityCode) {
    conditions.push(eq(interactions.entityCode, entityCode));
  }

  const rows = await db
    .select({
      id: interactions.id,
      type: interactions.interactionType,
      summary: interactions.summary,
      teamMember: interactions.teamMember,
      date: interactions.interactionDate,
      location: interactions.location,
      source: interactions.source,
      entityCode: interactions.entityCode,
      orgName: organizations.name,
      personName: people.fullName,
      personId: people.id,
    })
    .from(interactions)
    .leftJoin(organizations, eq(interactions.orgId, organizations.id))
    .leftJoin(people, eq(interactions.personId, people.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(interactions.interactionDate))
    .limit(100);

  return rows;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity } = await searchParams;
  const activity = await getActivity(entity);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Activity</h1>
        <span className="text-sm text-zinc-400">
          {activity.length} interactions
        </span>
      </div>

      <div className="space-y-3">
        {activity.map((a) => (
          <div
            key={a.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium shrink-0">
                {INTERACTION_ICONS[a.type] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    {new Date(a.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span>{a.type.replace("_", " ")}</span>
                  <span className="text-zinc-700">·</span>
                  <span>{a.teamMember}</span>
                  {a.location && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span>{a.location}</span>
                    </>
                  )}
                  <span className="text-zinc-700">·</span>
                  <span className="text-zinc-600">{a.source}</span>
                  {a.entityCode && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-zinc-600">{a.entityCode}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {a.orgName && (
                    <span className="text-xs font-medium text-zinc-300">
                      {a.orgName}
                    </span>
                  )}
                  {a.personName && (
                    <span className="text-xs text-zinc-500">
                      {a.personName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-200 mt-1">{a.summary}</p>
              </div>
            </div>
          </div>
        ))}
        {activity.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-12">
            No activity yet. Log an interaction via Cloud to get started.
          </div>
        )}
      </div>
    </div>
  );
}
