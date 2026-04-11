import { db } from "@/db";
import {
  reconProjects,
  reconSections,
  reconAttachments,
  fieldTripMeetings,
  organizations,
  opportunities,
  people,
  personOrgAffiliations,
  interactions,
} from "@/db/schema";
import { eq, desc, asc, and, sql, count, max } from "drizzle-orm";

// ─── Types ───

export type ReconProject = typeof reconProjects.$inferSelect;
export type ReconSection = typeof reconSections.$inferSelect;
export type ReconAttachment = typeof reconAttachments.$inferSelect;

export type ReconData = {
  project: ReconProject;
  meeting: (typeof fieldTripMeetings.$inferSelect) | null;
  sections: ReconSection[];
  attachments: ReconAttachment[];
  context: ReconContext;
};

export type ReconContext = {
  org: (typeof organizations.$inferSelect) | null;
  opportunity: (typeof opportunities.$inferSelect) | null;
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

export type ReconProjectListItem = {
  id: string;
  name: string;
  objective: string | null;
  projectType: string;
  entityCode: string | null;
  status: string;
  meetingId: string | null;
  meetingDate: string | null;
  meetingTime: string | null;
  orgName: string | null;
  orgNameZh: string | null;
  sectionCount: number;
  attachmentCount: number;
  lastActivity: Date | null;
  createdAt: Date;
};

// ─── Queries ───

/**
 * Get a full recon project: project, optional meeting, sections, attachments, CRM context.
 */
export async function getRecon(projectId: string): Promise<ReconData | null> {
  const [project] = await db
    .select()
    .from(reconProjects)
    .where(eq(reconProjects.id, projectId))
    .limit(1);

  if (!project) return null;

  // Load meeting if linked
  let meeting: (typeof fieldTripMeetings.$inferSelect) | null = null;
  if (project.meetingId) {
    const [m] = await db
      .select()
      .from(fieldTripMeetings)
      .where(eq(fieldTripMeetings.id, project.meetingId))
      .limit(1);
    meeting = m ?? null;
  }

  const [sections, attachments] = await Promise.all([
    db
      .select()
      .from(reconSections)
      .where(eq(reconSections.projectId, projectId))
      .orderBy(asc(reconSections.sortOrder), asc(reconSections.createdAt)),
    db
      .select()
      .from(reconAttachments)
      .where(eq(reconAttachments.projectId, projectId))
      .orderBy(desc(reconAttachments.createdAt)),
  ]);

  const context = await getReconContext(project);

  return { project, meeting, sections, attachments, context };
}

/**
 * Gather CRM context for AI: org profile, people, interactions, opportunity.
 */
async function getReconContext(
  project: ReconProject
): Promise<ReconContext> {
  let org: ReconContext["org"] = null;
  let opportunity: ReconContext["opportunity"] = null;
  let orgPeople: ReconContext["people"] = [];
  let orgInteractions: ReconContext["interactions"] = [];

  const orgId = project.organizationId;
  if (orgId) {
    const [orgRow] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
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
        .where(eq(personOrgAffiliations.organizationId, orgId))
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
        .where(eq(interactions.orgId, orgId))
        .orderBy(desc(interactions.interactionDate))
        .limit(20),
    ]);

    orgPeople = pRows;
    orgInteractions = iRows;
  }

  const oppId = project.opportunityId;
  if (oppId) {
    const [oppRow] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, oppId))
      .limit(1);
    opportunity = oppRow ?? null;
  }

  return { org, opportunity, people: orgPeople, interactions: orgInteractions };
}

/**
 * Create a new recon project.
 */
export async function createReconProject(data: {
  name: string;
  objective?: string;
  projectType?: string;
  entityCode?: string;
  meetingId?: string;
  organizationId?: string;
  opportunityId?: string;
}): Promise<ReconProject> {
  const [created] = await db
    .insert(reconProjects)
    .values({
      name: data.name,
      objective: data.objective,
      projectType: data.projectType ?? "custom",
      entityCode: data.entityCode,
      meetingId: data.meetingId,
      organizationId: data.organizationId,
      opportunityId: data.opportunityId,
    })
    .returning();
  return created;
}

