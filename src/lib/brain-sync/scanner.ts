/**
 * Brain File Scanner — discovers and classifies Brain files for sync into Orbit.
 *
 * Scans ~/Work/[00] Brain/ recursively across entity subdirectories.
 * Classifies files by filename prefix ([Memos], [Meetings], [People], [Research]).
 * Returns structured descriptors with parsed frontmatter.
 */

import { readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { BRAIN_DIR, parseBrainNote, type BrainNote } from "../brain-sync";

export type BrainFileType = "memo" | "meeting" | "person" | "research";

export interface BrainFileDescriptor {
  path: string;
  filename: string;
  type: BrainFileType;
  entity: string | null;
  title: string;
  date: string | null;
  frontmatter: Record<string, string | string[] | undefined>;
  note: BrainNote;
}

/** Map filename prefix to BrainFileType */
const PREFIX_MAP: Record<string, BrainFileType> = {
  "[Memos]": "memo",
  "[Meetings]": "meeting",
  "[People]": "person",
  "[Research]": "research",
};

/** Entity subdirectories to scan */
const ENTITY_DIRS = ["CE", "SYN", "UUL", "FO"];

/** People live in their own directory */
const PEOPLE_DIR = "People";

/**
 * Extract file type from filename prefix.
 * Returns null if the file doesn't match any known type.
 */
function classifyFile(filename: string): BrainFileType | null {
  for (const [prefix, type] of Object.entries(PREFIX_MAP)) {
    if (filename.startsWith(prefix)) return type;
  }
  return null;
}

/**
 * Extract a human-readable title from the filename.
 * Pattern: [Type] Entity - Title.md → "Title"
 * Pattern: [Type] Entity - YYYY-MM-DD Title.md → "Title"
 * Pattern: [People] Full Name.md → "Full Name"
 */
function extractTitle(filename: string): string {
  // Remove .md extension
  const base = filename.replace(/\.md$/, "");

  // Remove prefix like [Memos], [Meetings], etc.
  const withoutPrefix = base.replace(/^\[[^\]]+\]\s*/, "");

  // Remove entity prefix like "CE - ", "SYN - "
  const withoutEntity = withoutPrefix.replace(
    /^(?:CE|SYN|UUL|FO)\s*-\s*/,
    ""
  );

  // Remove leading date like "2026-03-18 "
  const withoutDate = withoutEntity.replace(/^\d{4}-\d{2}-\d{2}\s+/, "");

  return withoutDate.trim() || base;
}

/**
 * Extract entity from frontmatter or parent directory.
 */
function resolveEntity(
  frontmatter: Record<string, string | string[] | undefined>,
  parentDir: string
): string | null {
  // Prefer frontmatter entity
  const fmEntity = frontmatter.entity;
  if (typeof fmEntity === "string" && fmEntity) {
    return fmEntity.toUpperCase();
  }

  // Fall back to parent directory name
  if (ENTITY_DIRS.includes(parentDir)) {
    return parentDir;
  }

  return null;
}

/**
 * Extract date from frontmatter or filename.
 */
function resolveDate(
  frontmatter: Record<string, string | string[] | undefined>,
  filename: string
): string | null {
  // Prefer frontmatter date
  const fmDate = frontmatter.date;
  if (typeof fmDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(fmDate)) {
    return fmDate.slice(0, 10);
  }

  // Try filename date pattern
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  // Try created field
  const created = frontmatter.created;
  if (
    typeof created === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(created)
  ) {
    return created.slice(0, 10);
  }

  return null;
}

/**
 * List .md files in a directory (non-recursive, ignores dotfiles).
 */
function listMdFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter(
      (f) => f.endsWith(".md") && !f.startsWith(".")
    );
  } catch {
    return [];
  }
}

/**
 * Scan all Brain files and return structured descriptors.
 *
 * @param opts.entity - Filter to a specific entity (e.g., "CE")
 * @param opts.type - Filter to a specific file type (e.g., "memo")
 */
export function scanBrainFiles(opts?: {
  entity?: string;
  type?: BrainFileType;
}): BrainFileDescriptor[] {
  const results: BrainFileDescriptor[] = [];

  // Scan entity subdirectories
  for (const dir of ENTITY_DIRS) {
    if (opts?.entity && dir !== opts.entity) continue;

    const dirPath = join(BRAIN_DIR, dir);
    for (const filename of listMdFiles(dirPath)) {
      const fileType = classifyFile(filename);
      if (!fileType) continue;
      if (opts?.type && fileType !== opts.type) continue;

      const filePath = join(dirPath, filename);
      const note = parseBrainNote(filePath);
      if (!note) continue;

      const entity = resolveEntity(note.frontmatter, dir);
      if (opts?.entity && entity !== opts.entity) continue;

      results.push({
        path: filePath,
        filename,
        type: fileType,
        entity,
        title: extractTitle(filename),
        date: resolveDate(note.frontmatter, filename),
        frontmatter: note.frontmatter,
        note,
      });
    }
  }

  // Scan People directory
  if (!opts?.type || opts.type === "person") {
    const peopleDir = join(BRAIN_DIR, PEOPLE_DIR);
    for (const filename of listMdFiles(peopleDir)) {
      if (!filename.startsWith("[People]")) continue;

      const filePath = join(peopleDir, filename);
      const note = parseBrainNote(filePath);
      if (!note) continue;

      const entity = resolveEntity(note.frontmatter, PEOPLE_DIR);
      if (opts?.entity && entity && entity !== opts.entity) continue;

      results.push({
        path: filePath,
        filename,
        type: "person",
        entity,
        title: extractTitle(filename),
        date: resolveDate(note.frontmatter, filename),
        frontmatter: note.frontmatter,
        note,
      });
    }
  }

  // Also scan Brain root for any flat [People] files (legacy)
  if (!opts?.type || opts.type === "person") {
    for (const filename of listMdFiles(BRAIN_DIR)) {
      if (!filename.startsWith("[People]")) continue;

      const filePath = join(BRAIN_DIR, filename);
      const note = parseBrainNote(filePath);
      if (!note) continue;

      const entity = resolveEntity(note.frontmatter, "");
      if (opts?.entity && entity && entity !== opts.entity) continue;

      // Avoid duplicates if file also exists in People/
      if (results.some((r) => r.path === filePath)) continue;

      results.push({
        path: filePath,
        filename,
        type: "person",
        entity,
        title: extractTitle(filename),
        date: resolveDate(note.frontmatter, filename),
        frontmatter: note.frontmatter,
        note,
      });
    }
  }

  return results;
}
