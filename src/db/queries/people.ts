import { db } from "@/db";
import {
  people,
  personOrgAffiliations,
  organizations,
  contactChannels,
  interactions,
  opportunities,
  opportunityContacts,
  fieldTripMeetings,
  fieldTrips,
} from "@/db/schema";
import { eq, desc, ilike, and, count, max, inArray, sql } from "drizzle-orm";
import { type UserContext, visibilityFilter } from "@/lib/access";

export type PersonWithMeta = {
  id: string;
  fullName: string;
  fullNameZh: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  telegram: string | null;
  linkedin: string | null;
  relationshipStrength: string | null;
  relationshipScore: number | null;
  introducedByName: string | null;
  introChain: string | null;
  entityTags: string[];
  brainNotePath: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  // Primary affiliation
  primaryOrg: string | null;
  primaryOrgId: string | null;
  primaryOrgTitle: string | null;
  // Aggregates
  affiliationCount: number;
  interactionCount: number;
  lastInteractionDate: string | null;
  daysSinceInteraction: number | null;
};

export async function getPeople(filters?: {
  orgId?: string;
  query?: string;
  entityCode?: string;
  relationship?: string;
  userContext?: UserContext;
}): Promise<PersonWithMeta[]> {
  const conditions = [];
  if (filters?.userContext) {
    conditions.push(visibilityFilter(filters.userContext));
  }
  if (filters?.query) {
    conditions.push(ilike(people.fullName, `%${filters.query}%`));
  }
  if (filters?.relationship) {
    conditions.push(
      eq(people.relationshipStrength, filters.relationship as any)
    );
  }
  if (filters?.entityCode) {
    conditions.push(
      sql`${filters.entityCode} = ANY(${people.entityTags})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let allPeople = await db
    .select()
    .from(people)
    .where(whereClause)
    .orderBy(people.fullName);

  if (allPeople.length === 0) return [];

  // If filtering by orgId, narrow down
  if (filters?.orgId) {
    const orgAffils = await db
      .select({ personId: personOrgAffiliations.personId })
      .from(personOrgAffiliations)
      .where(eq(personOrgAffiliations.organizationId, filters.orgId));
    const personIds = new Set(orgAffils.map((a) => a.personId));
    allPeople = allPeople.filter((p) => personIds.has(p.id));
  }

  if (allPeople.length === 0) return [];

  const personIds = allPeople.map((p) => p.id);

  // Batch: affiliations with org names
  const allAffiliations = await db
    .select({
      personId: personOrgAffiliations.personId,
      orgId: personOrgAffiliations.organizationId,
      orgName: organizations.name,
      title: personOrgAffiliations.title,
      isPrimaryOrg: personOrgAffiliations.isPrimaryOrg,
    })
    .from(personOrgAffiliations)
    .innerJoin(
      organizations,
      eq(personOrgAffiliations.organizationId, organizations.id)
    )
    .where(inArray(personOrgAffiliations.personId, personIds));

  // Batch: interaction stats
  const interactionStats = await db
    .select({
      personId: interactions.personId,
      cnt: count(),
      lastDate: max(interactions.interactionDate),
    })
    .from(interactions)
    .where(inArray(interactions.personId, personIds))
    .groupBy(interactions.personId);

  // Build lookups
  const affilisByPerson: Record<string, typeof allAffiliations> = {};
  for (const a of allAffiliations) {
    if (!affilisByPerson[a.personId]) affilisByPerson[a.personId] = [];
    affilisByPerson[a.personId].push(a);
  }

  const interactionsByPerson = new Map(
    interactionStats.map((r) => [
      r.personId,
      { count: Number(r.cnt), lastDate: r.lastDate },
    ])
  );

  return allPeople.map((p) => {
    const affils = affilisByPerson[p.id] ?? [];
    const primaryAffil =
      affils.find((a) => a.isPrimaryOrg) ?? affils[0] ?? null;
    const iStats = interactionsByPerson.get(p.id);
    const lastDate = iStats?.lastDate
      ? new Date(iStats.lastDate).toISOString()
      : p.lastInteractionAt
        ? new Date(p.lastInteractionAt).toISOString()
        : null;
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: p.id,
      fullName: p.fullName,
      fullNameZh: p.fullNameZh,
      title: p.title,
      email: p.email,
      phone: p.phone,
      wechat: p.wechat,
      telegram: p.telegram,
      linkedin: p.linkedin,
      relationshipStrength: p.relationshipStrength,
      relationshipScore: p.relationshipScore,
      introducedByName: p.introducedByName,
      introChain: p.introChain,
      entityTags: p.entityTags,
      brainNotePath: p.brainNotePath,
      source: p.source ?? null,
      tags: p.tags,
      notes: p.notes,
      primaryOrg: primaryAffil?.orgName ?? null,
      primaryOrgId: primaryAffil?.orgId ?? null,
      primaryOrgTitle: primaryAffil?.title ?? null,
      affiliationCount: affils.length,
      interactionCount: iStats?.count ?? (p.interactionCount ?? 0),
      lastInteractionDate: lastDate,
      daysSinceInteraction: daysSince,
    };
  });
}

/**
 * Get full person detail with all affiliations, channels, and interactions.
 */
export async function getPersonDetail(id: string) {
  const [person] = await db
    .select()
    .from(people)
    .where(eq(people.id, id))
    .limit(1);

  if (!person) return null;

  const [affiliations, channels, personInteractions] = await Promise.all([
    db
      .select({
        affiliation: personOrgAffiliations,
        orgName: organizations.name,
        orgNameZh: organizations.nameZh,
        orgType: organizations.orgType,
        orgHeadquarters: organizations.headquarters,
      })
      .from(personOrgAffiliations)
      .innerJoin(
        organizations,
        eq(personOrgAffiliations.organizationId, organizations.id)
      )
      .where(eq(personOrgAffiliations.personId, id)),
    db
      .select()
      .from(contactChannels)
      .where(eq(contactChannels.personId, id)),
    db
      .select()
      .from(interactions)
      .where(eq(interactions.personId, id))
      .orderBy(desc(interactions.interactionDate))
      .limit(50),
  ]);

  return { person, affiliations, channels, interactions: personInteractions };
}

/**
 * Dossier view consumed by the roadshow Contact Dossier slide-up sheet.
 * Aggregates:
 *   - person + primary affiliation (name, title, org)
 *   - pipeline opportunities the person is linked to via opportunityContacts
 *     (plus any opportunities attached to affiliated orgs — covers the common
 *     case where the LP row isn't yet attached to an opp but their org is)
 *   - field-trip meetings the person has appeared on. Because
 *     field_trip_meetings.attendees is a freeform jsonb blob (no FK), we use
 *     org-affiliation as the honest proxy: meetings whose organizationId
 *     matches one of the person's affiliated orgs.
 *   - last 20 interactions (person-scoped, joined with org name).
 */
export type PersonDossier = {
  person: typeof people.$inferSelect;
  primaryOrg: { id: string; name: string; title: string | null } | null;
  opportunities: Array<{
    id: string;
    name: string;
    stage: string;
    status: string;
    entityCode: string;
    orgName: string | null;
    role: string | null;
  }>;
  tripAppearances: Array<{
    meetingId: string;
    tripId: string;
    tripName: string;
    meetingTitle: string;
    meetingDate: string | null;
    orgName: string | null;
  }>;
  interactions: Array<{
    id: string;
    interactionType: string;
    summary: string;
    interactionDate: string;
    orgName: string | null;
    source: string;
  }>;
};

export async function getPersonDossier(
  personId: string
): Promise<PersonDossier | null> {
  const [person] = await db
    .select()
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  if (!person) return null;

  const affiliationRows = await db
    .select({
      orgId: personOrgAffiliations.organizationId,
      orgName: organizations.name,
      title: personOrgAffiliations.title,
      isPrimaryOrg: personOrgAffiliations.isPrimaryOrg,
    })
    .from(personOrgAffiliations)
    .innerJoin(
      organizations,
      eq(personOrgAffiliations.organizationId, organizations.id)
    )
    .where(eq(personOrgAffiliations.personId, personId));

  const primaryAffil =
    affiliationRows.find((a) => a.isPrimaryOrg) ?? affiliationRows[0] ?? null;

  const orgIds = Array.from(new Set(affiliationRows.map((a) => a.orgId)));

  // Opportunities: direct via opportunityContacts + org-linked fallback.
  const [contactOppRows, orgOppRows] = await Promise.all([
    db
      .select({
        id: opportunities.id,
        name: opportunities.name,
        stage: opportunities.stage,
        status: opportunities.status,
        entityCode: opportunities.entityCode,
        orgName: organizations.name,
        role: opportunityContacts.role,
      })
      .from(opportunityContacts)
      .innerJoin(
        opportunities,
        eq(opportunityContacts.opportunityId, opportunities.id)
      )
      .leftJoin(
        organizations,
        eq(opportunities.organizationId, organizations.id)
      )
      .where(eq(opportunityContacts.personId, personId)),
    orgIds.length > 0
      ? db
          .select({
            id: opportunities.id,
            name: opportunities.name,
            stage: opportunities.stage,
            status: opportunities.status,
            entityCode: opportunities.entityCode,
            orgName: organizations.name,
            role: sql<string | null>`null`.as("role"),
          })
          .from(opportunities)
          .leftJoin(
            organizations,
            eq(opportunities.organizationId, organizations.id)
          )
          .where(inArray(opportunities.organizationId, orgIds))
      : Promise.resolve(
          [] as Array<{
            id: string;
            name: string;
            stage: string;
            status: string;
            entityCode: string;
            orgName: string | null;
            role: string | null;
          }>
        ),
  ]);

  const seenOpps = new Set<string>();
  const allOpps: PersonDossier["opportunities"] = [];
  for (const row of [...contactOppRows, ...orgOppRows]) {
    if (seenOpps.has(row.id)) continue;
    seenOpps.add(row.id);
    allOpps.push({
      id: row.id,
      name: row.name,
      stage: row.stage,
      status: row.status,
      entityCode: row.entityCode,
      orgName: row.orgName ?? null,
      role: row.role ?? null,
    });
  }

  // Trip appearances via org linkage (best available signal).
  const tripRows =
    orgIds.length > 0
      ? await db
          .select({
            meetingId: fieldTripMeetings.id,
            tripId: fieldTripMeetings.tripId,
            tripName: fieldTrips.name,
            meetingTitle: fieldTripMeetings.title,
            meetingDate: fieldTripMeetings.meetingDate,
            orgName: organizations.name,
          })
          .from(fieldTripMeetings)
          .innerJoin(fieldTrips, eq(fieldTripMeetings.tripId, fieldTrips.id))
          .leftJoin(
            organizations,
            eq(fieldTripMeetings.organizationId, organizations.id)
          )
          .where(inArray(fieldTripMeetings.organizationId, orgIds))
          .orderBy(desc(fieldTripMeetings.meetingDate))
          .limit(25)
      : [];

  // Last 20 interactions involving this person.
  const interactionRows = await db
    .select({
      id: interactions.id,
      interactionType: interactions.interactionType,
      summary: interactions.summary,
      interactionDate: interactions.interactionDate,
      source: interactions.source,
      orgName: organizations.name,
    })
    .from(interactions)
    .leftJoin(organizations, eq(interactions.orgId, organizations.id))
    .where(eq(interactions.personId, personId))
    .orderBy(desc(interactions.interactionDate))
    .limit(20);

  return {
    person,
    primaryOrg: primaryAffil
      ? {
          id: primaryAffil.orgId,
          name: primaryAffil.orgName,
          title: primaryAffil.title,
        }
      : null,
    opportunities: allOpps,
    tripAppearances: tripRows.map((r) => ({
      meetingId: r.meetingId,
      tripId: r.tripId,
      tripName: r.tripName,
      meetingTitle: r.meetingTitle,
      meetingDate: r.meetingDate,
      orgName: r.orgName,
    })),
    interactions: interactionRows.map((r) => ({
      id: r.id,
      interactionType: r.interactionType,
      summary: r.summary,
      interactionDate: new Date(r.interactionDate).toISOString(),
      orgName: r.orgName,
      source: r.source,
    })),
  };
}
