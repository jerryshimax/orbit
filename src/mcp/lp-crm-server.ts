#!/usr/bin/env npx tsx
/**
 * Orbit — Relationship CRM — Current Equities Fund I
 *
 * 6 tools for Cloud to manage LP relationships:
 * - lp_log_interaction: Create/update LP + contact + log touchpoint
 * - lp_pipeline_status: Pipeline summary with counts and commitments
 * - lp_move_stage: Move LP org to new pipeline stage
 * - lp_search: Search LPs by stage, type, staleness, owner
 * - lp_get_detail: Full LP dossier for call prep
 * - lp_update_contact: Update structured fields on contact/org
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
  lte,
  isNull,
  or,
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

async function fuzzyFindOrg(name: string) {
  const results = await db
    .select()
    .from(schema.lpOrganizations)
    .where(ilike(schema.lpOrganizations.name, `%${name}%`))
    .limit(1);
  return results[0] ?? null;
}

async function fuzzyFindContact(name: string, orgId?: string) {
  const conditions = [ilike(schema.lpContacts.fullName, `%${name}%`)];
  if (orgId) {
    conditions.push(eq(schema.lpContacts.organizationId, orgId));
  }
  const results = await db
    .select()
    .from(schema.lpContacts)
    .where(and(...conditions))
    .limit(1);
  return results[0] ?? null;
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

/** Wrap tool handlers with error handling so DB failures return error text instead of crashing. */
function safeHandler<T>(fn: (params: T) => Promise<{ content: { type: string; text: string }[] }>): (params: T) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  return async (params: T) => {
    try {
      return await fn(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Orbit MCP error: ${msg}`);
      return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
    }
  };
}

// ── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "orbit",
  version: "1.0.0",
});

// ── Tool 1: lp_log_interaction ─────────────────────────────────────────────

server.tool(
  "lp_log_interaction",
  "Log an LP interaction. Creates org/contact if new, logs the touchpoint. Use for any LP meeting, call, email, conference encounter.",
  {
    contact_name: z.string().describe("Full name of the LP contact"),
    organization: z.string().describe("LP organization name"),
    interaction_type: z
      .enum([
        "meeting",
        "call",
        "email",
        "conference",
        "intro",
        "dd_session",
        "deck_sent",
        "follow_up",
        "commitment",
        "note",
      ])
      .describe("Type of interaction"),
    summary: z.string().describe("Brief summary of the interaction"),
    team_member: z
      .string()
      .describe("Who logged this (jerry, ray, matt, angel, etc.)"),
    source: z
      .enum(["telegram", "email", "meeting_transcript", "web", "brain_sync"])
      .default("telegram")
      .optional(),
    lp_type: z
      .enum([
        "pension",
        "sovereign_wealth",
        "endowment",
        "foundation",
        "family_office",
        "fund_of_funds",
        "insurance",
        "corporate",
        "hnwi",
        "gp_commit",
        "other",
      ])
      .optional()
      .describe("Type of LP (if known)"),
    aum: z.string().optional().describe("AUM in millions USD (e.g. '2000' for $2B)"),
    title: z.string().optional().describe("Contact's title"),
    location: z.string().optional().describe("Where the interaction happened"),
    pipeline_stage: z
      .enum([
        "prospect",
        "intro",
        "meeting",
        "dd",
        "soft_circle",
        "committed",
        "closed",
        "passed",
      ])
      .optional()
      .describe("Set pipeline stage (if different from current)"),
    target_commitment: z
      .string()
      .optional()
      .describe("Target commitment in millions USD"),
    email: z.string().optional().describe("Contact email"),
    introduced_by: z.string().optional().describe("Who introduced this LP"),
  },
  safeHandler(async (params) => {
    // 1. Find or create org
    let org = await fuzzyFindOrg(params.organization);
    if (!org) {
      const [newOrg] = await db
        .insert(schema.lpOrganizations)
        .values({
          name: params.organization,
          lpType: params.lp_type ?? null,
          aumUsd: params.aum ?? null,
          pipelineStage: params.pipeline_stage ?? "prospect",
          targetCommitment: params.target_commitment ?? null,
          relationshipOwner: params.team_member,
        })
        .returning();
      org = newOrg;
    } else if (params.pipeline_stage || params.aum || params.lp_type) {
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (params.aum) updates.aumUsd = params.aum;
      if (params.lp_type) updates.lpType = params.lp_type;
      if (params.target_commitment)
        updates.targetCommitment = params.target_commitment;
      if (params.pipeline_stage && params.pipeline_stage !== org.pipelineStage) {
        // Log pipeline change
        await db.insert(schema.pipelineHistory).values({
          organizationId: org.id,
          fromStage: org.pipelineStage,
          toStage: params.pipeline_stage,
          changedBy: params.team_member,
          notes: `Stage changed during interaction logging`,
        });
        updates.pipelineStage = params.pipeline_stage;
        updates.stageChangedAt = new Date();
      }
      await db
        .update(schema.lpOrganizations)
        .set(updates)
        .where(eq(schema.lpOrganizations.id, org.id));
    }

    // 2. Find or create contact
    let contact = await fuzzyFindContact(params.contact_name, org.id);
    if (!contact) {
      const nameParts = params.contact_name.split(" ");
      const [newContact] = await db
        .insert(schema.lpContacts)
        .values({
          organizationId: org.id,
          fullName: params.contact_name,
          firstName: nameParts[0] ?? null,
          lastName: nameParts.slice(1).join(" ") || null,
          title: params.title ?? null,
          email: params.email ?? null,
          isPrimary: true,
          source: params.location ?? params.source ?? "telegram",
          introducedBy: params.introduced_by ?? null,
          lastInteractionAt: new Date(),
        })
        .returning();
      contact = newContact;
    } else {
      const contactUpdates: Record<string, unknown> = {
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      };
      if (params.title) contactUpdates.title = params.title;
      if (params.email) contactUpdates.email = params.email;
      await db
        .update(schema.lpContacts)
        .set(contactUpdates)
        .where(eq(schema.lpContacts.id, contact.id));
    }

    // 3. Log interaction
    const [interaction] = await db
      .insert(schema.interactions)
      .values({
        organizationId: org.id,
        contactId: contact.id,
        interactionType: params.interaction_type,
        source: params.source ?? "telegram",
        teamMember: params.team_member,
        summary: params.summary,
        rawInput: JSON.stringify(params),
        location: params.location ?? null,
      })
      .returning();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              status: "logged",
              organization: { id: org.id, name: org.name, stage: org.pipelineStage },
              contact: { id: contact.id, name: contact.fullName },
              interaction_id: interaction.id,
              message: `Logged ${params.interaction_type} with ${params.contact_name} @ ${params.organization}. Pipeline: ${org.pipelineStage}.`,
            },
            null,
            2
          ),
        },
      ],
    };
  })
);

// ── Tool 2: lp_pipeline_status ─────────────────────────────────────────────

server.tool(
  "lp_pipeline_status",
  "Get LP pipeline summary: counts per stage, total commitments, stale LPs.",
  {
    stale_days: z
      .number()
      .optional()
      .describe("Days threshold for stale LP warning (default 14)"),
  },
  safeHandler(async (params) => {
    const staleDays = params.stale_days ?? 14;
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    // Get all orgs
    const orgs = await db.select().from(schema.lpOrganizations);

    // Build stage counts
    const stageBuckets: Record<string, { count: number; target: number; actual: number }> = {};
    for (const org of orgs) {
      const s = org.pipelineStage;
      if (!stageBuckets[s]) stageBuckets[s] = { count: 0, target: 0, actual: 0 };
      stageBuckets[s].count++;
      stageBuckets[s].target += parseFloat(org.targetCommitment ?? "0");
      stageBuckets[s].actual += parseFloat(org.actualCommitment ?? "0");
    }

    const pipeline = Object.entries(stageBuckets).map(([stage, data]) => ({
      stage,
      count: data.count,
      target: formatCurrency(String(data.target)),
      actual: formatCurrency(String(data.actual)),
    }));

    const totalCommitted = (stageBuckets["committed"]?.actual ?? 0) + (stageBuckets["closed"]?.actual ?? 0);

    // Find stale LPs in active stages
    const activeStages = ["intro", "meeting", "dd", "soft_circle"];
    const activeOrgs = orgs.filter((o) => activeStages.includes(o.pipelineStage));
    const staleLPs: { name: string; stage: string; last_interaction: string }[] = [];

    for (const org of activeOrgs) {
      const lastInt = await db
        .select({ maxDate: sql<string>`max(${schema.interactions.interactionDate})` })
        .from(schema.interactions)
        .where(eq(schema.interactions.organizationId, org.id));

      const lastDate = lastInt[0]?.maxDate;
      if (!lastDate || new Date(lastDate) < staleDate) {
        staleLPs.push({
          name: org.name,
          stage: org.pipelineStage,
          last_interaction: lastDate ?? "never",
        });
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              pipeline,
              total_committed: formatCurrency(String(totalCommitted)),
              fund_target: "$300-500M",
              stale_lps: staleLPs,
              total_lps: orgs.length,
            },
            null,
            2
          ),
        },
      ],
    };
  })
);

// ── Tool 3: lp_move_stage ──────────────────────────────────────────────────

server.tool(
  "lp_move_stage",
  "Move an LP organization to a new pipeline stage.",
  {
    organization: z.string().describe("LP organization name"),
    new_stage: z
      .enum([
        "prospect",
        "intro",
        "meeting",
        "dd",
        "soft_circle",
        "committed",
        "closed",
        "passed",
      ])
      .describe("New pipeline stage"),
    changed_by: z.string().describe("Who made this change"),
    notes: z.string().optional().describe("Reason for stage change"),
    actual_commitment: z
      .string()
      .optional()
      .describe("Actual commitment amount in millions (for committed/closed)"),
  },
  safeHandler(async (params) => {
    const org = await fuzzyFindOrg(params.organization);
    if (!org) {
      return {
        content: [
          {
            type: "text" as const,
            text: `LP organization "${params.organization}" not found.`,
          },
        ],
      };
    }

    const oldStage = org.pipelineStage;

    // Log history
    await db.insert(schema.pipelineHistory).values({
      organizationId: org.id,
      fromStage: oldStage,
      toStage: params.new_stage,
      changedBy: params.changed_by,
      notes: params.notes ?? null,
    });

    // Update org
    const updates: Record<string, unknown> = {
      pipelineStage: params.new_stage,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    };
    if (params.actual_commitment) {
      updates.actualCommitment = params.actual_commitment;
    }

    await db
      .update(schema.lpOrganizations)
      .set(updates)
      .where(eq(schema.lpOrganizations.id, org.id));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              status: "moved",
              organization: org.name,
              from: oldStage,
              to: params.new_stage,
              actual_commitment: params.actual_commitment
                ? formatCurrency(params.actual_commitment)
                : undefined,
              message: `${org.name}: ${oldStage} → ${params.new_stage}`,
            },
            null,
            2
          ),
        },
      ],
    };
  })
);

// ── Tool 4: lp_search ──────────────────────────────────────────────────────

server.tool(
  "lp_search",
  "Search LP organizations by stage, type, staleness, or owner.",
  {
    stage: z
      .enum([
        "prospect",
        "intro",
        "meeting",
        "dd",
        "soft_circle",
        "committed",
        "closed",
        "passed",
      ])
      .optional(),
    lp_type: z
      .enum([
        "pension",
        "sovereign_wealth",
        "endowment",
        "foundation",
        "family_office",
        "fund_of_funds",
        "insurance",
        "corporate",
        "hnwi",
        "gp_commit",
        "other",
      ])
      .optional(),
    days_since_contact: z
      .number()
      .optional()
      .describe("Find LPs with no interaction in N days"),
    relationship_owner: z.string().optional(),
    query: z.string().optional().describe("Free text search on org name"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  safeHandler(async (params) => {
    const conditions = [];

    if (params.stage) {
      conditions.push(
        eq(schema.lpOrganizations.pipelineStage, params.stage)
      );
    }
    if (params.lp_type) {
      conditions.push(eq(schema.lpOrganizations.lpType, params.lp_type));
    }
    if (params.relationship_owner) {
      conditions.push(
        ilike(
          schema.lpOrganizations.relationshipOwner,
          `%${params.relationship_owner}%`
        )
      );
    }
    if (params.query) {
      conditions.push(
        ilike(schema.lpOrganizations.name, `%${params.query}%`)
      );
    }

    let results = await db
      .select()
      .from(schema.lpOrganizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(schema.lpOrganizations.name))
      .limit(params.limit ?? 20);

    // Filter by staleness if requested
    if (params.days_since_contact) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - params.days_since_contact);

      const staleOrgIds = new Set<string>();
      for (const org of results) {
        const lastInteraction = await db
          .select({ maxDate: sql<string>`max(${schema.interactions.interactionDate})` })
          .from(schema.interactions)
          .where(eq(schema.interactions.organizationId, org.id));

        const lastDate = lastInteraction[0]?.maxDate;
        if (!lastDate || new Date(lastDate) < cutoff) {
          staleOrgIds.add(org.id);
        }
      }
      results = results.filter((r) => staleOrgIds.has(r.id));
    }

    const formatted = results.map((org) => ({
      name: org.name,
      stage: org.pipelineStage,
      type: org.lpType,
      aum: formatCurrency(org.aumUsd),
      target: formatCurrency(org.targetCommitment),
      owner: org.relationshipOwner,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { count: formatted.length, results: formatted },
            null,
            2
          ),
        },
      ],
    };
  })
);

// ── Tool 5: lp_get_detail ──────────────────────────────────────────────────

server.tool(
  "lp_get_detail",
  "Get full LP dossier: org info, all contacts, interaction timeline, pipeline history. Use for call prep.",
  {
    organization: z.string().describe("LP organization name"),
  },
  safeHandler(async (params) => {
    const org = await fuzzyFindOrg(params.organization);
    if (!org) {
      return {
        content: [
          {
            type: "text" as const,
            text: `LP organization "${params.organization}" not found.`,
          },
        ],
      };
    }

    const contacts = await db
      .select()
      .from(schema.lpContacts)
      .where(eq(schema.lpContacts.organizationId, org.id))
      .orderBy(desc(schema.lpContacts.isPrimary));

    const recentInteractions = await db
      .select()
      .from(schema.interactions)
      .where(eq(schema.interactions.organizationId, org.id))
      .orderBy(desc(schema.interactions.interactionDate))
      .limit(20);

    const history = await db
      .select()
      .from(schema.pipelineHistory)
      .where(eq(schema.pipelineHistory.organizationId, org.id))
      .orderBy(desc(schema.pipelineHistory.createdAt));

    // Read Brain note if path exists
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
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              organization: {
                name: org.name,
                type: org.lpType,
                aum: formatCurrency(org.aumUsd),
                stage: org.pipelineStage,
                target_commitment: formatCurrency(org.targetCommitment),
                actual_commitment: formatCurrency(org.actualCommitment),
                owner: org.relationshipOwner,
                headquarters: org.headquarters,
                website: org.website,
                sector_focus: org.sectorFocus,
                notes: org.notes,
              },
              contacts: contacts.map((c) => ({
                name: c.fullName,
                title: c.title,
                email: c.email,
                phone: c.phone,
                relationship: c.relationship,
                primary: c.isPrimary,
                last_interaction: c.lastInteractionAt,
                source: c.source,
                introduced_by: c.introducedBy,
              })),
              interactions: recentInteractions.map((i) => ({
                date: i.interactionDate,
                type: i.interactionType,
                summary: i.summary,
                by: i.teamMember,
                location: i.location,
              })),
              pipeline_history: history.map((h) => ({
                date: h.createdAt,
                from: h.fromStage,
                to: h.toStage,
                by: h.changedBy,
                notes: h.notes,
              })),
              brain_note: brainNote,
            },
            null,
            2
          ),
        },
      ],
    };
  })
);

// ── Tool 6: lp_update_contact ──────────────────────────────────────────────

server.tool(
  "lp_update_contact",
  "Update structured fields on an LP contact or organization.",
  {
    contact_name: z.string().optional().describe("Contact to update"),
    organization: z.string().optional().describe("Organization to update"),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    linkedin: z.string().optional(),
    headquarters: z.string().optional(),
    website: z.string().optional(),
    aum: z.string().optional().describe("AUM in millions USD"),
    target_commitment: z.string().optional().describe("Target commitment in millions"),
    lp_type: z
      .enum([
        "pension",
        "sovereign_wealth",
        "endowment",
        "foundation",
        "family_office",
        "fund_of_funds",
        "insurance",
        "corporate",
        "hnwi",
        "gp_commit",
        "other",
      ])
      .optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  safeHandler(async (params) => {
    const updated: string[] = [];

    // Update contact
    if (params.contact_name) {
      const contact = await fuzzyFindContact(params.contact_name);
      if (contact) {
        const contactUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (params.email) contactUpdates.email = params.email;
        if (params.phone) contactUpdates.phone = params.phone;
        if (params.title) contactUpdates.title = params.title;
        if (params.linkedin) contactUpdates.linkedIn = params.linkedin;
        if (params.tags) contactUpdates.tags = params.tags;

        await db
          .update(schema.lpContacts)
          .set(contactUpdates)
          .where(eq(schema.lpContacts.id, contact.id));
        updated.push(`Contact ${contact.fullName} updated`);
      } else {
        updated.push(`Contact "${params.contact_name}" not found`);
      }
    }

    // Update org
    if (params.organization) {
      const org = await fuzzyFindOrg(params.organization);
      if (org) {
        const orgUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (params.headquarters) orgUpdates.headquarters = params.headquarters;
        if (params.website) orgUpdates.website = params.website;
        if (params.aum) orgUpdates.aumUsd = params.aum;
        if (params.target_commitment)
          orgUpdates.targetCommitment = params.target_commitment;
        if (params.lp_type) orgUpdates.lpType = params.lp_type;
        if (params.notes) orgUpdates.notes = params.notes;
        if (params.tags) orgUpdates.tags = params.tags;

        await db
          .update(schema.lpOrganizations)
          .set(orgUpdates)
          .where(eq(schema.lpOrganizations.id, org.id));
        updated.push(`Organization ${org.name} updated`);
      } else {
        updated.push(`Organization "${params.organization}" not found`);
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ updates: updated }, null, 2),
        },
      ],
    };
  })
);

// ── Start Server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
