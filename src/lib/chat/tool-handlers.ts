/**
 * Shared tool handlers used by both the MCP server and the in-app Chat API.
 * Extracted from src/mcp/orbit-server.ts to avoid duplication.
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
import type { CurrentUser } from "@/lib/supabase/get-current-user";
import {
  canAccessEntity,
  filterByEntity,
  type ScopedUser,
} from "./scope-filter";

// ── Scope helpers ──────────────────────────────────────────────────────────

/**
 * Access check for an organization-like row using entityTags[].
 * Generic (no tags) is always accessible. Otherwise at least one tag
 * must be within scope.
 */
function canAccessTags(
  tags: string[] | null | undefined,
  user: ScopedUser | null | undefined,
): boolean {
  if (!user) return true;
  if (!tags || tags.length === 0) return true;
  return tags.some((t) => canAccessEntity(user, t));
}

function scopeDenied(entity: string | null) {
  return {
    error: "outside_your_scope" as const,
    message: `You don't have access to ${entity ?? "this entity"}.`,
  };
}

/**
 * Inspect draft records for any entity references outside the user's scope.
 * Returns a list of warnings the UI can surface. Does NOT mutate payload —
 * draft creation is presentation-only; user still confirms.
 */
export function filterDraftRecordsByScope(
  payload: { records?: Array<{ type?: string; data?: Record<string, unknown> }> },
  user: CurrentUser | undefined,
): Array<{ index: number; entity: string; message: string }> {
  if (!user) return [];
  const warnings: Array<{ index: number; entity: string; message: string }> =
    [];
  const records = Array.isArray(payload.records) ? payload.records : [];
  records.forEach((rec, idx) => {
    const data = (rec?.data ?? {}) as Record<string, unknown>;
    const candidateKeys = ["entity_code", "entityCode"];
    for (const key of candidateKeys) {
      const val = data[key];
      if (typeof val === "string" && val.length > 0) {
        if (!canAccessEntity(user, val)) {
          warnings.push({
            index: idx,
            entity: val,
            message: `Record ${idx} references "${val}" which is outside your scope.`,
          });
        }
      }
    }
    // Also check entity_tags / entityTags arrays.
    for (const key of ["entity_tags", "entityTags"]) {
      const tags = data[key];
      if (Array.isArray(tags)) {
        const outside = tags.filter(
          (t): t is string => typeof t === "string" && !canAccessEntity(user, t),
        );
        for (const t of outside) {
          warnings.push({
            index: idx,
            entity: t,
            message: `Record ${idx} references "${t}" which is outside your scope.`,
          });
        }
      }
    }
  });
  return warnings;
}

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