/**
 * Find a recon project by its linked meeting.
 */
export async function findReconByMeeting(
  meetingId: string
): Promise<ReconProject | null> {
  const [project] = await db
    .select()
    .from(reconProjects)
    .where(eq(reconProjects.meetingId, meetingId))
    .limit(1);
  return project ?? null;
}

/**
 * Upsert a recon section — update if id provided, create if not.
 */
export async function upsertSection(
  projectId: string,
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
): Promise<ReconSection> {
  if (data.id) {
    const [updated] = await db
      .update(reconSections)
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
          eq(reconSections.id, data.id),
          eq(reconSections.projectId, projectId)
        )
      )
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(reconSections)
    .values({
      projectId,
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
 * Delete a recon section.
 */
export async function deleteSection(projectId: string, sectionId: string) {
  await db
    .delete(reconSections)
    .where(
      and(
        eq(reconSections.id, sectionId),
        eq(reconSections.projectId, projectId)
      )
    );
}

/**
 * Create an attachment record.
 */
export async function createAttachment(
  projectId: string,
  data: {
    filename: string;
    blobUrl: string;
    contentType: string;
    sizeBytes?: number;
    description?: string;
    extractedText?: string;
  }
): Promise<ReconAttachment> {
  const [created] = await db
    .insert(reconAttachments)
    .values({ projectId, ...data })
    .returning();
  return created;
}

/**
 * Delete an attachment record.
 */
export async function deleteAttachment(
  projectId: string,
  attachmentId: string
) {
  const [deleted] = await db
    .delete(reconAttachments)
    .where(
      and(
        eq(reconAttachments.id, attachmentId),
        eq(reconAttachments.projectId, projectId)
      )
    )
    .returning();
  return deleted;
}

// ─── List All Recon Projects ───

/**
 * List all recon projects with section/attachment counts.
 */
export async function listReconProjects(): Promise<ReconProjectListItem[]> {
  const sectionStats = db
    .select({
      projectId: reconSections.projectId,
      sectionCount: count(reconSections.id).as("section_count"),
      lastUpdated: max(reconSections.updatedAt).as("last_updated"),
    })
    .from(reconSections)
    .groupBy(reconSections.projectId)
    .as("section_stats");

  const attachStats = db
    .select({
      projectId: reconAttachments.projectId,
      attachmentCount: count(reconAttachments.id).as("attachment_count"),
    })
    .from(reconAttachments)
    .groupBy(reconAttachments.projectId)
    .as("attach_stats");

  const rows = await db
    .select({
      id: reconProjects.id,
      name: reconProjects.name,
      objective: reconProjects.objective,
      projectType: reconProjects.projectType,
      entityCode: reconProjects.entityCode,
      status: reconProjects.status,
      meetingId: reconProjects.meetingId,
      meetingDate: fieldTripMeetings.meetingDate,
      meetingTime: fieldTripMeetings.meetingTime,
      orgName: organizations.name,
      orgNameZh: organizations.nameZh,
      sectionCount: sql<number>`coalesce(${sectionStats.sectionCount}, 0)`,
      attachmentCount: sql<number>`coalesce(${attachStats.attachmentCount}, 0)`,
      lastActivity: sectionStats.lastUpdated,
      createdAt: reconProjects.createdAt,
    })
    .from(reconProjects)
    .leftJoin(sectionStats, eq(sectionStats.projectId, reconProjects.id))
    .leftJoin(attachStats, eq(attachStats.projectId, reconProjects.id))
    .leftJoin(
      fieldTripMeetings,
      eq(fieldTripMeetings.id, reconProjects.meetingId)
    )
    .leftJoin(
      organizations,
      eq(organizations.id, reconProjects.organizationId)
    )
    .where(eq(reconProjects.status, "active"))
    .orderBy(desc(reconProjects.updatedAt));

  return rows.map((r) => ({
    ...r,
    sectionCount: Number(r.sectionCount),
    attachmentCount: Number(r.attachmentCount),
  }));
}
