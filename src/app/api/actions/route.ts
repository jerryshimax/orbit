import { NextRequest } from "next/server";
import { db } from "@/db";
import { actionItems } from "@/db/schema";
import { getActionItems } from "@/db/queries/actions";
import { getCurrentUserContext } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const data = await getActionItems({
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? "open",
    owner: searchParams.get("owner") ?? undefined,
    objectiveId: searchParams.get("objectiveId") ?? undefined,
    entityCode: searchParams.get("entity") ?? undefined,
    limit: searchParams.has("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined,
  });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const userContext = await getCurrentUserContext();
  const body = await request.json();

  const [created] = await db
    .insert(actionItems)
    .values({
      title: body.title,
      objectiveId: body.objectiveId,
      meetingId: body.meetingId,
      personId: body.personId,
      owner: body.owner ?? userContext.handle,
      type: body.type ?? "action",
      status: "open",
      priority: body.priority ?? "p1",
      dueDate: body.dueDate,
      notes: body.notes,
      entityCode: body.entityCode,
      createdBy: userContext.handle,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
