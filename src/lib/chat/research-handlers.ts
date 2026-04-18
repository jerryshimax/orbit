/**
 * Research / Nexus tool handlers.
 *
 * Handles: identify_company, research_company, arena_analysis,
 * save_to_universe, get_supply_chain, universe_search.
 */

import { db } from "@/db";
import {
  companyUniverse,
  supplyChainEdges,
  researchSessions,
  organizations,
} from "@/db/schema";
import { eq, ilike, sql, desc, and, or } from "drizzle-orm";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";

// ── Helpers ────────────────────────────────────────────────────────────────

const ARENA_ENGINE = path.join(
  process.env.HOME ?? "/Users/jerryshi",
  "Ship/arena/engine"
);
const MARKET_DATA_PY = path.join(ARENA_ENGINE, "gt_market_data.py");

function runPython(script: string, args: string[]): string {
  try {
    return execFileSync("python3", [script, ...args], {
      timeout: 30_000,
      encoding: "utf-8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
  } catch (err: any) {
    return `ERROR: ${err.message?.slice(0, 500) ?? err}`;
  }
}

async function fuzzyFindCompany(nameOrTicker: string) {
  const q = `%${nameOrTicker}%`;
  const results = await db
    .select()
    .from(companyUniverse)
    .where(
      or(
        ilike(companyUniverse.name, q),
        ilike(companyUniverse.nameZh, q),
        ilike(companyUniverse.tickerPrimary, q),
        sql`${companyUniverse.tickers}::text ILIKE ${q}`
      )
    )
    .limit(5);
  return results;
}

// ── Tool: identify_company ──────────────────────────────────────────────

export async function handleIdentifyCompany(params: { query: string }) {
  const matches = await fuzzyFindCompany(params.query);

  if (matches.length > 0) {
    return {
      status: "found",
      companies: matches.map((c) => ({
        id: c.id,
        name: c.name,
        name_zh: c.nameZh,
        ticker_primary: c.tickerPrimary,
        tickers: c.tickers,
        sector: c.sector,
        sub_sector: c.subSector,
        supply_chain_position: c.supplyChainPosition,
        country: c.country,
        research_count: c.researchCount,
        last_researched_at: c.lastResearchedAt,
      })),
    };
  }

  // Also check CRM organizations
  const orgMatches = await db
    .select()
    .from(organizations)
    .where(
      or(
        ilike(organizations.name, `%${params.query}%`),
        ilike(organizations.nameZh, `%${params.query}%`)
      )
    )
    .limit(3);

  return {
    status: "not_in_universe",
    hint: "Company not yet in research universe. Use save_to_universe after researching.",
    crm_matches: orgMatches.map((o) => ({
      org_id: o.id,
      name: o.name,
      name_zh: o.nameZh,
      type: o.orgType,
    })),
  };
}

// ── Tool: research_company ──────────────────────────────────────────────

export async function handleResearchCompany(params: {
  company_id?: string;
  name?: string;
  ticker?: string;
  include_news?: boolean;
  include_financials?: boolean;
}) {
  const includeFinancials = params.include_financials !== false;

  // Resolve the company
  let company: typeof companyUniverse.$inferSelect | null = null;
  if (params.company_id) {
    const [found] = await db
      .select()
      .from(companyUniverse)
      .where(eq(companyUniverse.id, params.company_id))
      .limit(1);
    company = found ?? null;
  }

  // Build ticker list for market data
  const tickers: Record<string, string> = {};

  if (company?.tickers) {
    const t = company.tickers as { A?: string; HK?: string; US?: string };
    if (t.A) tickers[`${company.name} (A)`] = t.A;
    if (t.HK) tickers[`${company.name} (HK)`] = t.HK;
    if (t.US) tickers[`${company.name} (US)`] = t.US;
  } else if (params.ticker) {
    tickers[params.name ?? params.ticker] = params.ticker;
  }

  const result: Record<string, unknown> = {
    company: company
      ? {
          id: company.id,
          name: company.name,
          name_zh: company.nameZh,
          tickers: company.tickers,
          sector: company.sector,
          sub_sector: company.subSector,
          supply_chain_position: company.supplyChainPosition,
          description: company.description,
        }
      : { name: params.name, ticker: params.ticker },
    data_sources: [] as string[],
  };

  // Fetch market data via yfinance
  if (includeFinancials && Object.keys(tickers).length > 0) {
    const tmpFile = `/tmp/nexus_prices_${Date.now()}.txt`;
    const priceOutput = runPython(MARKET_DATA_PY, [
      "prices",
      "--tickers",
      JSON.stringify(tickers),
      "--output",
      tmpFile,
    ]);
    result.market_data = priceOutput;
    (result.data_sources as string[]).push("yfinance");
  }

  // Search Brain vault for existing research
  const brainDir = path.join(
    process.env.HOME ?? "/Users/jerryshi",
    "Work/[00] Brain"
  );
  const searchName = company?.name ?? params.name ?? params.ticker ?? "";
  const searchNameZh = company?.nameZh ?? "";
  if (searchName && existsSync(brainDir)) {
    try {
      // Use readdirSync + readFileSync for safe file searching (no shell injection)
      const brainFiles: string[] = [];
      const files = readdirSync(brainDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        if (brainFiles.length >= 5) break;
        const filePath = path.join(brainDir, file);
        // Check filename first (fast)
        if (
          file.toLowerCase().includes(searchName.toLowerCase()) ||
          (searchNameZh && file.includes(searchNameZh))
        ) {
          brainFiles.push(filePath);
          continue;
        }
        // Check content (slower, only for top-level files)
        try {
          const content = readFileSync(filePath, "utf-8");
          if (
            content.includes(searchName) ||
            (searchNameZh && content.includes(searchNameZh))
          ) {
            brainFiles.push(filePath);
          }
        } catch {
          // Skip unreadable files
        }
      }

      if (brainFiles.length > 0) {
        result.brain_notes = brainFiles.map((f) => {
          const content = readFileSync(f, "utf-8").slice(0, 2000);
          return { path: f, snippet: content };
        });
        (result.data_sources as string[]).push("brain_vault");
      }
    } catch {
      // Brain dir not accessible
    }
  }

  // Fetch prior research sessions
  if (company?.id) {
    const priorSessions = await db
      .select()
      .from(researchSessions)
      .where(eq(researchSessions.companyId, company.id))
      .orderBy(desc(researchSessions.createdAt))
      .limit(3);
    if (priorSessions.length > 0) {
      result.prior_research = priorSessions.map((s) => ({
        id: s.id,
        date: s.createdAt,
        topic: s.topic,
        brief_summary: s.brief
          ? JSON.stringify(s.brief).slice(0, 500)
          : null,
      }));
      (result.data_sources as string[]).push("prior_research");
    }

    // Fetch supply chain edges
    const edges = await db
      .select({
        edge: supplyChainEdges,
        targetName: companyUniverse.name,
        targetNameZh: companyUniverse.nameZh,
      })
      .from(supplyChainEdges)
      .innerJoin(
        companyUniverse,
        eq(supplyChainEdges.targetCompanyId, companyUniverse.id)
      )
      .where(eq(supplyChainEdges.sourceCompanyId, company.id));

    const reverseEdges = await db
      .select({
        edge: supplyChainEdges,
        sourceName: companyUniverse.name,
        sourceNameZh: companyUniverse.nameZh,
      })
      .from(supplyChainEdges)
      .innerJoin(
        companyUniverse,
        eq(supplyChainEdges.sourceCompanyId, companyUniverse.id)
      )
      .where(eq(supplyChainEdges.targetCompanyId, company.id));

    if (edges.length > 0 || reverseEdges.length > 0) {
      result.supply_chain = {
        outgoing: edges.map((e) => ({
          target: e.targetName,
          target_zh: e.targetNameZh,
          type: e.edge.relationshipType,
          description: e.edge.description,
        })),
        incoming: reverseEdges.map((e) => ({
          source: e.sourceName,
          source_zh: e.sourceNameZh,
          type: e.edge.relationshipType,
          description: e.edge.description,
        })),
      };
    }
  }

  return result;
}

// ── Tool: arena_analysis ────────────────────────────────────────────────

export async function handleArenaAnalysis(params: {
  company_id: string;
  mode?: string;
  focus?: string;
}) {
  const [company] = await db
    .select()
    .from(companyUniverse)
    .where(eq(companyUniverse.id, params.company_id))
    .limit(1);

  if (!company) return { error: "Company not found in universe" };

  // For now, return structured context for the LLM to synthesize
  // multi-perspective analysis. Full Arena engine integration (calling
  // Gemini + Grok in parallel) comes in Phase 2.
  return {
    status: "ready_for_analysis",
    company: {
      name: company.name,
      name_zh: company.nameZh,
      tickers: company.tickers,
      sector: company.sector,
      sub_sector: company.subSector,
      supply_chain_position: company.supplyChainPosition,
      description: company.description,
      description_zh: company.descriptionZh,
    },
    mode: params.mode ?? "quick",
    focus: params.focus,
    instructions:
      "Analyze this company as 3 independent analysts (bull, bear, neutral). " +
      "For each perspective: thesis (2-3 sentences), key risk, 6-month price target with reasoning. " +
      "Then synthesize: where do they agree? Where do they diverge? What's the key debate?",
  };
}

// ── Tool: save_to_universe ──────────────────────────────────────────────

export async function handleSaveToUniverse(params: {
  name: string;
  name_zh?: string;
  ticker_primary?: string;
  tickers?: { A?: string; HK?: string; US?: string };
  sector?: string;
  sub_sector?: string;
  supply_chain_position?: string;
  country?: string;
  exchange?: string;
  description?: string;
  description_zh?: string;
  relationships?: Array<{
    target_name: string;
    type: string;
    description?: string;
    confidence?: number;
  }>;
}) {
  // Check if already exists
  const existing = await fuzzyFindCompany(params.name);
  if (existing.length > 0) {
    const company = existing[0];
    await db
      .update(companyUniverse)
      .set({
        nameZh: params.name_zh ?? company.nameZh,
        tickerPrimary: params.ticker_primary ?? company.tickerPrimary,
        tickers: params.tickers ?? company.tickers,
        sector: params.sector ?? company.sector,
        subSector: params.sub_sector ?? company.subSector,
        supplyChainPosition:
          params.supply_chain_position ?? company.supplyChainPosition,
        country: params.country ?? company.country,
        exchange: params.exchange ?? company.exchange,
        description: params.description ?? company.description,
        descriptionZh: params.description_zh ?? company.descriptionZh,
        updatedAt: new Date(),
      })
      .where(eq(companyUniverse.id, company.id));

    if (params.relationships) {
      await saveRelationships(company.id, params.relationships);
    }

    return { status: "updated", id: company.id, name: company.name };
  }

  // Check CRM for org link
  let orgId: string | undefined;
  const orgMatch = await db
    .select()
    .from(organizations)
    .where(
      or(
        ilike(organizations.name, `%${params.name}%`),
        params.name_zh
          ? ilike(organizations.nameZh, `%${params.name_zh}%`)
          : sql`false`
      )
    )
    .limit(1);
  if (orgMatch.length > 0) orgId = orgMatch[0].id;

  const [created] = await db
    .insert(companyUniverse)
    .values({
      organizationId: orgId,
      name: params.name,
      nameZh: params.name_zh,
      tickerPrimary: params.ticker_primary,
      tickers: params.tickers,
      sector: params.sector,
      subSector: params.sub_sector,
      supplyChainPosition: params.supply_chain_position,
      country: params.country,
      exchange: params.exchange,
      description: params.description,
      descriptionZh: params.description_zh,
    })
    .returning();

  if (params.relationships) {
    await saveRelationships(created.id, params.relationships);
  }

  return { status: "created", id: created.id, name: created.name };
}

async function saveRelationships(
  companyId: string,
  relationships: Array<{
    target_name: string;
    type: string;
    description?: string;
    confidence?: number;
  }>
) {
  for (const rel of relationships) {
    const targets = await fuzzyFindCompany(rel.target_name);
    let targetId: string;

    if (targets.length > 0) {
      targetId = targets[0].id;
    } else {
      const [newTarget] = await db
        .insert(companyUniverse)
        .values({ name: rel.target_name })
        .returning();
      targetId = newTarget.id;
    }

    // Upsert edge
    const existingEdge = await db
      .select()
      .from(supplyChainEdges)
      .where(
        and(
          eq(supplyChainEdges.sourceCompanyId, companyId),
          eq(supplyChainEdges.targetCompanyId, targetId),
          eq(supplyChainEdges.relationshipType, rel.type as any)
        )
      )
      .limit(1);

    if (existingEdge.length === 0) {
      await db.insert(supplyChainEdges).values({
        sourceCompanyId: companyId,
        targetCompanyId: targetId,
        relationshipType: rel.type as any,
        description: rel.description,
        confidence: rel.confidence ?? 0.5,
      });
    } else {
      await db
        .update(supplyChainEdges)
        .set({
          description: rel.description ?? existingEdge[0].description,
          confidence: rel.confidence ?? existingEdge[0].confidence,
          updatedAt: new Date(),
        })
        .where(eq(supplyChainEdges.id, existingEdge[0].id));
    }
  }
}

// ── Tool: get_supply_chain ──────────────────────────────────────────────

export async function handleGetSupplyChain(params: {
  company_id?: string;
  company_name?: string;
  relationship_type?: string;
  depth?: number;
}) {
  let companyId = params.company_id;

  if (!companyId && params.company_name) {
    const matches = await fuzzyFindCompany(params.company_name);
    if (matches.length === 0) return { error: "Company not found" };
    companyId = matches[0].id;
  }

  if (!companyId) return { error: "Provide company_id or company_name" };

  const [outgoing, incoming] = await Promise.all([
    db
      .select({
        edge: supplyChainEdges,
        targetName: companyUniverse.name,
        targetNameZh: companyUniverse.nameZh,
        targetTicker: companyUniverse.tickerPrimary,
      })
      .from(supplyChainEdges)
      .innerJoin(
        companyUniverse,
        eq(supplyChainEdges.targetCompanyId, companyUniverse.id)
      )
      .where(eq(supplyChainEdges.sourceCompanyId, companyId)),
    db
      .select({
        edge: supplyChainEdges,
        sourceName: companyUniverse.name,
        sourceNameZh: companyUniverse.nameZh,
        sourceTicker: companyUniverse.tickerPrimary,
      })
      .from(supplyChainEdges)
      .innerJoin(
        companyUniverse,
        eq(supplyChainEdges.sourceCompanyId, companyUniverse.id)
      )
      .where(eq(supplyChainEdges.targetCompanyId, companyId)),
  ]);

  return {
    company_id: companyId,
    outgoing: outgoing.map((e) => ({
      target: e.targetName,
      target_zh: e.targetNameZh,
      target_ticker: e.targetTicker,
      type: e.edge.relationshipType,
      description: e.edge.description,
      confidence: e.edge.confidence,
      verified: e.edge.verified,
    })),
    incoming: incoming.map((e) => ({
      source: e.sourceName,
      source_zh: e.sourceNameZh,
      source_ticker: e.sourceTicker,
      type: e.edge.relationshipType,
      description: e.edge.description,
      confidence: e.edge.confidence,
      verified: e.edge.verified,
    })),
    total_connections: outgoing.length + incoming.length,
  };
}

// ── Tool: universe_search ───────────────────────────────────────────────

export async function handleUniverseSearch(params: {
  query?: string;
  sector?: string;
  sub_sector?: string;
  supply_chain_position?: string;
  country?: string;
  limit?: number;
}) {
  const conditions: any[] = [];

  if (params.query) {
    const q = `%${params.query}%`;
    conditions.push(
      or(
        ilike(companyUniverse.name, q),
        ilike(companyUniverse.nameZh, q),
        ilike(companyUniverse.tickerPrimary, q)
      )
    );
  }
  if (params.sector) {
    conditions.push(ilike(companyUniverse.sector, `%${params.sector}%`));
  }
  if (params.sub_sector) {
    conditions.push(ilike(companyUniverse.subSector, `%${params.sub_sector}%`));
  }
  if (params.supply_chain_position) {
    conditions.push(
      eq(companyUniverse.supplyChainPosition, params.supply_chain_position)
    );
  }
  if (params.country) {
    conditions.push(ilike(companyUniverse.country, `%${params.country}%`));
  }

  const results = await db
    .select()
    .from(companyUniverse)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(companyUniverse.lastResearchedAt))
    .limit(params.limit ?? 20);

  return {
    count: results.length,
    companies: results.map((c) => ({
      id: c.id,
      name: c.name,
      name_zh: c.nameZh,
      ticker_primary: c.tickerPrimary,
      tickers: c.tickers,
      sector: c.sector,
      sub_sector: c.subSector,
      supply_chain_position: c.supplyChainPosition,
      country: c.country,
      research_count: c.researchCount,
      last_researched_at: c.lastResearchedAt,
    })),
  };
}
