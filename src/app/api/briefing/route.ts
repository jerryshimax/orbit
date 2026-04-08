import { NextRequest } from "next/server";
import { getOrganizations } from "@/db/queries/organizations";
import { db } from "@/db";
import { people, personOrgAffiliations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";

const BRAIN_DIR = join(
  process.env.HOME ?? "/Users/jerryshi",
  "Work/[00] Brain"
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { objective, location, tags } = body;

  if (!objective) {
    return Response.json(
      { error: "Objective is required" },
      { status: 400 }
    );
  }

  // 1. Get all organizations
  const orgs = await getOrganizations();

  // 2. Get all people with their org affiliations
  const orgIds = orgs.map((o) => o.id);
  const allAffils = orgIds.length > 0
    ? await db
        .select({
          orgId: personOrgAffiliations.organizationId,
          fullName: people.fullName,
          title: personOrgAffiliations.title,
          introducedByName: people.introducedByName,
        })
        .from(personOrgAffiliations)
        .innerJoin(people, eq(personOrgAffiliations.personId, people.id))
        .where(inArray(personOrgAffiliations.organizationId, orgIds))
    : [];
  const contactsByOrg: Record<string, typeof allAffils> = {};
  for (const a of allAffils) {
    const key = a.orgId;
    if (!contactsByOrg[key]) contactsByOrg[key] = [];
    contactsByOrg[key].push(a);
  }

  // 3. Try to find relevant Brain files for each org
  let brainFiles: string[] = [];
  try {
    brainFiles = await readdir(BRAIN_DIR);
  } catch {
    // Brain dir not accessible
  }

  // 4. Build context for each org
  const orgProfiles = await Promise.all(
    orgs.slice(0, 60).map(async (org) => {
      const contacts = contactsByOrg[org.id] ?? [];

      // Find related brain files
      let brainContext = "";
      const relatedFiles = brainFiles.filter(
        (f) =>
          f.endsWith(".md") &&
          (f.toLowerCase().includes(org.name.toLowerCase()) ||
            contacts.some((c) =>
              f.toLowerCase().includes(c.fullName.toLowerCase())
            ))
      );

      for (const f of relatedFiles.slice(0, 2)) {
        try {
          const content = await readFile(join(BRAIN_DIR, f), "utf-8");
          brainContext += `\n--- ${f} ---\n${content.slice(0, 1000)}\n`;
        } catch {
          // skip
        }
      }

      return {
        orgId: org.id,
        orgName: org.name,
        lpType: org.lpType,
        stage: org.primaryOpportunity?.stage ?? "prospect",
        headquarters: org.headquarters,
        targetCommitment: org.targetCommitment,
        notes: org.notes,
        tags: org.tags,
        sectorFocus: org.sectorFocus,
        geographyFocus: org.geographyFocus,
        contacts: contacts.map((c) => ({
          name: c.fullName,
          title: c.title,
          introducedBy: c.introducedByName,
        })),
        daysSinceInteraction: org.daysSinceInteraction,
        brainContext: brainContext || null,
      };
    })
  );

  // 5. Call Claude API for strategic matching
  const client = new Anthropic();

  const prompt = `You are a strategic relationship advisor for a PE fund (Current Equities) raising a $300-500M infrastructure fund focused on behind-the-meter energy for AI data centers.

OBJECTIVE: ${objective}
${location ? `LOCATION: ${location}` : ""}
${tags ? `FOCUS AREAS: ${tags}` : ""}

Below are the LP organizations and contacts in the pipeline. For each that is strategically relevant to this objective, rate them 1-5 on strategic fit and explain WHY in one specific sentence.

ORGANIZATIONS:
${JSON.stringify(orgProfiles, null, 2)}

Return a JSON array of the top 10-15 most strategically relevant matches, ranked by fit. Format:
[
  {
    "orgId": "uuid",
    "orgName": "name",
    "contactName": "primary contact name",
    "contactTitle": "their title",
    "strategicFit": 5,
    "reason": "Specific one-sentence reason why this person/org matters for this objective",
    "recommendedAsk": "What to discuss or ask for in the meeting",
    "introPath": "How to reach them (warm intro via X, or direct)"
  }
]

Only include orgs that are genuinely relevant. Be specific — reference details from Brain notes when available.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      return Response.json({ results, objective, location });
    }

    return Response.json({ results: [], raw: text, objective, location });
  } catch (err: any) {
    return Response.json(
      { error: `Claude API error: ${err.message}`, results: [] },
      { status: 500 }
    );
  }
}
