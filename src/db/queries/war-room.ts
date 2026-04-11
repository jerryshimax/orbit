import { db } from "@/db";
import {
  warRoomSections,
  warRoomAttachments,
  fieldTripMeetings,
  organizations,
  opportunities,
  people,
  personOrgAffiliations,
  interactions,
} from "@/db/schema";
import { eq, desc, asc, and, sql, count, max } from "drizzle-orm";

// ─── Types ───

export type WarRoomSection = typeof warRoomSections.$inferSelect;
export type WarRoomAttachment = typeof warRoomAttachments.$inferSelect;

export type WarRoomData = {
  meeting: typeof fieldTripMeetings.$inferSelect;
  sections: WarRoomSection[];
  attachments: WarRoomAttachment[];
  context: WarRoomContext;
};

export type WarRoomContext = {
  org: typeof organizations.$inferSelect | null;
  opportunity: typeof opportunities.$inferSelect | null;
  people: Array<{
    person: typeof people.$inferSelect;
    title: string | null;
    isPrimary: boolean | null;
  }>;
  interactions: Array<{
    id: string;
    interactionType: string;
    summary: string;
    interactionDate: Date;
    teamMember: string;
    location: string | null;
  }>;
};

// ─── Queries ───

/**
 * Get the full war room: meeting, sections, attachments, and CRM context.
 */
export async function getWarRoom(
  meetingId: string
): Promise<WarRoomData | null> {
  const [meeting] = await db
    .select()
    .from(fieldTripMeetings)
    .where(eq(fieldTripMeetings.id, meetingId))
    .limit(1);

  if (!meeting) return null;

  const [sections, attachments] = await Promise.all([
    db
      .select()
      .from(warRoomSections)
      .where(eq(warRoomSections.meetingId, meetingId))
      .orderBy(asc(warRoomSections.sortOrder), asc(warRoomSections.createdAt)),
    db
      .select()
      .from(warRoomAttachments)
      .where(eq(warRoomAttachments.meetingId, meetingId))
      .orderBy(desc(warRoomAttachments.createdAt)),
  ]);

  const context = await getWarRoomContext(meeting);

  return { meeting, sections, attachments, context };
}

/**
 * Gather CRM context for AI: org profile, people, interactions, opportunity.
 */
async function getWarRoomContext(
  meeting: typeof fieldTripMeetings.$inferSelect
): Promise<WarRoomContext> {
  let org: typeof organizations.$inferSelect | null = null;
  let opportunity: typeof opportunities.$inferSelect | null = null;
  let orgPeople: WarRoomContext["people"] = [];
  let orgInteractions: WarRoomContext["interactions"] = [];

  if (meeting.organizationId) {
    const [orgRow] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, meeting.organizationId))
      .limit(1);
    org = orgRow ?? null;

    const [pRows, iRows] = await Promise.all([
      db
        .select({
          person: people,
          title: personOrgAffiliations.title,
          isPrimary: personOrgAffiliations.isPrimaryContact,
        })
        .from(personOrgAffiliations)
        .innerJoin(people, eq(personOrgAffiliations.personId, people.id))
        .where(
          eq(personOrgAffiliations.organizationId, meeting.organizationId)
        )
        .orderBy(desc(personOrgAffiliations.isPrimaryContact)),
      db
        .select({
          id: interactions.id,
          interactionType: interactions.interactionType,
          summary: interactions.summary,
          interactionDate: interactions.interactionDate,
          teamMember: interactions.teamMember,
          location: interactions.location,
        })
        .from(interactions)
        .where(eq(interactions.orgId, meeting.organizationId))
        .orderBy(desc(interactions.interactionDate))
        .limit(20),
    ]);

    orgPeople = pRows;
    orgInteractions = iRows;
  }

  if (meeting.opportunityId) {
    const [oppRow] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, meeting.opportunityId))
      .limit(1);
    opportunity = oppRow ?? null;
  }

  return { org, opportunity, people: orgPeople, interactions: orgInteractions };
}

/**
 * Upsert a war room section — update if id provided, create if not.
 */
