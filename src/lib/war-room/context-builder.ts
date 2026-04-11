import type { WarRoomData } from "@/db/queries/war-room";

/**
 * Build a text context block from war room data for AI prompts.
 * Includes: org profile, people, interaction history, opportunity, existing sections, attached doc text.
 */
export function buildWarRoomContext(data: WarRoomData): string {
  const parts: string[] = [];
  const { meeting, context, sections, attachments } = data;

  // Meeting basics
  parts.push(`## Meeting: ${meeting.title}`);
  parts.push(`Date: ${meeting.meetingDate ?? "TBD"} ${meeting.meetingTime ?? ""}`);
  if (meeting.location) parts.push(`Location: ${meeting.location}`);
  if (meeting.meetingType) parts.push(`Type: ${meeting.meetingType}`);
  if (meeting.language !== "en") parts.push(`Language: ${meeting.language}`);
  parts.push("");

  // Existing meeting prep fields
  if (meeting.strategicAsk) {
    parts.push(`## Strategic Ask (from meeting record)`);
    parts.push(meeting.strategicAsk);
    parts.push("");
  }
  if (meeting.pitchAngle) {
    parts.push(`## Pitch Angle (from meeting record)`);
    parts.push(meeting.pitchAngle);
    parts.push("");
  }
  if (meeting.prepNotes) {
    parts.push(`## Prep Notes (from meeting record)`);
    parts.push(meeting.prepNotes);
    parts.push("");
  }

  // Attendees from meeting record
  if (meeting.attendees && Array.isArray(meeting.attendees)) {
    parts.push(`## Meeting Attendees`);
    for (const a of meeting.attendees as any[]) {
      const line = [a.name, a.title, a.org, a.role].filter(Boolean).join(" — ");
      parts.push(`- ${line}`);
    }
    parts.push("");
  }

  // Organization profile
  if (context.org) {
    const o = context.org;
    parts.push(`## Organization: ${o.name}${o.nameZh ? ` (${o.nameZh})` : ""}`);
    if (o.orgType) parts.push(`Type: ${o.orgType}`);
    if (o.lpType) parts.push(`LP Type: ${o.lpType}`);
    if (o.headquarters) parts.push(`HQ: ${o.headquarters}`);
    if (o.aumUsd) parts.push(`AUM: $${parseFloat(o.aumUsd).toLocaleString()}`);
    if (o.website) parts.push(`Website: ${o.website}`);
    if (o.description) parts.push(`Description: ${o.description}`);
    if (o.sectorFocus?.length) parts.push(`Sector Focus: ${o.sectorFocus.join(", ")}`);
    if (o.geographyFocus?.length) parts.push(`Geography Focus: ${o.geographyFocus.join(", ")}`);
    if (o.notes) parts.push(`Notes: ${o.notes}`);
    if (o.tags?.length) parts.push(`Tags: ${o.tags.join(", ")}`);
    parts.push("");
  }

  // Opportunity / pipeline
  if (context.opportunity) {
    const opp = context.opportunity;
    parts.push(`## Opportunity`);
    parts.push(`Name: ${opp.name}`);
    parts.push(`Stage: ${opp.stage}`);
    if (opp.dealSize) parts.push(`Deal Size: $${parseFloat(opp.dealSize).toLocaleString()}`);
    if (opp.commitment) parts.push(`Commitment: $${parseFloat(opp.commitment).toLocaleString()}`);
    if (opp.expectedCloseDate) parts.push(`Expected Close: ${opp.expectedCloseDate}`);
    if (opp.notes) parts.push(`Notes: ${opp.notes}`);
    parts.push("");
  }

  // People at this org
  if (context.people.length > 0) {
    parts.push(`## Key People (${context.people.length})`);
    for (const { person: p, title, isPrimary } of context.people) {
      const badge = isPrimary ? " [PRIMARY]" : "";
      parts.push(`### ${p.fullName}${p.fullNameZh ? ` (${p.fullNameZh})` : ""}${badge}`);
      if (title || p.title) parts.push(`Title: ${title ?? p.title}`);
      if (p.email) parts.push(`Email: ${p.email}`);
      if (p.relationshipStrength) parts.push(`Relationship: ${p.relationshipStrength}`);
      if (p.introducedByName) parts.push(`Introduced by: ${p.introducedByName}`);
      if (p.notes) parts.push(`Notes: ${p.notes}`);
      parts.push("");
    }
  }

  // Interaction history
  if (context.interactions.length > 0) {
    parts.push(`## Interaction History (last ${context.interactions.length})`);
    for (const i of context.interactions) {
      const date = new Date(i.interactionDate).toISOString().split("T")[0];
      parts.push(`- ${date} [${i.interactionType}] ${i.summary} (${i.teamMember})`);
    }
    parts.push("");
  }

  // Existing war room sections (for refine context)
  if (sections.length > 0) {
    parts.push(`## Existing War Room Sections`);
    for (const s of sections) {
      parts.push(`### ${s.title ?? s.sectionType} (${s.sectionType})`);
      parts.push(s.content);
      parts.push("");
    }
  }

  // Attached document text
  const docsWithText = attachments.filter((a) => a.extractedText);
  if (docsWithText.length > 0) {
    parts.push(`## Reference Documents`);
    for (const doc of docsWithText) {
      parts.push(`### ${doc.filename}`);
      // Truncate very long docs to keep prompt reasonable
      const text = doc.extractedText!;
      parts.push(text.length > 8000 ? text.slice(0, 8000) + "\n[...truncated]" : text);
      parts.push("");
    }
  }

  return parts.join("\n");
}
