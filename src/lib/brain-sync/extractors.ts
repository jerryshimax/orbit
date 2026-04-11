/**
 * Brain File Extractors — type-specific parsers that extract structured data
 * from Brain note markdown content.
 *
 * Each extractor takes a BrainFileDescriptor and returns data shaped for
 * the corresponding Orbit DB table.
 */

import type { BrainFileDescriptor } from "./scanner";

// ── Shared Helpers ────────────────────────────────────────────────────────

/**
 * Extract content from a specific ## section in markdown body.
 * Returns the text between the matching ## header and the next ## or end of file.
 */
function extractSection(body: string, sectionName: string): string | null {
  const pattern = new RegExp(
    `^##\\s+${sectionName}\\s*$`,
    "im"
  );
  const match = body.match(pattern);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  const rest = body.slice(start);

  // Find next ## heading or end
  const nextHeading = rest.search(/^##\s/m);
  const sectionText =
    nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;

  return sectionText.trim() || null;
}

/**
 * Extract bullet list items from a section.
 */
function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => /^\s*[-*]\s/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

/**
 * Extract a field value from a contact-style section.
 * Matches patterns like "- Email: value" or "Email: value"
 */
function extractField(text: string, field: string): string | null {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*[-*]?\\s*${field}\\s*[:：]\\s*(.+)`,
    "i"
  );
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Get a string value from frontmatter.
 */
function fmStr(
  fm: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const val = fm[key];
  return typeof val === "string" && val ? val : null;
}

// ── Memo Extractor ────────────────────────────────────────────────────────

export interface MemoData {
  company: string | null;
  recommendation: string | null;
  stage: string | null;
  sector: string | null;
  dealSize: string | null;
  summary: string | null;
  entityCode: string | null;
  brainNotePath: string;
  opportunityType: string;
}

/** Map Brain status values to Orbit pipeline stages */
const STATUS_TO_STAGE: Record<string, string> = {
  evaluating: "screening",
  "in dd": "dd",
  "further diligence": "dd",
  active: "screening",
  passed: "passed",
  invested: "closed",
  portfolio: "closed",
  draft: "screening",
};

export function extractFromMemo(file: BrainFileDescriptor): MemoData {
  const fm = file.frontmatter;

  // Company: from frontmatter, or parse from title
  let company = fmStr(fm, "company");
  if (!company) {
    // Title is already extracted without entity prefix
    // e.g., "Nscale IC Memo" → "Nscale"
    // Try to extract company name before common suffixes
    const titleWords = file.title.replace(
      /\s+(IC Memo|Screening Memo|Deal Screen|Deep Dive|Analysis)$/i,
      ""
    );
    company = titleWords || null;
  }

  const status = fmStr(fm, "status")?.toLowerCase() ?? "";
  const stage =
    fmStr(fm, "stage") ?? STATUS_TO_STAGE[status] ?? "screening";

  // Determine opportunity type from entity
  const entityCode = file.entity;
  const opportunityType =
    entityCode === "CE" ? "pe_investment" : "vc_investment";

  // Extract summary from first paragraph of body
  const bodyLines = file.note.body.trim().split("\n");
  const firstPara = bodyLines
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"))
    .slice(0, 3)
    .join(" ")
    .trim();

  return {
    company,
    recommendation: fmStr(fm, "recommendation"),
    stage,
    sector: fmStr(fm, "sector"),
    dealSize: fmStr(fm, "deal_size") ?? fmStr(fm, "dealSize"),
    summary: firstPara.slice(0, 500) || null,
    entityCode,
    brainNotePath: file.path,
    opportunityType,
  };
}

// ── Meeting Extractor ─────────────────────────────────────────────────────

export interface MeetingData {
  date: string | null;
  summary: string | null;
  attendeeNames: string[];
  actionItems: string[];
  entityCode: string | null;
  brainNotePath: string;
  title: string;
}

export function extractFromMeeting(file: BrainFileDescriptor): MeetingData {
  const fm = file.frontmatter;
  const body = file.note.body;

  // Attendees from frontmatter or section
  let attendeeNames: string[] = [];
  const fmAttendees = fm.attendees;
  if (Array.isArray(fmAttendees)) {
    attendeeNames = fmAttendees.map((a) => a.trim()).filter(Boolean);
  } else if (typeof fmAttendees === "string" && fmAttendees) {
    attendeeNames = fmAttendees
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  // Try attendees section if none in frontmatter
  if (attendeeNames.length === 0) {
    const attendeesSection =
      extractSection(body, "Attendees") ??
      extractSection(body, "Participants") ??
      extractSection(body, "Key Contacts Discussed");
    if (attendeesSection) {
      attendeeNames = extractBullets(attendeesSection).map((b) =>
        // Clean wiki links: [[Name]] → Name
        b.replace(/\[\[([^\]]+)\]\]/g, "$1").split(/\s*[-—|]\s*/)[0].trim()
      );
    }
  }

  // Action items from sections
  const actionSection =
    extractSection(body, "Action Items") ??
    extractSection(body, "Next Steps") ??
    extractSection(body, "Action Items / Next Steps");
  const actionItems = actionSection ? extractBullets(actionSection) : [];

  // Summary: first meaningful paragraph
  const summarySection = extractSection(body, "Summary");
  let summary: string | null = null;
  if (summarySection) {
    summary = summarySection.slice(0, 500);
  } else {
    // First paragraph that isn't a heading
    const lines = body.split("\n").filter(
      (l) => l.trim() && !l.startsWith("#") && !l.startsWith("---")
    );
    summary = lines.slice(0, 3).join(" ").trim().slice(0, 500) || null;
  }

  return {
    date: file.date,
    summary,
    attendeeNames,
    actionItems,
    entityCode: file.entity,
    brainNotePath: file.path,
    title: file.title,
  };
}

// ── Person Extractor ──────────────────────────────────────────────────────

export interface PersonData {
  fullName: string;
  fullNameZh: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  linkedin: string | null;
  telegram: string | null;
  organization: string | null;
  introducedBy: string | null;
  entityTags: string[];
  relationshipStrength: string;
  brainNotePath: string;
  tags: string[];
  notes: string | null;
}

export function extractFromPerson(file: BrainFileDescriptor): PersonData {
  const fm = file.frontmatter;
  const body = file.note.body;

  // Name from filename: [People] Full Name.md
  const nameMatch = file.filename.match(/\[People\]\s*(.+)\.md$/);
  const fullName = nameMatch ? nameMatch[1].trim() : file.title;

  // Contact section
  const contactSection =
    extractSection(body, "Contact") ??
    extractSection(body, "Contact Info") ??
    "";

  // Role/company section
  const roleSection =
    extractSection(body, "Role") ?? extractSection(body, "Position") ?? "";

  // Extract org from role section or frontmatter
  let organization = fmStr(fm, "company") ?? fmStr(fm, "organization");
  if (!organization && roleSection) {
    // Pattern: "Title at Organization"
    const atMatch = roleSection.match(/(?:at|@)\s+(.+)/i);
    if (atMatch) organization = atMatch[1].trim();
  }

  // Extract title from role section or frontmatter
  let title = fmStr(fm, "title");
  if (!title && roleSection) {
    const firstLine = roleSection
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("-"));
    if (firstLine) {
      title = firstLine.replace(/\s+at\s+.+$/i, "").trim() || null;
    }
  }

  // Entity tags
  const entityTags: string[] = [];
  if (file.entity) entityTags.push(file.entity);
  const fmTags = fm.tags;
  if (Array.isArray(fmTags)) {
    // Check for entity codes in tags
    for (const t of fmTags) {
      const upper = t.toUpperCase();
      if (["CE", "SYN", "UUL", "FO"].includes(upper) && !entityTags.includes(upper)) {
        entityTags.push(upper);
      }
    }
  }

  // Relationship strength
  const fmRelationship = fmStr(fm, "relationship") ?? "weak";
  const strengthMap: Record<string, string> = {
    strong: "strong",
    medium: "medium",
    warm: "medium",
    weak: "weak",
    cold: "cold",
    new: "cold",
  };
  const relationshipStrength =
    strengthMap[fmRelationship.toLowerCase()] ?? "weak";

  // Tags
  const tags: string[] = [];
  if (Array.isArray(fmTags)) {
    tags.push(...fmTags.map((t) => t.toLowerCase()));
  }

  // Background as notes
  const background =
    extractSection(body, "Background") ??
    extractSection(body, "Bio") ??
    null;

  return {
    fullName,
    fullNameZh: null, // Could extract if Chinese name present
    title,
    email:
      extractField(contactSection, "Email") ??
      fmStr(fm, "email"),
    phone:
      extractField(contactSection, "Phone") ??
      fmStr(fm, "phone"),
    wechat:
      extractField(contactSection, "WeChat") ??
      extractField(contactSection, "微信") ??
      fmStr(fm, "wechat"),
    linkedin:
      extractField(contactSection, "LinkedIn") ??
      fmStr(fm, "linkedin"),
    telegram:
      extractField(contactSection, "Telegram") ??
      fmStr(fm, "telegram"),
    organization,
    introducedBy: fmStr(fm, "introduced_by")?.replace(
      /\[\[|\]\]/g,
      ""
    ) ?? null,
    entityTags,
    relationshipStrength,
    brainNotePath: file.path,
    tags,
    notes: background?.slice(0, 2000) ?? null,
  };
}

// ── Research Extractor ────────────────────────────────────────────────────

export interface ResearchData {
  title: string;
  date: string | null;
  entityCode: string | null;
  entityTags: string[];
  tags: string[];
  content: string;
  brainNotePath: string;
}

export function extractFromResearch(file: BrainFileDescriptor): ResearchData {
  const fm = file.frontmatter;

  const entityTags: string[] = [];
  if (file.entity) entityTags.push(file.entity);

  const tags: string[] = [];
  if (Array.isArray(fm.tags)) {
    tags.push(...fm.tags.map((t) => t.toLowerCase()));
  }

  return {
    title: file.title,
    date: file.date,
    entityCode: file.entity,
    entityTags,
    tags,
    content: file.note.body.trim(),
    brainNotePath: file.path,
  };
}
