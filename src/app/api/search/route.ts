import { NextRequest } from "next/server";
import { db } from "@/db";
import { lpOrganizations, lpContacts } from "@/db/schema";
import { ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return Response.json({ organizations: [], contacts: [] });
  }

  const pattern = `%${q}%`;

  const [orgs, contacts] = await Promise.all([
    db
      .select({
        id: lpOrganizations.id,
        name: lpOrganizations.name,
        stage: lpOrganizations.pipelineStage,
        lpType: lpOrganizations.lpType,
      })
      .from(lpOrganizations)
      .where(
        sql`${lpOrganizations.name} ILIKE ${pattern}
            OR ${lpOrganizations.notes} ILIKE ${pattern}
            OR array_to_string(${lpOrganizations.tags}, ',') ILIKE ${pattern}`
      )
      .limit(10),
    db
      .select({
        id: lpContacts.id,
        name: lpContacts.fullName,
        title: lpContacts.title,
        orgId: lpContacts.organizationId,
      })
      .from(lpContacts)
      .where(
        sql`${lpContacts.fullName} ILIKE ${pattern}
            OR ${lpContacts.title} ILIKE ${pattern}`
      )
      .limit(10),
  ]);

  return Response.json({ organizations: orgs, contacts });
}
