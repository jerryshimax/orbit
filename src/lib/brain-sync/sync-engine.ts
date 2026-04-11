/**
 * Brain Sync Engine — orchestrates syncing Brain files into Orbit DB.
 *
 * Flow:
 * 1. Scan Brain files via scanner
 * 2. For each file, check if brainNotePath already exists in target table
 * 3. Existing records: auto-update if changed
 * 4. New records: dedup by name, then queue or auto-create
 * 5. Log all operations to syncLog
 */

import { db } from "@/db";
import {
  people,
  organizations,
  opportunities,
  interactions,
  notes,
  personOrgAffiliations,
  syncQueue,
  syncLog,
} from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { scanBrainFiles, type BrainFileDescriptor } from "./scanner";
import {
  extractFromMemo,
  extractFromMeeting,
  extractFromPerson,
  extractFromResearch,
  type MemoData,
  type MeetingData,
  type PersonData,
  type ResearchData,
} from "./extractors";

export interface SyncResult {
  scanned: number;
  created: number;
  updated: number;
  queued: number;
  skipped: number;
  errors: number;
  details: SyncDetail[];
}

interface SyncDetail {
  path: string;
  type: string;
  action: "created" | "updated" | "queued" | "skipped" | "error";
  targetId?: string;
  error?: string;
}

// ── Main Entry ────────────────────────────────────────────────────────────

export async function syncBrainFiles(): Promise<SyncResult> {
  const files = scanBrainFiles();
  const result: SyncResult = {
    scanned: files.length,
    created: 0,
    updated: 0,
    queued: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const file of files) {
    try {
      const detail = await syncFile(file);
      result.details.push(detail);
      switch (detail.action) {
        case "created":
          result.created++;
          break;
        case "updated":
          result.updated++;
          break;
        case "queued":
          result.queued++;
          break;
        case "skipped":
          result.skipped++;
          break;
        case "error":
          result.errors++;
          break;
      }
    } catch (err) {
      result.errors++;
      result.details.push({
        path: file.path,
        type: file.type,
        action: "error",
        error: String(err),
      });
    }
  }

  return result;
}

// ── File Router ───────────────────────────────────────────────────────────

async function syncFile(file: BrainFileDescriptor): Promise<SyncDetail> {
  switch (file.type) {
    case "person":
      return syncPerson(file);
    case "memo":
      return syncMemo(file);
    case "meeting":
      return syncMeeting(file);
    case "research":
      return syncResearch(file);
    default:
      return { path: file.path, type: file.type, action: "skipped" };
  }
}

// ── Person Sync ───────────────────────────────────────────────────────────

async function syncPerson(file: BrainFileDescriptor): Promise<SyncDetail> {
  const data = extractFromPerson(file);
  const detail: SyncDetail = { path: file.path, type: "person", action: "skipped" };

  // Check if already linked by brainNotePath
  const [existing] = await db
    .select({ id: people.id, fullName: people.fullName })
    .from(people)
    .where(eq(people.brainNotePath, file.path))
    .limit(1);

  if (existing) {
    // Update existing record
    await db
      .update(people)
      .set({
        title: data.title,
        email: data.email,
        phone: data.phone,
        wechat: data.wechat,
        linkedin: data.linkedin,
        telegram: data.telegram,
        entityTags: data.entityTags,
        relationshipStrength: data.relationshipStrength as any,
        tags: data.tags,
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(people.id, existing.id));

    await logSync("brain", file.path, "updated_person", "people", existing.id, true);
    detail.action = "updated";
    detail.targetId = existing.id;
    return detail;
  }

  // Try dedup by exact name match
  const [nameMatch] = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.fullName, data.fullName))
    .limit(1);

  if (nameMatch) {
    // Link existing person to this Brain note
    await db
      .update(people)
      .set({
        brainNotePath: file.path,
        title: data.title ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        wechat: data.wechat ?? undefined,
        linkedin: data.linkedin ?? undefined,
        telegram: data.telegram ?? undefined,
        entityTags: data.entityTags,
        relationshipStrength: data.relationshipStrength as any,
        tags: data.tags,
        notes: data.notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(people.id, nameMatch.id));

    await logSync("brain", file.path, "linked_person", "people", nameMatch.id, true);
    detail.action = "updated";
    detail.targetId = nameMatch.id;
    return detail;
  }

  // New person — auto-create (people are low-risk)
  const [created] = await db
    .insert(people)
    .values({
      fullName: data.fullName,
      title: data.title,
      email: data.email,
      phone: data.phone,
      wechat: data.wechat,
      linkedin: data.linkedin,
      telegram: data.telegram,
      entityTags: data.entityTags,
      relationshipStrength: data.relationshipStrength as any,
      brainNotePath: file.path,
      tags: data.tags,
      notes: data.notes,
      createdBy: "brain_sync",
      source: "brain",
    })
    .returning({ id: people.id });

  // Create org affiliation if we know the org
  if (data.organization && created) {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(ilike(organizations.name, data.organization))
      .limit(1);

    if (org) {
      await db
        .insert(personOrgAffiliations)
        .values({
          personId: created.id,
          organizationId: org.id,
          title: data.title,
          isPrimaryOrg: true,
        })
        .onConflictDoNothing();
    }
  }

  await logSync("brain", file.path, "created_person", "people", created.id, true);
  detail.action = "created";
  detail.targetId = created.id;
  return detail;
}

