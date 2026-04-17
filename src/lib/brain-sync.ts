/**
 * Brain Sync — bidirectional sync between Orbit and Brain [People] notes.
 *
 * Supabase owns: pipeline_stage, commitment amounts, contact info fields
 * Brain owns: narrative content (background, interests, detailed notes)
 * Both receive: new interaction log entries
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

export const BRAIN_DIR = join(
  process.env.HOME ?? "/Users/jerryshi",
  "Work/[00] Brain"
);

// ── YAML Frontmatter Parser ────────────────────────────────────────────────

export interface Frontmatter {
  [key: string]: string | string[] | undefined;
}

export interface BrainNote {
  frontmatter: Frontmatter;
  body: string;
  raw: string;
  path: string;
}

export function parseBrainNote(filePath: string): BrainNote | null {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  const frontmatter: Frontmatter = {};
  let body = raw;

  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    const yamlBlock = match[1];
    body = match[2];

    for (const line of yamlBlock.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();

      // Handle arrays: [item1, item2]
      if (value.startsWith("[") && value.endsWith("]")) {
        const items = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
        frontmatter[key] = items;
      } else {
        frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  }

  return { frontmatter, body, raw, path: filePath };
}

// ── Append Interaction to Notes Log ────────────────────────────────────────

export function appendInteraction(
  filePath: string,
  interaction: {
    date: string;
    type: string;
    summary: string;
    teamMember: string;
  }
): void {
  const note = parseBrainNote(filePath);
  if (!note) return;

  const entry = `- ${interaction.date}: [${interaction.type}] ${interaction.summary} (logged by ${interaction.teamMember})`;

  // Find ## Notes Log section and append
  const notesLogPattern = /## Notes Log/i;
  if (notesLogPattern.test(note.body)) {
    // Find the section and append after it (before next ## or end)
    const lines = note.body.split("\n");
    let insertIdx = -1;
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      if (/^## Notes Log/i.test(lines[i])) {
        inSection = true;
        insertIdx = i + 1;
        // Skip blank line after header
        if (i + 1 < lines.length && lines[i + 1].trim() === "") {
          insertIdx = i + 2;
        }
        continue;
      }
      if (inSection && /^## /.test(lines[i])) {
        // Hit next section, insert before it
        insertIdx = i;
        break;
      }
      if (inSection) {
        insertIdx = i + 1;
      }
    }

    if (insertIdx >= 0) {
      lines.splice(insertIdx, 0, entry);
      const newBody = lines.join("\n");
      const newRaw = note.raw.replace(note.body, newBody);
      writeFileSync(filePath, newRaw);
      return;
    }
  }

  // No Notes Log section — append one
  const newContent = note.raw + "\n\n## Notes Log\n\n" + entry + "\n";
  writeFileSync(filePath, newContent);
}

// ── Update Frontmatter Fields ──────────────────────────────────────────────

export function updateFrontmatter(
  filePath: string,
  updates: Record<string, string>
): void {
  const note = parseBrainNote(filePath);
  if (!note) return;

  const newFm = { ...note.frontmatter, ...updates };

  // Rebuild YAML
  const yamlLines = Object.entries(newFm)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      return `${k}: ${v}`;
    });

  const newRaw = `---\n${yamlLines.join("\n")}\n---\n${note.body}`;
  writeFileSync(filePath, newRaw);
}

// ── Create New LP People Note ──────────────────────────────────────────────

export function createLPNote(data: {
  fullName: string;
  organization: string;
  title?: string;
  email?: string;
  phone?: string;
  lpType?: string;
  source?: string;
  introducedBy?: string;
  pipelineStage?: string;
  summary?: string;
}): string {
  const fileName = `[People] ${data.fullName}.md`;
  const filePath = join(BRAIN_DIR, fileName);

  if (existsSync(filePath)) return filePath;

  const today = new Date().toISOString().split("T")[0];

  const content = `---
type: People
entity: CE
role: LP
company: ${data.organization}
relationship: weak
tags: [LP, ${data.lpType ?? "investor"}, Current Equities]
pipeline_stage: ${data.pipelineStage ?? "prospect"}
source: ${data.source ?? "unknown"}
created: ${today}
updated: ${today}
---

# ${data.fullName}

## Role

${data.title ? `${data.title} at ` : ""}${data.organization}

## Background

(To be filled)

## Relationship

${data.introducedBy ? `Introduced by ${data.introducedBy}.` : ""}${data.source ? ` Met via ${data.source}.` : ""}

## Interests & Motivations

(To be filled)

## Notes Log

- ${today}: [${data.summary ? "note" : "created"}] ${data.summary ?? `LP record created for ${data.fullName} @ ${data.organization}`}

## Contact

${data.email ? `- Email: ${data.email}` : ""}
${data.phone ? `- Phone: ${data.phone}` : ""}

## Next Steps

- Initial outreach / follow-up
`;

  writeFileSync(filePath, content);
  return filePath;
}

// ── Scan Brain for Existing LP Notes ───────────────────────────────────────

export interface LPNoteData {
  path: string;
  fullName: string;
  frontmatter: Frontmatter;
  body: string;
}

export function scanLPNotes(): LPNoteData[] {
  const files = readdirSync(BRAIN_DIR).filter(
    (f) => f.startsWith("[People]") && f.endsWith(".md")
  );

  const lpNotes: LPNoteData[] = [];

  for (const file of files) {
    const filePath = join(BRAIN_DIR, file);
    const note = parseBrainNote(filePath);
    if (!note) continue;

    const role = (note.frontmatter.role ?? "").toString().toLowerCase();
    const tags = Array.isArray(note.frontmatter.tags)
      ? note.frontmatter.tags.map((t) => t.toLowerCase())
      : [];
    const entity = (note.frontmatter.entity ?? "").toString().toUpperCase();

    const isLP =
      role.includes("lp") ||
      role.includes("investor") ||
      tags.some((t) =>
        ["lp", "investor", "family-office", "family_office", "pension", "endowment", "fund-of-funds", "sovereign"].some(
          (kw) => t.includes(kw)
        )
      ) ||
      entity === "CE";

    if (isLP) {
      // Extract name from filename: [People] Full Name.md
      const nameMatch = file.match(/\[People\]\s*(.+)\.md$/);
      const fullName = nameMatch ? nameMatch[1].trim() : file;

      lpNotes.push({
        path: filePath,
        fullName,
        frontmatter: note.frontmatter,
        body: note.body,
      });
    }
  }

  return lpNotes;
}

// ── Get Brain Note Path for a Name ─────────────────────────────────────────

export function getBrainNotePath(fullName: string): string {
  return join(BRAIN_DIR, `[People] ${fullName}.md`);
}

export function brainNoteExists(fullName: string): boolean {
  return existsSync(getBrainNotePath(fullName));
}
