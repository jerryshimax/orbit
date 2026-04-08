import { NextRequest } from "next/server";
import { getPersonDetail } from "@/db/queries/people";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getPersonDetail(id);

  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(detail);
}
