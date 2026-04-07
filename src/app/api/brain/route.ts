import { NextRequest } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const BRAIN_DIR = join(
  process.env.HOME ?? "/Users/jerryshi",
  "Work/[00] Brain"
);

export async function GET(request: NextRequest) {
  const pattern = request.nextUrl.searchParams.get("pattern");
  const file = request.nextUrl.searchParams.get("file");

  // Read a specific file
  if (file) {
    try {
      const content = await readFile(join(BRAIN_DIR, file), "utf-8");
      return Response.json({ file, content });
    } catch {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
  }

  // Search by filename pattern
  if (pattern) {
    try {
      const files = await readdir(BRAIN_DIR);
      const matches = files
        .filter((f) => f.toLowerCase().includes(pattern.toLowerCase()))
        .filter((f) => f.endsWith(".md"))
        .slice(0, 20);
      return Response.json({ matches });
    } catch {
      return Response.json({ matches: [] });
    }
  }

  return Response.json({ error: "Provide ?pattern= or ?file=" }, { status: 400 });
}
