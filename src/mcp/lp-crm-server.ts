#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Orbit — Universal CRM MCP Server
 *
 * 6 tools for Cloud to manage relationships across all entities:
 * - lp_log_interaction: Create/update org + person + log touchpoint
 * - lp_pipeline_status: Pipeline summary from opportunities
 * - lp_move_stage: Move opportunity to new pipeline stage
 * - lp_search: Search organizations by type, stage, staleness, owner
 * - lp_get_detail: Full org dossier with people, opportunities, interactions
 * - lp_update_contact: Update structured fields on person/org
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  eq,
  ilike,
  sql,
  desc,
  asc,
  and,
} from "drizzle-orm";
import * as schema from "../db/schema/index.js";

// ── DB Connection ──────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// ── Helpers ────────────────────────────────────────────────────────────────

async function fuzzyFindOrg(name) {
  const results = await db
    .select()
    .from(schema.organizations)
    .where(
      sql`${schema.organizations.name} ILIKE ${"%" + name + "%"}
          OR ${schema.organizations.nameZh} ILIKE ${"%" + name + "%"}`
    )
    .limit(1);
  return results[0] ?? null;
}

async function fuzzyFindPerson(name, orgId) {
  const conditions = [
    sql`${schema.people.fullName} ILIKE ${"%" + name + "%"}
        OR ${schema.people.fullNameZh} ILIKE ${"%" + name + "%"}`,
  ];

  let results;
  if (orgId) {
    // Find person affiliated with this org
    results = await db
      .select({ person: schema.people })
      .from(schema.people)
      .innerJoin(
        schema.personOrgAffiliations,
        eq(schema.personOrgAffiliations.personId, schema.people.id)
      )
      .where(
        and(
          sql`${schema.people.fullName} ILIKE ${"%" + name + "%"}
              OR ${schema.people.fullNameZh} ILIKE ${"%" + name + "%"}`,
          eq(schema.personOrgAffiliations.organizationId, orgId)
        )
      )
      .limit(1);
    return results[0]?.person ?? null;
  }

  results = await db
    .select()
    .from(schema.people)
    .where(
      sql`${schema.people.fullName} ILIKE ${"%" + name + "%"}
          OR ${schema.people.fullNameZh} ILIKE ${"%" + name + "%"}`
    )
    .limit(1);
  return results[0] ?? null;
}

async function getActiveOpportunity(orgId) {
  const [opp] = await db
    .select()
    .from(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.organizationId, orgId),
        eq(schema.opportunities.status, "active")
      )
    )
    .orderBy(desc(schema.opportunities.updatedAt))
    .limit(1);
  return opp ?? null;
}

function formatCurrency(val) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

