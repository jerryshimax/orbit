import { NextRequest } from "next/server";
import { getRecon, upsertSection, deleteSection } from "@/db/queries/recon";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const data = await getRecon(projectId);
  if (!data) return Response.json({ error: "Project not found" }, { status: 404 });

  return Response.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json();

  if (body.action === "delete" && body.sectionId) {
    await deleteSection(projectId, body.sectionId);
    return Response.json({ ok: true });
  }

  const section = await upsertSection(projectId, {
    id: body.sectionId,
    sectionType: body.sectionType ?? "custom",
    title: body.title,
    content: body.content ?? "",
    sortOrder: body.sortOrder,
    aiGenerated: body.aiGenerated,
    aiPrompt: body.aiPrompt,
    metadata: body.metadata,
  });

  return Response.json(section);
}
