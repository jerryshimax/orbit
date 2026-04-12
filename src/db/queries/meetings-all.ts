/**
 * Unified meetings view — unions roadshow-scheduled meetings (fieldTripMeetings)
 * with Brain-ingested interactions of type "meeting".
 *
 * Used by /meetings page to surface everything Jerry has on the books,
 * regardless of source, with an "All / Roadshow / Brain" filter.
 */

import { db } from "@/db";
import {
  fieldTripMeetings,
  interactions,
  organizations,
  opportunities,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type UnifiedMeeting = {
  id: string;
  source: "roadshow" | "brain";
  title: string;
  meetingDate: string | null;
  meetingTime: string | null;
  location: string | null;
  status: string;
  language: string | null;
  attendees: unknown;
  strategicAsk: string | null;
  oppStage: string | null;
  orgName: string | null;
  orgId: string | null;
  legId: string | null;
  tripId: string | null;
  entityCode: string | null;
  href: string;
};

export type UnifiedMeetingFilter = "all" | "roadshow" | "brain";

/**
 * Build unified meeting rows. Pure function — takes already-fetched rows so
 * it can be unit-tested without a live DB.
 */
export function mergeUnifiedMeetings(
  roadshowRows: {
    id: string;
    tripId: string | null;
    legId: string | null;
    organizationId: string | null;
    title: string;
    meetingDate: string | null;
    meetingTime: string | null;
    location: string | null;
    status: string;
    language: string | null;
    attendees: unknown;
    strategicAsk: string | null;
    orgName: string | null;
    oppStage: string | null;
  }[],
  brainRows: {
    id: string;
    orgId: string | null;
    orgName: string | null;
    summary: string;
    interactionDate: Date | string;
    location: string | null;
    entityCode: string | null;
  }[]
): UnifiedMeeting[] {
  const out: UnifiedMeeting[] = [];

  for (const r of roadshowRows) {
    out.push({
      id: r.id,
      source: "roadshow",
      title: r.title,
      meetingDate: r.meetingDate,
      meetingTime: r.meetingTime,
      location: r.location,
      status: r.status,
      language: r.language,
      attendees: r.attendees,
      strategicAsk: r.strategicAsk,
      oppStage: r.oppStage,
      orgName: r.orgName,
      orgId: r.organizationId,
      legId: r.legId,
      tripId: r.tripId,
      entityCode: null,
      href: `/meetings/${r.id}`,
    });
  }

  for (const r of brainRows) {
    const d = r.interactionDate instanceof Date
      ? r.interactionDate
      : new Date(r.interactionDate);
    const iso = Number.isFinite(d.getTime()) ? d.toISOString() : null;
    out.push({
      id: r.id,
      source: "brain",
      title: r.summary.split("\n")[0].slice(0, 120) || "Brain meeting",
      meetingDate: iso ? iso.slice(0, 10) : null,
      meetingTime: iso ? iso.slice(11, 16) : null,
      location: r.location,
      status: "completed",
      language: null,
      attendees: [],
      strategicAsk: null,
      oppStage: null,
      orgName: r.orgName,
      orgId: r.orgId,
      legId: null,
      tripId: null,
      entityCode: r.entityCode,
      href: `/interactions/${r.id}`,
    });
  }

  // Sort by date desc, nulls last
  out.sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return 0;
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    return a.meetingDate < b.meetingDate ? 1 : a.meetingDate > b.meetingDate ? -1 : 0;
  });

  return out;
}

export async function getAllMeetings(options?: {
  entityCode?: string;
  source?: UnifiedMeetingFilter;
}): Promise<UnifiedMeeting[]> {
  const source = options?.source ?? "all";

  const fetchRoadshow = source === "all" || source === "roadshow";
  const fetchBrain = source === "all" || source === "brain";

  const [roadshowRows, brainRows] = await Promise.all([
    fetchRoadshow
      ? db
          .select({
            id: fieldTripMeetings.id,
            tripId: fieldTripMeetings.tripId,
            legId: fieldTripMeetings.legId,
            organizationId: fieldTripMeetings.organizationId,
            title: fieldTripMeetings.title,
            meetingDate: fieldTripMeetings.meetingDate,
            meetingTime: fieldTripMeetings.meetingTime,
            location: fieldTripMeetings.location,
            status: fieldTripMeetings.status,
            language: fieldTripMeetings.language,
            attendees: fieldTripMeetings.attendees,
            strategicAsk: fieldTripMeetings.strategicAsk,
            orgName: organizations.name,
            oppStage: opportunities.stage,
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
          .orderBy(desc(fieldTripMeetings.meetingDate))
      : Promise.resolve([]),
    fetchBrain
      ? db
          .select({
            id: interactions.id,
            orgId: interactions.orgId,
            orgName: organizations.name,
            summary: interactions.summary,
            interactionDate: interactions.interactionDate,
            location: interactions.location,
            entityCode: interactions.entityCode,
          })
          .from(interactions)
          .leftJoin(organizations, eq(interactions.orgId, organizations.id))
          .where(
            and(
              eq(interactions.source, "brain_sync" as const),
              eq(interactions.interactionType, "meeting" as const),
              options?.entityCode
                ? eq(interactions.entityCode, options.entityCode)
                : undefined
            )
          )
          .orderBy(desc(interactions.interactionDate))
          .limit(500)
      : Promise.resolve([]),
  ]);

  return mergeUnifiedMeetings(roadshowRows, brainRows);
}
