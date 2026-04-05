import { db } from "@/db";
import {
  lpContacts,
  lpOrganizations,
  interactions,
  pipelineHistory,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { StageBadge } from "@/components/shared/stage-badge";

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
};

async function getContactDetail(id: string) {
  const [contact] = await db
    .select()
    .from(lpContacts)
    .where(eq(lpContacts.id, id))
    .limit(1);

  if (!contact) return null;

  const org = contact.organizationId
    ? (
        await db
          .select()
          .from(lpOrganizations)
          .where(eq(lpOrganizations.id, contact.organizationId))
          .limit(1)
      )[0]
    : null;

  const orgInteractions = org
    ? await db
        .select()
        .from(interactions)
        .where(eq(interactions.organizationId, org.id))
        .orderBy(desc(interactions.interactionDate))
        .limit(50)
    : [];

  const history = org
    ? await db
        .select()
        .from(pipelineHistory)
        .where(eq(pipelineHistory.organizationId, org.id))
        .orderBy(desc(pipelineHistory.createdAt))
    : [];

  const otherContacts = org
    ? await db
        .select()
        .from(lpContacts)
        .where(eq(lpContacts.organizationId, org.id))
    : [];

  return { contact, org, interactions: orgInteractions, history, otherContacts };
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getContactDetail(id);
  if (!data) notFound();

  const { contact, org, interactions: ints, history, otherContacts } = data;

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left panel — contact + org info */}
        <div className="col-span-1 space-y-6">
          {/* Contact card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h1 className="text-lg font-semibold">{contact.fullName}</h1>
            {contact.title && (
              <p className="text-sm text-zinc-400 mt-0.5">{contact.title}</p>
            )}
            <div className="mt-3 space-y-1.5 text-sm">
              {contact.email && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Email</span>
                  {contact.email}
                </div>
              )}
              {contact.phone && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Phone</span>
                  {contact.phone}
                </div>
              )}
              {contact.linkedIn && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">LinkedIn</span>
                  {contact.linkedIn}
                </div>
              )}
              {contact.source && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Source</span>
                  {contact.source}
                </div>
              )}
              {contact.introducedBy && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Intro by</span>
                  {contact.introducedBy}
                </div>
              )}
            </div>
          </div>

          {/* Org card */}
          {org && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{org.name}</h2>
                <StageBadge stage={org.pipelineStage} />
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                {org.lpType && (
                  <div className="text-zinc-300">
                    <span className="text-zinc-500 text-xs mr-2">Type</span>
                    {org.lpType.replace("_", " ")}
                  </div>
                )}
                {org.aumUsd && (
                  <div className="text-zinc-300">
                    <span className="text-zinc-500 text-xs mr-2">AUM</span>$
                    {parseFloat(org.aumUsd) >= 1000
                      ? `${(parseFloat(org.aumUsd) / 1000).toFixed(1)}B`
                      : `${parseFloat(org.aumUsd).toFixed(0)}M`}
                  </div>
                )}
                {org.targetCommitment && (
                  <div className="text-zinc-300">
                    <span className="text-zinc-500 text-xs mr-2">Target</span>$
                    {parseFloat(org.targetCommitment).toFixed(0)}M
                  </div>
                )}
                {org.actualCommitment &&
                  parseFloat(org.actualCommitment) > 0 && (
                    <div className="text-emerald-400">
                      <span className="text-zinc-500 text-xs mr-2">
                        Committed
                      </span>
                      ${parseFloat(org.actualCommitment).toFixed(0)}M
                    </div>
                  )}
                {org.relationshipOwner && (
                  <div className="text-zinc-300">
                    <span className="text-zinc-500 text-xs mr-2">Owner</span>
                    {org.relationshipOwner}
                  </div>
                )}
              </div>

              {/* Other contacts at this org */}
              {otherContacts.length > 1 && (
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-2">
                    Other contacts
                  </div>
                  {otherContacts
                    .filter((c) => c.id !== contact.id)
                    .map((c) => (
                      <div key={c.id} className="text-sm text-zinc-400">
                        {c.fullName}
                        {c.title && (
                          <span className="text-zinc-600"> · {c.title}</span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Pipeline history */}
          {history.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                Pipeline History
              </h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="text-xs">
                    <span className="text-zinc-500">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-zinc-400 mx-1">
                      {h.fromStage ?? "—"} → {h.toStage}
                    </span>
                    <span className="text-zinc-600">by {h.changedBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — interaction timeline */}
        <div className="col-span-2">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Interactions ({ints.length})
          </h2>
          <div className="space-y-3">
            {ints.map((interaction) => (
              <div
                key={interaction.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium shrink-0">
                    {INTERACTION_ICONS[interaction.interactionType] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>
                        {new Date(
                          interaction.interactionDate
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span>{interaction.interactionType.replace("_", " ")}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{interaction.teamMember}</span>
                      {interaction.location && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span>{interaction.location}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-zinc-200 mt-1">
                      {interaction.summary}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {ints.length === 0 && (
              <div className="text-sm text-zinc-500 text-center py-8">
                No interactions logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