export async function handleLogInteraction(
  params: {
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
  },
  currentUser?: CurrentUser,
) {
  // Scope check on target entity (default CE if caller didn't specify).
  const effectiveEntity = params.entity_code ?? "CE";
  if (!canAccessEntity(currentUser, effectiveEntity)) {
    return scopeDenied(effectiveEntity);
  }

  // 1. Find or create org
  let org = await fuzzyFindOrg(params.organization);
  // If the org already exists, verify the user can write against its tags.
  if (org && !canAccessTags(org.entityTags, currentUser)) {
    return scopeDenied(org.entityTags?.[0] ?? null);
  }
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

export async function handlePipelineStatus(
  params: {
    stale_days?: number;
    entity_code?: string;
  },
  currentUser?: CurrentUser,
) {
  const staleDays = params.stale_days ?? 14;
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  // If caller requested a specific entity they can't see, short-circuit.
  if (params.entity_code && !canAccessEntity(currentUser, params.entity_code)) {
    return scopeDenied(params.entity_code);
  }

  const conditions: any[] = [eq(opportunities.status, "active")];
  if (params.entity_code) {
    conditions.push(eq(opportunities.entityCode, params.entity_code));
  }

  const oppsRaw = await db
    .select({
      stage: opportunities.stage,
      dealSize: opportunities.dealSize,
      commitment: opportunities.commitment,
      orgId: opportunities.organizationId,
      orgName: organizations.name,
      entityCode: opportunities.entityCode,
    })
    .from(opportunities)
    .leftJoin(
      organizations,
      eq(opportunities.organizationId, organizations.id)
    )
    .where(and(...conditions));

  const opps = filterByEntity(oppsRaw, currentUser);

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

export async function handleMoveStage(
  params: {
    organization: string;
    new_stage: string;
    changed_by: string;
    notes?: string;
    actual_commitment?: string;
  },
  currentUser?: CurrentUser,
) {
  const org = await fuzzyFindOrg(params.organization);
  if (!org) return { error: `Organization "${params.organization}" not found.` };

  if (!canAccessTags(org.entityTags, currentUser)) {
    return scopeDenied(org.entityTags?.[0] ?? null);
  }

  const opp = await getActiveOpportunity(org.id);
  if (!opp) return { error: `No active opportunity for "${org.name}".` };

  if (!canAccessEntity(currentUser, opp.entityCode)) {
    return scopeDenied(opp.entityCode);
  }

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

export async function handleSearch(
  params: {
    stage?: string;
    org_type?: string;
    days_since_contact?: number;
    relationship_owner?: string;
    query?: string;
    entity_code?: string;
    limit?: number;
  },
  currentUser?: CurrentUser,
) {
  if (params.entity_code && !canAccessEntity(currentUser, params.entity_code)) {
    return scopeDenied(params.entity_code);
  }
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

  // Scope filter: drop orgs whose entityTags aren't in the user's scope.
  if (currentUser) {
    results = results.filter((org) =>
      canAccessTags(org.entityTags, currentUser),
    );
  }

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

export async function handleGetDetail(
  params: { organization: string },
  currentUser?: CurrentUser,
) {
  const org = await fuzzyFindOrg(params.organization);
  if (!org)
    return { error: `Organization "${params.organization}" not found.` };

  if (!canAccessTags(org.entityTags, currentUser)) {
    return scopeDenied(org.entityTags?.[0] ?? null);
  }

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

  const recentInteractionsRaw = await db
    .select()
    .from(interactions)
    .where(eq(interactions.orgId, org.id))
    .orderBy(desc(interactions.interactionDate))
    .limit(20);
  const recentInteractions = filterByEntity(recentInteractionsRaw, currentUser);
  const oppsFiltered = filterByEntity(opps, currentUser);

  const oppIds = oppsFiltered.map((o) => o.id);
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
    opportunities: oppsFiltered.map((o) => ({
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

export async function handleUpdateContact(
  params: {
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
  },
  currentUser?: CurrentUser,
) {
  const updated: string[] = [];

  if (params.contact_name) {
    const person = await fuzzyFindPerson(params.contact_name);
    if (person) {
      if (!canAccessTags(person.entityTags, currentUser)) {
        return scopeDenied(person.entityTags?.[0] ?? null);
      }
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
      if (!canAccessTags(org.entityTags, currentUser)) {
        return scopeDenied(org.entityTags?.[0] ?? null);
      }
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

// ── Calendar & Email handlers ──────────────────────────────────────────

export async function handleListCalendarEvents(
  params: {
    start_date?: string;
    end_date?: string;
  },
  _currentUser?: CurrentUser,
) {
  const { getMergedCalendar } = await import("@/db/queries/calendar");
  const { getDefaultTrip } = await import("@/db/queries/roadshow");

  const now = new Date();
  const startDate = params.start_date
    ? new Date(params.start_date)
    : now;
  const endDate = params.end_date
    ? new Date(params.end_date)
    : new Date(now.getTime() + 7 * 86400_000);

  // Get user ID from orbit_users (default to jerry)
  const { orbitUsers } = await import("@/db/schema");
  const [jerry] = await db
    .select({ id: orbitUsers.id })
    .from(orbitUsers)
    .where(eq(orbitUsers.handle, "jerry"))
    .limit(1);

  const defaultTrip = await getDefaultTrip();
  const events = await getMergedCalendar(
    jerry?.id ?? "",
    startDate,
    endDate,
    defaultTrip?.id
  );

  return {
    events: events.map((e) => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      type: e.type,
      status: e.status,
      orgName: e.orgName,
    })),
    count: events.length,
  };
}

export async function handleSearchEmails(
  params: {
    query: string;
    max_results?: number;
  },
  _currentUser?: CurrentUser,
) {
  const { getGoogleClient } = await import("@/lib/google/client");
  const { orbitUsers } = await import("@/db/schema");

  const [jerry] = await db
    .select({ id: orbitUsers.id })
    .from(orbitUsers)
    .where(eq(orbitUsers.handle, "jerry"))
    .limit(1);

  if (!jerry) return { error: "User not found" };

  const client = await getGoogleClient(jerry.id);
  if (!client) return { error: "Google not connected" };

  const maxResults = params.max_results ?? 10;
  const searchParams = new URLSearchParams({
    q: params.query,
    maxResults: String(maxResults),
  });

  const res = await client.fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`
  );
  if (!res.ok) return { error: "Gmail search failed" };

  const data = await res.json();
  const messageIds: string[] = (data.messages ?? []).map((m: any) => m.id);

  // Fetch message details (first 5 for speed)
  const results = [];
  for (const msgId of messageIds.slice(0, 5)) {
    const msgRes = await client.fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
    );
    if (!msgRes.ok) continue;
    const msg = await msgRes.json();
    const headers: Array<{ name: string; value: string }> =
      msg.payload?.headers ?? [];
    results.push({
      from: headers.find((h) => h.name === "From")?.value ?? "",
      subject: headers.find((h) => h.name === "Subject")?.value ?? "",
      date: headers.find((h) => h.name === "Date")?.value ?? "",
      snippet: msg.snippet ?? "",
    });
  }

  return { results, totalResults: data.resultSizeEstimate ?? 0 };
}

export async function handleDraftEmail(
  params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
  },
  _currentUser?: CurrentUser,
) {
  const { getGoogleClient } = await import("@/lib/google/client");
  const { orbitUsers } = await import("@/db/schema");

  const [jerry] = await db
    .select({ id: orbitUsers.id })
    .from(orbitUsers)
    .where(eq(orbitUsers.handle, "jerry"))
    .limit(1);

  if (!jerry) return { error: "User not found" };

  const client = await getGoogleClient(jerry.id);
  if (!client) return { error: "Google not connected" };

  // Build MIME message
  const headers = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    params.cc ? `Cc: ${params.cc}` : "",
    "Content-Type: text/plain; charset=utf-8",
    "",
    params.body,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = Buffer.from(headers)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await client.fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw } }),
    }
  );

  if (!res.ok) return { error: "Failed to create draft" };

  return { status: "draft_created", to: params.to, subject: params.subject };
}

// ── Objectives & Actions handlers ──────────────────────────────────────

export async function handleCreateObjective(
  params: {
    title: string;
    description?: string;
    entity_code?: string;
    priority?: string;
    deadline?: string;
  },
  currentUser?: CurrentUser,
) {
  if (params.entity_code && !canAccessEntity(currentUser, params.entity_code)) {
    return scopeDenied(params.entity_code);
  }
  const { objectives: objTable } = await import("@/db/schema");

  const [created] = await db
    .insert(objTable)
    .values({
      title: params.title,
      description: params.description,
      entityCode: params.entity_code,
      priority: params.priority ?? "p1",
      status: "active",
      deadline: params.deadline,
      owner: "jerry",
      createdBy: "cloud",
    })
    .returning();

  return { status: "created", objective: { id: created.id, title: created.title } };
}

export async function handleCreateAction(
  params: {
    title: string;
    type?: string;
    priority?: string;
    due_date?: string;
    objective_title?: string;
    notes?: string;
  },
  _currentUser?: CurrentUser,
) {
  const { actionItems, objectives: objTable } = await import("@/db/schema");

  // Link to objective if specified
  let objectiveId = null;
  if (params.objective_title) {
    const [obj] = await db
      .select({ id: objTable.id })
      .from(objTable)
      .where(ilike(objTable.title, `%${params.objective_title}%`))
      .limit(1);
    objectiveId = obj?.id ?? null;
  }

  const [created] = await db
    .insert(actionItems)
    .values({
      title: params.title,
      type: params.type ?? "action",
      priority: params.priority ?? "p1",
      status: "open",
      dueDate: params.due_date,
      objectiveId,
      notes: params.notes,
      owner: "jerry",
      createdBy: "cloud",
    })
    .returning();

  return { status: "created", action: { id: created.id, title: created.title, type: created.type } };
}

export async function handleListObjectives(
  params: {
    status?: string;
    entity_code?: string;
  },
  currentUser?: CurrentUser,
) {
  if (params.entity_code && !canAccessEntity(currentUser, params.entity_code)) {
    return scopeDenied(params.entity_code);
  }
  const { getObjectives } = await import("@/db/queries/objectives");
  const raw = await getObjectives({
    status: params.status ?? "active",
    entityCode: params.entity_code,
  });
  const results = filterByEntity(raw as Array<{ entityCode?: string | null }>, currentUser) as typeof raw;

  return {
    objectives: results.map((o: any) => ({
      title: o.title,
      entityCode: o.entityCode,
      priority: o.priority,
      status: o.status,
      deadline: o.deadline,
      progress: o.progress,
      keyResultCount: o.keyResults?.length ?? 0,
    })),
    count: results.length,
  };
}

export async function handleListActions(
  params: {
    type?: string;
    status?: string;
  },
  currentUser?: CurrentUser,
) {
  const { getActionItems } = await import("@/db/queries/actions");
  const raw = await getActionItems({
    type: params.type,
    status: params.status ?? "open",
  });
  const results = filterByEntity(raw as Array<{ entityCode?: string | null }>, currentUser) as typeof raw;

  return {
    items: results.map((a: any) => ({
      title: a.title,
      type: a.type,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate,
      owner: a.owner,
      objectiveTitle: a.objectiveTitle,
    })),
    count: results.length,
  };
}
