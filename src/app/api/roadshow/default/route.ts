import { getDefaultTrip } from "@/db/queries/roadshow";

export async function GET() {
  const trip = await getDefaultTrip();
  return Response.json(trip);
}
