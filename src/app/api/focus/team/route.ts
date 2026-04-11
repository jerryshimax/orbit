import { getTeamPulse } from "@/db/queries/team-pulse";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getTeamPulse();
  return Response.json(data);
}
