import { db } from "@/db";
import {
  roadshowTrips,
  roadshowLegs,
  roadshowMeetings,
  lpOrganizations,
  interactions,
} from "@/db/schema";
import { eq, desc, count, max, and } from "drizzle-orm";

export type MeetingWithOrg = {
  id: string;
  tripId: string;
  legId: string | null;
  organizationId: string | null;
  title: string;
  meetingDate: string | null;
  meetingTime: string | null;
  durationMin: number | null;
  location: string | null;
  meetingType: string | null;
  status: string;
  language: string;
  attendees: any;
  prepNotes: string | null;
  strategicAsk: string | null;
  pitchAngle: string | null;
  introChain: string | null;
  outcome: string | null;
  actionItems: any;
  sortOrder: number | null;
  // Joined CRM data
  orgName: string | null;
  orgStage: string | null;
  orgType: string | null;
  orgTargetCommitment: string | null;
  orgRelationshipOwner: string | null;
};

export type TripWithLegsAndMeetings = {
  trip: typeof roadshowTrips.$inferSelect;
  legs: (typeof roadshowLegs.$inferSelect)[];
  meetings: MeetingWithOrg[];
};

/**
 * Get full trip with legs and meetings, with CRM org data joined.
 */
export async function getTripWithLegsAndMeetings(
  tripId: string
): Promise<TripWithLegsAndMeetings | null> {
  const [trip] = await db
    .select()
    .from(roadshowTrips)
    .where(eq(roadshowTrips.id, tripId))
    .limit(1);

  if (!trip) return null;

  const [legs, meetingsRaw] = await Promise.all([
    db
      .select()
      .from(roadshowLegs)
      .where(eq(roadshowLegs.tripId, tripId))
      .orderBy(roadshowLegs.sortOrder),
    db
      .select({
        meeting: roadshowMeetings,
        orgName: lpOrganizations.name,
        orgStage: lpOrganizations.pipelineStage,
        orgType: lpOrganizations.lpType,
        orgTargetCommitment: lpOrganizations.targetCommitment,
        orgRelationshipOwner: lpOrganizations.relationshipOwner,
      })
      .from(roadshowMeetings)
      .leftJoin(
        lpOrganizations,
        eq(roadshowMeetings.organizationId, lpOrganizations.id)
      )
      .where(eq(roadshowMeetings.tripId, tripId))
      .orderBy(roadshowMeetings.meetingDate, roadshowMeetings.sortOrder),
  ]);

  const meetings: MeetingWithOrg[] = meetingsRaw.map((r) => ({
    id: r.meeting.id,
    tripId: r.meeting.tripId,
    legId: r.meeting.legId,
    organizationId: r.meeting.organizationId,
    title: r.meeting.title,
    meetingDate: r.meeting.meetingDate,
    meetingTime: r.meeting.meetingTime,
    durationMin: r.meeting.durationMin,
    location: r.meeting.location,
    meetingType: r.meeting.meetingType,
    status: r.meeting.status,
    language: r.meeting.language,
    attendees: r.meeting.attendees,
    prepNotes: r.meeting.prepNotes,
    strategicAsk: r.meeting.strategicAsk,
    pitchAngle: r.meeting.pitchAngle,
    introChain: r.meeting.introChain,
    outcome: r.meeting.outcome,
    actionItems: r.meeting.actionItems,
    sortOrder: r.meeting.sortOrder,
    orgName: r.orgName,
    orgStage: r.orgStage,
    orgType: r.orgType,
    orgTargetCommitment: r.orgTargetCommitment,
    orgRelationshipOwner: r.orgRelationshipOwner,
  }));

  return { trip, legs, meetings };
}

/**
 * Get single meeting detail with full CRM context.
 */
export async function getMeetingDetail(meetingId: string) {
  const [row] = await db
    .select({
      meeting: roadshowMeetings,
      orgName: lpOrganizations.name,
      orgStage: lpOrganizations.pipelineStage,
      orgType: lpOrganizations.lpType,
      orgTargetCommitment: lpOrganizations.targetCommitment,
      orgRelationshipOwner: lpOrganizations.relationshipOwner,
      orgHeadquarters: lpOrganizations.headquarters,
      orgNotes: lpOrganizations.notes,
      orgTags: lpOrganizations.tags,
    })
    .from(roadshowMeetings)
    .leftJoin(
      lpOrganizations,
      eq(roadshowMeetings.organizationId, lpOrganizations.id)
    )
    .where(eq(roadshowMeetings.id, meetingId))
    .limit(1);

  if (!row) return null;

  // If linked to an org, get interaction history
  let orgInteractions: any[] = [];
  if (row.meeting.organizationId) {
    orgInteractions = await db
      .select()
      .from(interactions)
      .where(eq(interactions.organizationId, row.meeting.organizationId))
      .orderBy(desc(interactions.interactionDate))
      .limit(20);
  }

  return {
    ...row.meeting,
    orgName: row.orgName,
    orgStage: row.orgStage,
    orgType: row.orgType,
    orgTargetCommitment: row.orgTargetCommitment,
    orgRelationshipOwner: row.orgRelationshipOwner,
    orgHeadquarters: row.orgHeadquarters,
    orgNotes: row.orgNotes,
    orgTags: row.orgTags,
    orgInteractions,
  };
}

/**
 * Get all action items across meetings for a trip.
 */
export async function getTripActionItems(tripId: string) {
  const meetings = await db
    .select({
      id: roadshowMeetings.id,
      title: roadshowMeetings.title,
      meetingDate: roadshowMeetings.meetingDate,
      actionItems: roadshowMeetings.actionItems,
    })
    .from(roadshowMeetings)
    .where(eq(roadshowMeetings.tripId, tripId))
    .orderBy(roadshowMeetings.meetingDate);

  return meetings
    .filter((m) => m.actionItems && Array.isArray(m.actionItems))
    .map((m) => ({
      meetingId: m.id,
      meetingTitle: m.title,
      meetingDate: m.meetingDate,
      items: m.actionItems as Array<{
        task: string;
        owner: string;
        due?: string;
        done: boolean;
      }>,
    }));
}

/**
 * Get the first (or only) trip.
 */
export async function getDefaultTrip() {
  const [trip] = await db
    .select()
    .from(roadshowTrips)
    .orderBy(desc(roadshowTrips.createdAt))
    .limit(1);
  return trip ?? null;
}
