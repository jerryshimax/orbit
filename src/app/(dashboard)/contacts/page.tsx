import { db } from "@/db";
import { lpOrganizations, lpContacts, interactions } from "@/db/schema";
import { eq, sql, desc, asc } from "drizzle-orm";
import Link from "next/link";
import { StageBadge } from "@/components/shared/stage-badge";

async function getContacts() {
  const contacts = await db
    .select({
      id: lpContacts.id,
      fullName: lpContacts.fullName,
      title: lpContacts.title,
      email: lpContacts.email,
      relationship: lpContacts.relationship,
      lastInteractionAt: lpContacts.lastInteractionAt,
      orgId: lpOrganizations.id,
      orgName: lpOrganizations.name,
      orgStage: lpOrganizations.pipelineStage,
      orgOwner: lpOrganizations.relationshipOwner,
    })
    .from(lpContacts)
    .leftJoin(
      lpOrganizations,
      eq(lpContacts.organizationId, lpOrganizations.id)
    )
    .orderBy(asc(lpContacts.fullName));

  return contacts;
}

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Contacts</h1>
        <span className="text-sm text-zinc-400">{contacts.length} contacts</span>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Organization</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium">Stage</th>
              <th className="text-left px-4 py-2 font-medium">Last Touch</th>
              <th className="text-left px-4 py-2 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const daysSince = c.lastInteractionAt
                ? Math.floor(
                    (Date.now() - new Date(c.lastInteractionAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;
              const isStale = daysSince !== null && daysSince > 14;

              return (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-white hover:text-blue-400 transition-colors font-medium"
                    >
                      {c.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {c.orgName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.orgStage && <StageBadge stage={c.orgStage} />}
                  </td>
                  <td className="px-4 py-3">
                    {daysSince !== null ? (
                      <span
                        className={
                          isStale ? "text-red-400" : "text-zinc-400"
                        }
                      >
                        {daysSince}d ago
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs uppercase tracking-wide">
                    {c.orgOwner ?? "—"}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No contacts yet. Log an LP interaction via Cloud to get
                  started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
