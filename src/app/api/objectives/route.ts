import { NextRequest } from "next/server";
import { db } from "@/db";
import { objectives } from "@/db/schema";
import { getObjectives } from "@/db/queries/objectives";
import { getCurrentUserContext } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const data = await getObjectives({
    status: searchParams.get("status") ?? undefined,
    entityCode: searchParams.get("entity") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
  });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const userContext = await getCurrentUserContext();
  const body = await request.json();

  const [created] = await db
    .insert(objectives)
    .values({
      title: body.title,
      description: body.description,
      entityCode: body.entityCode,
      priority: body.priority ?? "p1",
      status: "active",
      deadline: body.deadline,
      owner: body.owner ?? userContext.handle,
      createdBy: userContext.handle,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
