import { getTripWithLegsAndMeetings } from "@/db/queries/roadshow";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const data = await getTripWithLegsAndMeetings(tripId);
  if (!data) return Response.json({ error: "Trip not found" }, { status: 404 });
  return Response.json(data);
}
