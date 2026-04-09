/**
 * Shared tool handlers used by both the MCP server and the in-app Chat API.
 * Extracted from src/mcp/lp-crm-server.ts to avoid duplication.
 */

import { db } from "@/db";
import {
  organizations,
  people,
  personOrgAffiliations,
  opportunities,
  pipelineDefinitions,
  interactions,
  pipelineHistory,
} from "@/db/schema";
import { eq, ilike, sql, desc, asc, and, inArray } from "drizzle-orm";

// ── Helpers ────────────────────────────────────────────────────────────────

export async function fuzzyFindOrg(name: string) {
  const results = await db
    .select()
    .from(organizations)
    .where(
      sql`${organizations.name} ILIKE ${"%" + name + "%"}
          OR ${organizations.nameZh} ILIKE ${"%" + name + "%"}`
    )
    .limit(1);
  return results[0] ?? null;
}

export async function fuzzyFindPerson(name: string, orgId?: string) {
  if (orgId) {
    const results = await db
      .select({ person: people })
      .from(people)
      .innerJoin(
        personOrgAffiliations,
        eq(personOrgAffiliations.personId, people.id)
      )
      .where(
        and(
          sql`${people.fullName} ILIKE ${"%" + name + "%"}
              OR ${people.fullNameZh} ILIKE ${"%" + name + "%"}`,
          eq(personOrgAffiliations.organizationId, orgId)
        )
      )
      .limit(1);
    return results[0]?.person ?? null;
  }

  const results = await db
    .select()
    .from(people)
    .where(
      sql`${people.fullName} ILIKE ${"%" + name + "%"}
          OR ${people.fullNameZh} ILIKE ${"%" + name + "%"}`
    )
    .limit(1);
  return results[0] ?? null;
}

export async function getActiveOpportunity(orgId: string) {
  const [opp] = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.organizationId, orgId),
        eq(opportunities.status, "active")
      )
    )
    .orderBy(desc(opportunities.updatedAt))
    .limit(1);
  return opp ?? null;
}

export function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  if (n > 0) return `$${n.toFixed(0)}M`;
  return "$0";
}

// ── Tool Handlers ─────────────────────────────────────────────────────────

export async function handleLogInteraction(params: {
  contact_name: string;
  organization: string;
  interaction_type: string;
  summary: string;
  team_member: string;
  source?: string;
  org_type?: string;
  entity_code?: string;
  title?: string;
  location?: string;
  pipeline_stage?: string;
  target_commitment?: string;
  email?: string;
  wechat?: string;
  introduced_by?: string;
}) {
  // 1. Find or create org
  let org = await fuzzyFindOrg(params.organization);
  if (!org) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: params.organization,
        orgType: (params.org_type as any) ?? "other",
        entityTags: params.entity_code ? [params.entity_code] : ["CE"],
        relationshipOwner: params.team_member,
        targetCommitment: params.target_commitment ?? null,
      })
      .returning();
    org = newOrg;
  }

  // 2. Find or create person
  let person = await fuzzyFindPerson(params.contact_name, org.id);
  if (!person) {
    const [newPerson] = await db
      .insert(people)
      .values({
        fullName: params.contact_name,
        title: params.title ?? null,
        email: params.email ?? null,
        wechat: params.wechat ?? null,
        introducedByName: params.introduced_by ?? null,
        entityTags: params.entity_code ? [params.entity_code] : ["CE"],
        lastInteractionAt: new Date(),
      })
      .returning();
    person = newPerson;

    await db.insert(personOrgAffiliations).values({
      personId: person.id,
      organizationId: org.id,
      title: params.title ?? null,
      isPrimaryOrg: true,
      isPrimaryContact: true,
    });
  } else {
    await db
      .update(people)
      .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
      .where(eq(people.id, person.id));
  }

  // 3. Handle pipeline stage
  let opp = await getActiveOpportunity(org.id);
  if (params.pipeline_stage) {
    if (!opp) {
      const [defaultPipeline] = await db
        .select()
        .from(pipelineDefinitions)
        .where(eq(pipelineDefinitions.isDefault, true))
        .limit(1);

      if (defaultPipeline) {
        const [newOpp] = await db
          .insert(opportunities)
          .values({
            name: `${org.name} — CE Fund I`,
            opportunityType: "lp_commitment",
            status: "active",
            pipelineId: defaultPipeline.id,
            stage: params.pipeline_stage,
            organizationId: org.id,
            entityCode: params.entity_code ?? "CE",
            entityTags: params.entity_code ? [params.entity_code] : ["CE"],
            dealSize: params.target_commitment ?? null,
            leadOwner: params.team_member,
          })
          .returning();
        opp = newOpp;
      }
    } else if (opp.stage !== params.pipeline_stage) {
      await db.insert(pipelineHistory).values({
        opportunityId: opp.id,
        fromStage: opp.stage,
        toStage: params.pipeline_stage,
        changedBy: params.team_member,
        notes: "Stage changed during interaction logging",
      });
      await db
        .update(opportunities)
        .set({
          stage: params.pipeline_stage,
          stageChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, opp.id));
    }
  }

  // 4. Log interaction
  const [interaction] = await db
    .insert(interactions)
    .values({
      orgId: org.id,
      personId: person.id,
      opportunityId: opp?.id ?? null,
      interactionType: params.interaction_type as any,
      source: (params.source as any) ?? "manual",
      teamMember: params.team_member,
      summary: params.summary,
      rawInput: JSON.stringify(params),
      location: params.location ?? null,
      entityCode: params.entity_code ?? "CE",
      entityTags: params.entity_code ? [params.entity_code] : ["CE"],
    })
    .returning();

  return {
    status: "logged",
    organization: { id: org.id, name: org.name },
    person: { id: person.id, name: person.fullName },
    opportunity_stage: opp?.stage ?? "none",
    interaction_id: interaction.id,
  };
}

