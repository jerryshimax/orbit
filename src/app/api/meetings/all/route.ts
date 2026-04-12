import { NextRequest } from "next/server";
import { getAllMeetings, type UnifiedMeetingFilter } from "@/db/queries/meetings-all";

export const dynamic = "force-dynamic";

const VALID_SOURCES: UnifiedMeetingFilter[] = ["all", "roadshow", "brain"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawSource = searchParams.get("source") ?? "all";
  const source = (VALID_SOURCES as string[]).includes(rawSource)
    ? (rawSource as UnifiedMeetingFilter)
    : "all";
  const entityCode = searchParams.get("entity") ?? undefined;

  const data = await getAllMeetings({ source, entityCode });
  return Response.json(data);
}
