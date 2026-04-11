import { NextRequest } from "next/server";
import { listReconProjects, createReconProject } from "@/db/queries/recon";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await listReconProjects();
  return Response.json(projects);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const project = await createReconProject({
    name: body.name,
    objective: body.objective,
    projectType: body.projectType,
    entityCode: body.entityCode,
    meetingId: body.meetingId,
    organizationId: body.organizationId,
    opportunityId: body.opportunityId,
  });

  return Response.json(project, { status: 201 });
}