export async function handlePipelineStatus(params: {
  stale_days?: number;
  entity_code?: string;
}) {
  const staleDays = params.stale_days ?? 14;
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  const conditions: any[] = [eq(opportunities.status, "active")];
  if (params.entity_code) {
    conditions.push(eq(opportunities.entityCode, params.entity_code));
  }

  const opps = await db
    .select({
      stage: opportunities.stage,
      dealSize: opportunities.dealSize,
      commitment: opportunities.commitment,
      orgId: opportunities.organizationId,
      orgName: organizations.name,
    })
    .from(opportunities)
    .leftJoin(
      organizations,
      eq(opportunities.organizationId, organizations.id)
    )
    .where(and(...conditions));

  const stageBuckets: Record<
    string,
    { count: number; target: number; actual: number }
  > = {};
  for (const opp of opps) {
    const s = opp.stage;
    if (!stageBuckets[s])
      stageBuckets[s] = { count: 0, target: 0, actual: 0 };
    stageBuckets[s].count++;
    stageBuckets[s].target += parseFloat(opp.dealSize ?? "0");
    stageBuckets[s].actual += parseFloat(opp.commitment ?? "0");
  }

  const pipeline = Object.entries(stageBuckets).map(([stage, data]) => ({
    stage,
    count: data.count,
    target: formatCurrency(data.target),
    actual: formatCurrency(data.actual),
  }));

  const totalCommitted =
    (stageBuckets["committed"]?.actual ?? 0) +
    (stageBuckets["closed"]?.actual ?? 0);

  // Stale
  const activeStages = ["intro", "meeting", "dd", "soft_circle"];
  const activeOpps = opps.filter((o) => activeStages.includes(o.stage));
  const staleOrgs: { name: string; stage: string; last_interaction: string }[] =
    [];

  for (const opp of activeOpps) {
    if (!opp.orgId) continue;
    const lastInt = await db
      .select({
        maxDate: sql<string>`max(${interactions.interactionDate})`,
      })
      .from(interactions)
      .where(eq(interactions.orgId, opp.orgId));
    const lastDate = lastInt[0]?.maxDate;
    if (!lastDate || new Date(lastDate) < staleDate) {
      staleOrgs.push({
        name: opp.orgName ?? "Unknown",
        stage: opp.stage,
        last_interaction: lastDate ?? "never",
      });
    }
  }

  return {
    pipeline,
    total_committed: formatCurrency(totalCommitted),
    fund_target: "$300-500M",
    stale_orgs: staleOrgs,
    total_opportunities: opps.length,
  };
}