export async function upsertSection(
  meetingId: string,
  data: {
    id?: string;
    sectionType: string;
    title?: string;
    content: string;
    sortOrder?: number;
    aiGenerated?: boolean;
    aiPrompt?: string;
    metadata?: any;
  }
): Promise<WarRoomSection> {
  if (data.id) {
    const [updated] = await db
      .update(warRoomSections)
      .set({
        title: data.title,
        content: data.content,
        sortOrder: data.sortOrder,
        aiGenerated: data.aiGenerated,
        aiPrompt: data.aiPrompt,
        metadata: data.metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(warRoomSections.id, data.id),
          eq(warRoomSections.meetingId, meetingId)
        )
      )
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(warRoomSections)
    .values({
      meetingId,
      sectionType: data.sectionType,
      title: data.title,
      content: data.content,
      sortOrder: data.sortOrder ?? 0,
      aiGenerated: data.aiGenerated ?? false,
      aiPrompt: data.aiPrompt,
      metadata: data.metadata,
    })
    .returning();
  return created;
}

/**
 * Delete a war room section.
 */
export async function deleteSection(meetingId: string, sectionId: string) {
  await db
    .delete(warRoomSections)
    .where(
      and(
        eq(warRoomSections.id, sectionId),
        eq(warRoomSections.meetingId, meetingId)
      )
    );
}

/**
 * Create an attachment record.
 */
export async function createAttachment(
  meetingId: string,
  data: {
    filename: string;
    blobUrl: string;
    contentType: string;
    sizeBytes?: number;
    description?: string;
    extractedText?: string;
  }
): Promise<WarRoomAttachment> {
  const [created] = await db
    .insert(warRoomAttachments)
    .values({ meetingId, ...data })
    .returning();
  return created;
}

/**
 * Delete an attachment record.
 */
export async function deleteAttachment(
  meetingId: string,
  attachmentId: string
) {
  const [deleted] = await db
    .delete(warRoomAttachments)
    .where(
      and(
        eq(warRoomAttachments.id, attachmentId),
        eq(warRoomAttachments.meetingId, meetingId)
      )
    )
    .returning();
  return deleted;
}

// ─── List All War Rooms ───

export type WarRoomListItem = {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
  meetingStatus: string;
  orgName: string | null;
  orgNameZh: string | null;
  sectionCount: number;
  attachmentCount: number;
  lastActivity: Date | null;
};

/**
 * List all meetings that have war room content (sections or attachments).
 */
export async function listWarRooms(): Promise<WarRoomListItem[]> {
  // Subquery: section counts + latest update per meeting
  const sectionStats = db
    .select({
      meetingId: warRoomSections.meetingId,
      sectionCount: count(warRoomSections.id).as("section_count"),
      lastUpdated: max(warRoomSections.updatedAt).as("last_updated"),
    })
    .from(warRoomSections)
    .groupBy(warRoomSections.meetingId)
    .as("section_stats");

  // Subquery: attachment counts per meeting
  const attachStats = db
    .select({
      meetingId: warRoomAttachments.meetingId,
      attachmentCount: count(warRoomAttachments.id).as("attachment_count"),
    })
    .from(warRoomAttachments)
    .groupBy(warRoomAttachments.meetingId)
    .as("attach_stats");

  const rows = await db
    .select({
      meetingId: fieldTripMeetings.id,
      meetingTitle: fieldTripMeetings.title,
      meetingDate: fieldTripMeetings.meetingDate,
      meetingTime: fieldTripMeetings.meetingTime,
      meetingLocation: fieldTripMeetings.location,
      meetingStatus: fieldTripMeetings.status,
      orgName: organizations.name,
      orgNameZh: organizations.nameZh,
      sectionCount: sql<number>`coalesce(${sectionStats.sectionCount}, 0)`,
      attachmentCount: sql<number>`coalesce(${attachStats.attachmentCount}, 0)`,
      lastActivity: sectionStats.lastUpdated,
    })
    .from(fieldTripMeetings)
    .innerJoin(sectionStats, eq(sectionStats.meetingId, fieldTripMeetings.id))
    .leftJoin(attachStats, eq(attachStats.meetingId, fieldTripMeetings.id))
    .leftJoin(organizations, eq(organizations.id, fieldTripMeetings.organizationId))
    .orderBy(desc(fieldTripMeetings.meetingDate));

  return rows.map((r) => ({
    ...r,
    sectionCount: Number(r.sectionCount),
    attachmentCount: Number(r.attachmentCount),
  }));
}