function safeHandler(fn) {
  return async (params) => {
    try {
      return await fn(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Orbit MCP error: ${msg}`);
      return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
  };
}

// ── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "orbit",
  version: "2.0.0",
});

// ── Tool 1: lp_log_interaction ─────────────────────────────────────────────

server.tool(
  "lp_log_interaction",
  "Log an interaction. Creates org/person if new, logs the touchpoint. Use for any meeting, call, email, conference encounter.",
  {
    contact_name: z.string().describe("Full name of the contact"),
    organization: z.string().describe("Organization name"),
    interaction_type: z
      .enum([
        "meeting", "call", "email", "conference", "intro", "dd_session",
        "deck_sent", "follow_up", "commitment", "note", "telegram_message",
        "wechat_message", "site_visit", "dinner", "board_meeting",
      ])
      .describe("Type of interaction"),
    summary: z.string().describe("Brief summary of the interaction"),
    team_member: z.string().describe("Who logged this (jerry, ray, matt, angel)"),
    source: z
      .enum(["telegram", "email", "meeting_transcript", "web", "brain_sync", "calendar", "manual", "cloud_bot", "wechat"])
      .default("telegram").optional(),
    org_type: z
      .enum(["lp", "portfolio_company", "prospect", "strategic_partner", "developer", "manufacturer", "hyperscaler", "epc", "corporate", "other"])
      .optional().describe("Organization type"),
    entity_code: z.string().optional().describe("Entity (CE, SYN, UUL)"),
    title: z.string().optional().describe("Contact's title"),
    location: z.string().optional(),
    pipeline_stage: z
      .enum(["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"])
      .optional().describe("Set opportunity stage"),
    target_commitment: z.string().optional().describe("Target commitment in millions USD"),
    email: z.string().optional(),
    wechat: z.string().optional(),
    introduced_by: z.string().optional(),
  },
  safeHandler(async (params) => {
    // 1. Find or create org
    let org = await fuzzyFindOrg(params.organization);
    if (!org) {
      const [newOrg] = await db
        .insert(schema.organizations)
        .values({
          name: params.organization,
          orgType: params.org_type ?? "other",
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
        .insert(schema.people)
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

      // Create affiliation
      await db.insert(schema.personOrgAffiliations).values({
        personId: person.id,
        organizationId: org.id,
        title: params.title ?? null,
        isPrimaryOrg: true,
        isPrimaryContact: true,
      });
    } else {
      await db
        .update(schema.people)
        .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.people.id, person.id));
    }

    // 3. Handle pipeline stage change if requested
    let opp = await getActiveOpportunity(org.id);
    if (params.pipeline_stage) {
      if (!opp) {
        // Create opportunity
        const [defaultPipeline] = await db
          .select()
          .from(schema.pipelineDefinitions)
          .where(eq(schema.pipelineDefinitions.isDefault, true))
          .limit(1);

        if (defaultPipeline) {
          const [newOpp] = await db
            .insert(schema.opportunities)
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
        await db.insert(schema.pipelineHistory).values({
          opportunityId: opp.id,
          fromStage: opp.stage,
          toStage: params.pipeline_stage,
          changedBy: params.team_member,
          notes: "Stage changed during interaction logging",
        });
        await db
          .update(schema.opportunities)
          .set({ stage: params.pipeline_stage, stageChangedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.opportunities.id, opp.id));
      }
    }

    // 4. Log interaction
    const [interaction] = await db
      .insert(schema.interactions)
      .values({
        orgId: org.id,
        personId: person.id,
        opportunityId: opp?.id ?? null,
        interactionType: params.interaction_type,
        source: params.source ?? "telegram",
        teamMember: params.team_member,
        summary: params.summary,
        rawInput: JSON.stringify(params),
        location: params.location ?? null,
        entityCode: params.entity_code ?? "CE",
        entityTags: params.entity_code ? [params.entity_code] : ["CE"],
      })
      .returning();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "logged",
          organization: { id: org.id, name: org.name },
          person: { id: person.id, name: person.fullName },
          opportunity_stage: opp?.stage ?? "none",
          interaction_id: interaction.id,
          message: `Logged ${params.interaction_type} with ${params.contact_name} @ ${params.organization}`,
        }, null, 2),
      }],
    };
  })
);

// ── Tool 2: lp_pipeline_status ─────────────────────────────────────────────

server.tool(
  "lp_pipeline_status",
  "Get pipeline summary: counts per stage, total commitments, stale orgs.",
  {
    stale_days: z.number().optional().describe("Days threshold for stale warning (default 14)"),
    entity_code: z.string().optional().describe("Filter by entity (CE, SYN)"),
  },
  safeHandler(async (params) => {
    const staleDays = params.stale_days ?? 14;
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    const conditions = [eq(schema.opportunities.status, "active")];
    if (params.entity_code) {
      conditions.push(eq(schema.opportunities.entityCode, params.entity_code));
    }

    const opps = await db
      .select({
        stage: schema.opportunities.stage,
        dealSize: schema.opportunities.dealSize,
        commitment: schema.opportunities.commitment,
        orgId: schema.opportunities.organizationId,
        orgName: schema.organizations.name,
      })
      .from(schema.opportunities)
      .leftJoin(schema.organizations, eq(schema.opportunities.organizationId, schema.organizations.id))
      .where(and(...conditions));

    const stageBuckets = {};
    for (const opp of opps) {
      const s = opp.stage;
      if (!stageBuckets[s]) stageBuckets[s] = { count: 0, target: 0, actual: 0 };
      stageBuckets[s].count++;
      stageBuckets[s].target += parseFloat(opp.dealSize ?? "0");
      stageBuckets[s].actual += parseFloat(opp.commitment ?? "0");
    }

    const pipeline = Object.entries(stageBuckets).map(([stage, data]) => ({
      stage, count: data.count,
      target: formatCurrency(String(data.target)),
      actual: formatCurrency(String(data.actual)),
    }));

    const totalCommitted = (stageBuckets["committed"]?.actual ?? 0) + (stageBuckets["closed"]?.actual ?? 0);

    // Find stale
    const activeStages = ["intro", "meeting", "dd", "soft_circle"];
    const activeOpps = opps.filter((o) => activeStages.includes(o.stage));
    const staleOrgs = [];

    for (const opp of activeOpps) {
      if (!opp.orgId) continue;
      const lastInt = await db
        .select({ maxDate: sql`max(${schema.interactions.interactionDate})` })
        .from(schema.interactions)
        .where(eq(schema.interactions.orgId, opp.orgId));
      const lastDate = lastInt[0]?.maxDate;
      if (!lastDate || new Date(lastDate) < staleDate) {
        staleOrgs.push({ name: opp.orgName, stage: opp.stage, last_interaction: lastDate ?? "never" });
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          pipeline, total_committed: formatCurrency(String(totalCommitted)),
          fund_target: "$300-500M", stale_orgs: staleOrgs, total_opportunities: opps.length,
        }, null, 2),
      }],
    };
  })
);

// ── Tool 3: lp_move_stage ──────────────────────────────────────────────────

server.tool(
  "lp_move_stage",
  "Move an organization's active opportunity to a new pipeline stage.",
  {
    organization: z.string().describe("Organization name"),
    new_stage: z.enum(["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"]),
    changed_by: z.string().describe("Who made this change"),
    notes: z.string().optional(),
    actual_commitment: z.string().optional().describe("Actual commitment in millions (for committed/closed)"),
  },
  safeHandler(async (params) => {
    const org = await fuzzyFindOrg(params.organization);
    if (!org) {
      return { content: [{ type: "text", text: `Organization "${params.organization}" not found.` }] };
    }

    const opp = await getActiveOpportunity(org.id);
    if (!opp) {
      return { content: [{ type: "text", text: `No active opportunity for "${org.name}".` }] };
    }

    const oldStage = opp.stage;

    await db.insert(schema.pipelineHistory).values({
      opportunityId: opp.id,
      fromStage: oldStage,
      toStage: params.new_stage,
      changedBy: params.changed_by,
      notes: params.notes ?? null,
    });

    const updates = {
      stage: params.new_stage,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    };
    if (params.actual_commitment) updates.commitment = params.actual_commitment;

    await db.update(schema.opportunities).set(updates).where(eq(schema.opportunities.id, opp.id));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "moved", organization: org.name, from: oldStage, to: params.new_stage,
          message: `${org.name}: ${oldStage} → ${params.new_stage}`,
        }, null, 2),
      }],
    };
  })
);

// ── Tool 4: lp_search ──────────────────────────────────────────────────────

server.tool(
  "lp_search",
  "Search organizations by type, stage, staleness, or owner.",
  {
    stage: z.enum(["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"]).optional(),
    org_type: z.enum(["lp", "portfolio_company", "prospect", "strategic_partner", "developer", "manufacturer", "hyperscaler", "epc", "corporate", "other"]).optional(),
    days_since_contact: z.number().optional(),
    relationship_owner: z.string().optional(),
    query: z.string().optional(),
    entity_code: z.string().optional(),
    limit: z.number().optional(),
  },
  safeHandler(async (params) => {
    const conditions = [];

    if (params.org_type) conditions.push(eq(schema.organizations.orgType, params.org_type));
    if (params.relationship_owner) conditions.push(ilike(schema.organizations.relationshipOwner, `%${params.relationship_owner}%`));
    if (params.query) conditions.push(sql`${schema.organizations.name} ILIKE ${"%" + params.query + "%"} OR ${schema.organizations.nameZh} ILIKE ${"%" + params.query + "%"}`);
    if (params.entity_code) conditions.push(sql`${params.entity_code} = ANY(${schema.organizations.entityTags})`);

    let results = await db
      .select()
      .from(schema.organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(schema.organizations.name))
      .limit(params.limit ?? 20);

    // Filter by stage (via opportunities)
    if (params.stage) {
      const orgIdsInStage = new Set();
      for (const org of results) {
        const opp = await getActiveOpportunity(org.id);
        if (opp?.stage === params.stage) orgIdsInStage.add(org.id);
      }
      results = results.filter((r) => orgIdsInStage.has(r.id));
    }

    // Filter by staleness
    if (params.days_since_contact) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - params.days_since_contact);
      const staleIds = new Set();
      for (const org of results) {
        const lastInt = await db
          .select({ maxDate: sql`max(${schema.interactions.interactionDate})` })
          .from(schema.interactions)
          .where(eq(schema.interactions.orgId, org.id));
        const lastDate = lastInt[0]?.maxDate;
        if (!lastDate || new Date(lastDate) < cutoff) staleIds.add(org.id);
      }
      results = results.filter((r) => staleIds.has(r.id));
    }

    const formatted = await Promise.all(results.map(async (org) => {
      const opp = await getActiveOpportunity(org.id);
      return {
        name: org.name, name_zh: org.nameZh, type: org.orgType,
        stage: opp?.stage ?? "none", aum: formatCurrency(org.aumUsd),
        target: formatCurrency(opp?.dealSize), owner: org.relationshipOwner,
        entities: org.entityTags,
      };
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: formatted.length, results: formatted }, null, 2) }],
    };
  })
);

// ── Tool 5: lp_get_detail ──────────────────────────────────────────────────

server.tool(
  "lp_get_detail",
  "Get full org dossier: info, people, opportunities, interaction timeline. Use for call prep.",
  {
    organization: z.string().describe("Organization name"),
  },
  safeHandler(async (params) => {
    const org = await fuzzyFindOrg(params.organization);
    if (!org) {
      return { content: [{ type: "text", text: `Organization "${params.organization}" not found.` }] };
    }

    // People via affiliations
    const orgPeople = await db
      .select({ person: schema.people, affiliation: schema.personOrgAffiliations })
      .from(schema.personOrgAffiliations)
      .innerJoin(schema.people, eq(schema.personOrgAffiliations.personId, schema.people.id))
      .where(eq(schema.personOrgAffiliations.organizationId, org.id));

    // Opportunities
    const opps = await db
      .select()
      .from(schema.opportunities)
      .where(eq(schema.opportunities.organizationId, org.id))
      .orderBy(desc(schema.opportunities.updatedAt));

    // Interactions
    const recentInteractions = await db
      .select()
      .from(schema.interactions)
      .where(eq(schema.interactions.orgId, org.id))
      .orderBy(desc(schema.interactions.interactionDate))
      .limit(20);

    // Pipeline history
    const oppIds = opps.map((o) => o.id);
    let history = [];
    if (oppIds.length > 0) {
      history = await db
        .select()
        .from(schema.pipelineHistory)
        .where(sql`${schema.pipelineHistory.opportunityId} = ANY(${oppIds})`)
        .orderBy(desc(schema.pipelineHistory.createdAt));
    }

    // Brain note
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
      content: [{
        type: "text",
        text: JSON.stringify({
          organization: {
            name: org.name, name_zh: org.nameZh, type: org.orgType,
            aum: formatCurrency(org.aumUsd), headquarters: org.headquarters,
            country: org.country, website: org.website,
            sector_focus: org.sectorFocus, notes: org.notes,
            owner: org.relationshipOwner, entities: org.entityTags,
          },
          opportunities: opps.map((o) => ({
            name: o.name, stage: o.stage, type: o.opportunityType,
            deal_size: formatCurrency(o.dealSize), commitment: formatCurrency(o.commitment),
            owner: o.leadOwner, status: o.status,
          })),
          people: orgPeople.map((p) => ({
            name: p.person.fullName, name_zh: p.person.fullNameZh,
            title: p.affiliation.title, relationship: p.person.relationshipStrength,
            score: p.person.relationshipScore, primary: p.affiliation.isPrimaryContact,
            email: p.person.email, phone: p.person.phone,
            wechat: p.person.wechat, telegram: p.person.telegram,
            introduced_by: p.person.introducedByName, intro_chain: p.person.introChain,
          })),
          interactions: recentInteractions.map((i) => ({
            date: i.interactionDate, type: i.interactionType,
            summary: i.summary, by: i.teamMember, location: i.location,
          })),
          pipeline_history: history.map((h) => ({
            date: h.createdAt, from: h.fromStage, to: h.toStage,
            by: h.changedBy, notes: h.notes,
          })),
          brain_note: brainNote,
        }, null, 2),
      }],
    };
  })
);

// ── Tool 6: lp_update_contact ──────────────────────────────────────────────

server.tool(
  "lp_update_contact",
  "Update structured fields on a person or organization.",
  {
    contact_name: z.string().optional().describe("Person to update"),
    organization: z.string().optional().describe("Organization to update"),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    wechat: z.string().optional(),
    telegram: z.string().optional(),
    linkedin: z.string().optional(),
    headquarters: z.string().optional(),
    website: z.string().optional(),
    aum: z.string().optional(),
    target_commitment: z.string().optional(),
    org_type: z.enum(["lp", "portfolio_company", "prospect", "strategic_partner", "developer", "manufacturer", "hyperscaler", "epc", "corporate", "other"]).optional(),
    relationship_strength: z.enum(["strong", "medium", "weak", "cold"]).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  safeHandler(async (params) => {
    const updated = [];

    // Update person
    if (params.contact_name) {
      const person = await fuzzyFindPerson(params.contact_name);
      if (person) {
        const u = { updatedAt: new Date() };
        if (params.email) u.email = params.email;
        if (params.phone) u.phone = params.phone;
        if (params.title) u.title = params.title;
        if (params.wechat) u.wechat = params.wechat;
        if (params.telegram) u.telegram = params.telegram;
        if (params.linkedin) u.linkedin = params.linkedin;
        if (params.relationship_strength) u.relationshipStrength = params.relationship_strength;
        if (params.tags) u.tags = params.tags;
        if (params.notes) u.notes = params.notes;

        await db.update(schema.people).set(u).where(eq(schema.people.id, person.id));
        updated.push(`Person ${person.fullName} updated`);
      } else {
        updated.push(`Person "${params.contact_name}" not found`);
      }
    }

    // Update org
    if (params.organization) {
      const org = await fuzzyFindOrg(params.organization);
      if (org) {
        const u = { updatedAt: new Date() };
        if (params.headquarters) u.headquarters = params.headquarters;
        if (params.website) u.website = params.website;
        if (params.aum) u.aumUsd = params.aum;
        if (params.target_commitment) u.targetCommitment = params.target_commitment;
        if (params.org_type) u.orgType = params.org_type;
        if (params.notes) u.notes = params.notes;
        if (params.tags) u.tags = params.tags;

        await db.update(schema.organizations).set(u).where(eq(schema.organizations.id, org.id));
        updated.push(`Organization ${org.name} updated`);
      } else {
        updated.push(`Organization "${params.organization}" not found`);
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ updates: updated }, null, 2) }],
    };
  })
);

// ── Start Server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
