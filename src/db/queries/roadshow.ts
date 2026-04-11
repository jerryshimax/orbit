import { db } from "@/db";
import {
  fieldTrips,
  fieldTripLegs,
  fieldTripMeetings,
  organizations,
  opportunities,
  interactions,
  meetingAttendees,
} from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export type MeetingWithOrg = {
  id: string;
  tripId: string;
  legId: string | null;
  organizationId: string | null;
  opportunityId: string | null;
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
  // Joined org data
  orgName: string | null;
  orgNameZh: string | null;
  orgType: string | null;
  orgHeadquarters: string | null;
  orgRelationshipOwner: string | null;
  // Joined opportunity data
  oppStage: string | null;
  oppCommitment: string | null;
  oppDealSize: string | null;
  timezone?: string | null;
};

export type TripWithLegsAndMeetings = {
  trip: typeof fieldTrips.$inferSelect;
  legs: (typeof fieldTripLegs.$inferSelect)[];
  meetings: MeetingWithOrg[];
};

/**
 * Get full trip with legs and meetings, with universal CRM data joined.
 */
export async function getTripWithLegsAndMeetings(
  tripId: string
): Promise<TripWithLegsAndMeetings | null> {
  const [trip] = await db
    .select()
    .from(fieldTrips)
    .where(eq(fieldTrips.id, tripId))
    .limit(1);

  if (!trip) return null;

  const [legs, meetingsRaw] = await Promise.all([
    db
      .select()
      .from(fieldTripLegs)
      .where(eq(fieldTripLegs.tripId, tripId))
      .orderBy(fieldTripLegs.sortOrder),
    db
      .select({
        meeting: fieldTripMeetings,
        orgName: organizations.name,
        orgNameZh: organizations.nameZh,
        orgType: organizations.orgType,
        orgHeadquarters: organizations.headquarters,
        orgRelationshipOwner: organizations.relationshipOwner,
        oppStage: opportunities.stage,
        oppCommitment: opportunities.commitment,
        oppDealSize: opportunities.dealSize,
      })
      .from(fieldTripMeetings)
      .leftJoin(
        organizations,
        eq(fieldTripMeetings.organizationId, organizations.id)
      )
      .leftJoin(
        opportunities,
        eq(fieldTripMeetings.opportunityId, opportunities.id)
      )
      .where(eq(fieldTripMeetings.tripId, tripId))
      .orderBy(fieldTripMeetings.meetingDate, fieldTripMeetings.sortOrder),
  ]);

  const meetings: MeetingWithOrg[] = meetingsRaw.map((r) => ({
    id: r.meeting.id,
    tripId: r.meeting.tripId,
    legId: r.meeting.legId,
    organizationId: r.meeting.organizationId,
    opportunityId: r.meeting.opportunityId,
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
    orgNameZh: r.orgNameZh,
    orgType: r.orgType,
    orgHeadquarters: r.orgHeadquarters,
    orgRelationshipOwner: r.orgRelationshipOwner,
    oppStage: r.oppStage,
    oppCommitment: r.oppCommitment,
    oppDealSize: r.oppDealSize,
  }));

  return { trip, legs, meetings };
}

/**
 * Get single meeting detail with full CRM context.
 */
export async function getMeetingDetail(meetingId: string) {
  const [row] = await db
    .select({
      meeting: fieldTripMeetings,
      orgName: organizations.name,
      orgNameZh: organizations.nameZh,
      orgType: organizations.orgType,
      orgHeadquarters: organizations.headquarters,
      orgRelationshipOwner: organizations.relationshipOwner,
      orgNotes: organizations.notes,
      orgTags: organizations.tags,
      oppStage: opportunities.stage,
      oppCommitment: opportunities.commitment,
      oppDealSize: opportunities.dealSize,
    })
    .from(fieldTripMeetings)
    .leftJoin(
      organizations,
      eq(fieldTripMeetings.organizationId, organizations.id)
    )
    .leftJoin(
      opportunities,
      eq(fieldTripMeetings.opportunityId, opportunities.id)
    )
    .where(eq(fieldTripMeetings.id, meetingId))
    .limit(1);

  if (!row) return null;

  // If linked to an org, get interaction history
  let orgInteractions: any[] = [];
  if (row.meeting.organizationId) {
    orgInteractions = await db
      .select()
      .from(interactions)
      .where(eq(interactions.orgId, row.meeting.organizationId))
      .orderBy(desc(interactions.interactionDate))
      .limit(20);
  }

  return {
    ...row.meeting,
    orgName: row.orgName,
    orgNameZh: row.orgNameZh,
    orgType: row.orgType,
    orgHeadquarters: row.orgHeadquarters,
    orgRelationshipOwner: row.orgRelationshipOwner,
    orgNotes: row.orgNotes,
    orgTags: row.orgTags,
    oppStage: row.oppStage,
    oppCommitment: row.oppCommitment,
    oppDealSize: row.oppDealSize,
    orgInteractions,
  };
}

/**
 * Get all action items across meetings for a trip.
 */
export async function getTripActionItems(tripId: string) {
  const meetings = await db
    .select({
      id: fieldTripMeetings.id,
      title: fieldTripMeetings.title,
      meetingDate: fieldTripMeetings.meetingDate,
      actionItems: fieldTripMeetings.actionItems,
    })
    .from(fieldTripMeetings)
    .where(eq(fieldTripMeetings.tripId, tripId))
    .orderBy(fieldTripMeetings.meetingDate);

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
 * Get meetings for a specific user (via meeting_attendees join table).
 * If userId is null or user is owner, returns all meetings for the trip.
 */
export async function getMyMeetings(
  tripId: string,
  userId: string | null,
  isOwner: boolean = false
): Promise<MeetingWithOrg[]> {
  const trip = await getTripWithLegsAndMeetings(tripId);
  if (!trip) return [];

  // Owner sees everything
  if (isOwner || !userId) return trip.meetings;

  // Get meeting IDs where this user is an attendee
  const attendeeRows = await db
    .select({ meetingId: meetingAttendees.meetingId })
    .from(meetingAttendees)
    .where(eq(meetingAttendees.userId, userId));

  const myMeetingIds = new Set(attendeeRows.map((r) => r.meetingId));

  return trip.meetings.filter((m) => myMeetingIds.has(m.id));
}

/**
 * Get the default (most recent) trip.
 */
export async function getDefaultTrip() {
  const [trip] = await db
    .select()
    .from(fieldTrips)
    .orderBy(desc(fieldTrips.createdAt))
    .limit(1);
  return trip ?? null;
}