export async function handleMoveStage(params: {
  organization: string;
  new_stage: string;
  changed_by: string;
  notes?: string;
  actual_commitment?: string;
}) {
  const org = await fuzzyFindOrg(params.organization);
  if (!org) return { error: `Organization "${params.organization}" not found.` };

  const opp = await getActiveOpportunity(org.id);
  if (!opp) return { error: `No active opportunity for "${org.name}".` };

  const oldStage = opp.stage;

  await db.insert(pipelineHistory).values({
    opportunityId: opp.id,
    fromStage: oldStage,
    toStage: params.new_stage,
    changedBy: params.changed_by,
    notes: params.notes ?? null,
  });

  const updates: any = {
    stage: params.new_stage,
    stageChangedAt: new Date(),
    updatedAt: new Date(),
  };
  if (params.actual_commitment) updates.commitment = params.actual_commitment;

  await db
    .update(opportunities)
    .set(updates)
    .where(eq(opportunities.id, opp.id));

  return {
    status: "moved",
    organization: org.name,
    from: oldStage,
    to: params.new_stage,
  };
}

export async function handleSearch(params: {
  stage?: string;
  org_type?: string;
  days_since_contact?: number;
  relationship_owner?: string;
  query?: string;
  entity_code?: string;
  limit?: number;
}) {
  const conditions: any[] = [];

  if (params.org_type)
    conditions.push(eq(organizations.orgType, params.org_type as any));
  if (params.relationship_owner)
    conditions.push(
      ilike(organizations.relationshipOwner, `%${params.relationship_owner}%`)
    );
  if (params.query)
    conditions.push(
      sql`${organizations.name} ILIKE ${"%" + params.query + "%"} OR ${organizations.nameZh} ILIKE ${"%" + params.query + "%"}`
    );
  if (params.entity_code)
    conditions.push(
      sql`${params.entity_code} = ANY(${organizations.entityTags})`
    );

  let results = await db
    .select()
    .from(organizations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(organizations.name))
    .limit(params.limit ?? 20);

  // Filter by stage
  if (params.stage) {
    const filtered: typeof results = [];
    for (const org of results) {
      const opp = await getActiveOpportunity(org.id);
      if (opp?.stage === params.stage) filtered.push(org);
    }
    results = filtered;
  }

  // Filter by staleness
  if (params.days_since_contact) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - params.days_since_contact);
    const filtered: typeof results = [];
    for (const org of results) {
      const lastInt = await db
        .select({
          maxDate: sql<string>`max(${interactions.interactionDate})`,
        })
        .from(interactions)
        .where(eq(interactions.orgId, org.id));
      const lastDate = lastInt[0]?.maxDate;
      if (!lastDate || new Date(lastDate) < cutoff) filtered.push(org);
    }
    results = filtered;
  }

  const formatted = [];
  for (const org of results) {
    const opp = await getActiveOpportunity(org.id);
    formatted.push({
      name: org.name,
      name_zh: org.nameZh,
      type: org.orgType,
      stage: opp?.stage ?? "none",
      aum: formatCurrency(org.aumUsd),
      target: formatCurrency(opp?.dealSize),
      owner: org.relationshipOwner,
      entities: org.entityTags,
    });
  }

  return { count: formatted.length, results: formatted };
}