// ── Memo Sync ─────────────────────────────────────────────────────────────

async function syncMemo(file: BrainFileDescriptor): Promise<SyncDetail> {
  const data = extractFromMemo(file);
  const detail: SyncDetail = { path: file.path, type: "memo", action: "skipped" };

  // Check if opportunity already linked
  const [existing] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.brainNotePath, file.path))
    .limit(1);

  if (existing) {
    await db
      .update(opportunities)
      .set({
        stage: data.stage ?? undefined,
        entityCode: data.entityCode ?? undefined,
        description: data.summary ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(opportunities.id, existing.id));

    await logSync("brain", file.path, "updated_opportunity", "opportunities", existing.id, true);
    detail.action = "updated";
    detail.targetId = existing.id;
    return detail;
  }

  // No company name → skip (can't create meaningful opportunity)
  if (!data.company) {
    detail.action = "skipped";
    return detail;
  }

  // Try to find matching org
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(ilike(organizations.name, data.company))
    .limit(1);

  // Queue for approval — deals are high-stakes, shouldn't auto-create
  await db.insert(syncQueue).values({
    source: "brain",
    sourceId: file.path,
    eventType: "new_opportunity",
    payload: {
      ...data,
      organizationId: org?.id ?? null,
      organizationName: data.company,
    },
    status: "pending",
    entityTags: data.entityCode ? [data.entityCode] : [],
  });

  await logSync("brain", file.path, "queued_opportunity", "sync_queue", undefined, false);
  detail.action = "queued";
  return detail;
}

// ── Meeting Sync ──────────────────────────────────────────────────────────

async function syncMeeting(file: BrainFileDescriptor): Promise<SyncDetail> {
  const data = extractFromMeeting(file);
  const detail: SyncDetail = { path: file.path, type: "meeting", action: "skipped" };

  // Check if interaction already linked
  const [existing] = await db
    .select({ id: interactions.id })
    .from(interactions)
    .where(eq(interactions.brainNotePath, file.path))
    .limit(1);

  if (existing) {
    await db
      .update(interactions)
      .set({
        summary: data.summary ?? undefined,
        entityCode: data.entityCode ?? undefined,
      })
      .where(eq(interactions.id, existing.id));

    await logSync("brain", file.path, "updated_interaction", "interactions", existing.id, true);
    detail.action = "updated";
    detail.targetId = existing.id;
    return detail;
  }

  // Auto-create meeting interactions (low-risk)
  const [created] = await db
    .insert(interactions)
    .values({
      interactionType: "meeting",
      source: "brain_sync",
      teamMember: "jerry",
      summary: data.summary ?? data.title,
      interactionDate: data.date ? new Date(data.date) : new Date(),
      entityCode: data.entityCode,
      entityTags: data.entityCode ? [data.entityCode] : [],
      brainNotePath: file.path,
      createdBy: "brain_sync",
    })
    .returning({ id: interactions.id });

  // Try to match attendees to existing people
  if (created && data.attendeeNames.length > 0) {
    for (const name of data.attendeeNames.slice(0, 10)) {
      const [person] = await db
        .select({ id: people.id })
        .from(people)
        .where(ilike(people.fullName, `%${name}%`))
        .limit(1);

      if (person) {
        // Link first matched person as the primary person on this interaction
        await db
          .update(interactions)
          .set({ personId: person.id })
          .where(eq(interactions.id, created.id));
        break;
      }
    }
  }

  await logSync("brain", file.path, "created_interaction", "interactions", created.id, true);
  detail.action = "created";
  detail.targetId = created.id;
  return detail;
}

// ── Research Sync ─────────────────────────────────────────────────────────

async function syncResearch(file: BrainFileDescriptor): Promise<SyncDetail> {
  const data = extractFromResearch(file);
  const detail: SyncDetail = { path: file.path, type: "research", action: "skipped" };

  // Check if note already linked
  const [existing] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(eq(notes.brainNotePath, file.path))
    .limit(1);

  if (existing) {
    await db
      .update(notes)
      .set({
        title: data.title,
        content: data.content.slice(0, 10000),
        entityTags: data.entityTags,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, existing.id));

    await logSync("brain", file.path, "updated_note", "notes", existing.id, true);
    detail.action = "updated";
    detail.targetId = existing.id;
    return detail;
  }

  // Auto-create research notes (low-risk)
  const [created] = await db
    .insert(notes)
    .values({
      noteType: "research",
      title: data.title,
      content: data.content.slice(0, 10000),
      brainNotePath: file.path,
      entityTags: data.entityTags,
      tags: data.tags,
      author: "brain_sync",
    })
    .returning({ id: notes.id });

  await logSync("brain", file.path, "created_note", "notes", created.id, true);
  detail.action = "created";
  detail.targetId = created.id;
  return detail;
}

// ── Sync Log Helper ───────────────────────────────────────────────────────

async function logSync(
  source: string,
  sourceId: string,
  action: string,
  targetTable: string,
  targetId: string | undefined,
  autoApproved: boolean
) {
  await db.insert(syncLog).values({
    source,
    sourceId,
    action,
    targetTable,
    targetId,
    autoApproved,
    confidence: "1.00",
  });
}
