import { getPersonDetail } from "@/db/queries/people";
import { notFound } from "next/navigation";

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

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPersonDetail(id);
  if (!data) notFound();

  const { person, affiliations, channels, interactions: ints } = data;

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left panel — person + org info */}
        <div className="col-span-1 space-y-6">
          {/* Person card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h1 className="text-lg font-semibold">{person.fullName}</h1>
            {person.fullNameZh && person.fullNameZh !== person.fullName && (
              <p className="text-sm text-zinc-400 mt-0.5">{person.fullNameZh}</p>
            )}
            {person.title && (
              <p className="text-sm text-zinc-400 mt-0.5">{person.title}</p>
            )}
            {person.relationshipStrength && (
              <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded capitalize bg-zinc-800 text-zinc-400">
                {person.relationshipStrength}
                {person.relationshipScore ? ` · ${person.relationshipScore}/100` : ""}
              </span>
            )}
            <div className="mt-3 space-y-1.5 text-sm">
              {person.email && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Email</span>
                  {person.email}
                </div>
              )}
              {person.phone && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Phone</span>
                  {person.phone}
                </div>
              )}
              {person.wechat && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">WeChat</span>
                  {person.wechat}
                </div>
              )}
              {person.telegram && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Telegram</span>
                  {person.telegram}
                </div>
              )}
              {person.linkedin && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">LinkedIn</span>
                  {person.linkedin}
                </div>
              )}
              {person.introducedByName && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Intro by</span>
                  {person.introducedByName}
                </div>
              )}
              {person.introChain && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 text-xs mr-2">Chain</span>
                  {person.introChain}
                </div>
              )}
            </div>
            {/* Additional channels */}
            {channels.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-2">Contact Channels</div>
                {channels.map((ch) => (
                  <div key={ch.id} className="text-sm text-zinc-400">
                    <span className="text-zinc-600 text-xs mr-2 capitalize">{ch.channelType}</span>
                    {ch.value}
                    {ch.label && <span className="text-zinc-600 text-xs ml-1">({ch.label})</span>}
                    {ch.isPreferred && <span className="text-amber-500 text-xs ml-1">★</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Affiliations */}
          {affiliations.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                Organizations ({affiliations.length})
              </h3>
              <div className="space-y-3">
                {affiliations.map((a) => (
                  <div
                    key={a.affiliation.id}
                    className="cursor-pointer hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded transition-colors"
                    onClick={() => {
                      // Client nav not available in server component
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-200">
                        {a.orgName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
                        {a.orgType}
                      </span>
                    </div>
                    {a.affiliation.title && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {a.affiliation.title}
                        {a.affiliation.role && ` · ${a.affiliation.role}`}
                      </p>
                    )}
                    {a.orgHeadquarters && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {a.orgHeadquarters}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {person.notes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Notes</h3>
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">{person.notes}</p>
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