export async function handleGetDetail(params: { organization: string }) {
  const org = await fuzzyFindOrg(params.organization);
  if (!org)
    return { error: `Organization "${params.organization}" not found.` };

  const orgPeople = await db
    .select({ person: people, affiliation: personOrgAffiliations })
    .from(personOrgAffiliations)
    .innerJoin(people, eq(personOrgAffiliations.personId, people.id))
    .where(eq(personOrgAffiliations.organizationId, org.id));

  const opps = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.organizationId, org.id))
    .orderBy(desc(opportunities.updatedAt));

  const recentInteractions = await db
    .select()
    .from(interactions)
    .where(eq(interactions.orgId, org.id))
    .orderBy(desc(interactions.interactionDate))
    .limit(20);

  const oppIds = opps.map((o) => o.id);
  let history: any[] = [];
  if (oppIds.length > 0) {
    history = await db
      .select()
      .from(pipelineHistory)
      .where(sql`${pipelineHistory.opportunityId} = ANY(${oppIds})`)
      .orderBy(desc(pipelineHistory.createdAt));
  }

  let brainNote = null;
  if (org.brainNotePath) {
    try {
      const { readFileSync } = await import("fs");
      brainNote = readFileSync(org.brainNotePath, "utf-8");
    } catch {
      brainNote = "(Brain note not found)";
    }
  }

  return {
    organization: {
      name: org.name,
      name_zh: org.nameZh,
      type: org.orgType,
      aum: formatCurrency(org.aumUsd),
      headquarters: org.headquarters,
      country: org.country,
      website: org.website,
      sector_focus: org.sectorFocus,
      notes: org.notes,
      owner: org.relationshipOwner,
      entities: org.entityTags,
    },
    opportunities: opps.map((o) => ({
      name: o.name,
      stage: o.stage,
      type: o.opportunityType,
      deal_size: formatCurrency(o.dealSize),
      commitment: formatCurrency(o.commitment),
      owner: o.leadOwner,
      status: o.status,
    })),
    people: orgPeople.map((p) => ({
      name: p.person.fullName,
      name_zh: p.person.fullNameZh,
      title: p.affiliation.title,
      relationship: p.person.relationshipStrength,
      score: p.person.relationshipScore,
      primary: p.affiliation.isPrimaryContact,
      email: p.person.email,
      wechat: p.person.wechat,
      telegram: p.person.telegram,
      introduced_by: p.person.introducedByName,
      intro_chain: p.person.introChain,
    })),
    interactions: recentInteractions.map((i) => ({
      date: i.interactionDate,
      type: i.interactionType,
      summary: i.summary,
      by: i.teamMember,
      location: i.location,
    })),
    pipeline_history: history.map((h: any) => ({
      date: h.createdAt,
      from: h.fromStage,
      to: h.toStage,
      by: h.changedBy,
      notes: h.notes,
    })),
    brain_note: brainNote,
  };
}

export async function handleUpdateContact(params: {
  contact_name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  title?: string;
  wechat?: string;
  telegram?: string;
  linkedin?: string;
  headquarters?: string;
  website?: string;
  aum?: string;
  target_commitment?: string;
  org_type?: string;
  relationship_strength?: string;
  notes?: string;
  tags?: string[];
}) {
  const updated: string[] = [];

  if (params.contact_name) {
    const person = await fuzzyFindPerson(params.contact_name);
    if (person) {
      const u: any = { updatedAt: new Date() };
      if (params.email) u.email = params.email;
      if (params.phone) u.phone = params.phone;
      if (params.title) u.title = params.title;
      if (params.wechat) u.wechat = params.wechat;
      if (params.telegram) u.telegram = params.telegram;
      if (params.linkedin) u.linkedin = params.linkedin;
      if (params.relationship_strength)
        u.relationshipStrength = params.relationship_strength;
      if (params.tags) u.tags = params.tags;
      if (params.notes) u.notes = params.notes;

      await db.update(people).set(u).where(eq(people.id, person.id));
      updated.push(`Person ${person.fullName} updated`);
    } else {
      updated.push(`Person "${params.contact_name}" not found`);
    }
  }

  if (params.organization) {
    const org = await fuzzyFindOrg(params.organization);
    if (org) {
      const u: any = { updatedAt: new Date() };
      if (params.headquarters) u.headquarters = params.headquarters;
      if (params.website) u.website = params.website;
      if (params.aum) u.aumUsd = params.aum;
      if (params.target_commitment)
        u.targetCommitment = params.target_commitment;
      if (params.org_type) u.orgType = params.org_type;
      if (params.notes) u.notes = params.notes;
      if (params.tags) u.tags = params.tags;

      await db.update(organizations).set(u).where(eq(organizations.id, org.id));
      updated.push(`Organization ${org.name} updated`);
    } else {
      updated.push(`Organization "${params.organization}" not found`);
    }
  }

  return { updates: updated };
}
