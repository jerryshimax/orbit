import { NextRequest } from "next/server";
import { db } from "@/db";
import { organizations, people } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return Response.json({ organizations: [], people: [] });
  }

  const pattern = `%${q}%`;

  const [orgs, ppl] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        nameZh: organizations.nameZh,
        orgType: organizations.orgType,
        headquarters: organizations.headquarters,
      })
      .from(organizations)
      .where(
        sql`${organizations.name} ILIKE ${pattern}
            OR ${organizations.nameZh} ILIKE ${pattern}
            OR ${organizations.notes} ILIKE ${pattern}
            OR array_to_string(${organizations.tags}, ',') ILIKE ${pattern}`
      )
      .limit(10),
    db
      .select({
        id: people.id,
        name: people.fullName,
        nameZh: people.fullNameZh,
        title: people.title,
      })
      .from(people)
      .where(
        sql`${people.fullName} ILIKE ${pattern}
            OR ${people.fullNameZh} ILIKE ${pattern}
            OR ${people.title} ILIKE ${pattern}`
      )
      .limit(10),
  ]);

  return Response.json({ organizations: orgs, people: ppl });
}
