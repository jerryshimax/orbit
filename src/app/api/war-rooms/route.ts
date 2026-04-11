import { listWarRooms } from "@/db/queries/war-room";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const warRooms = await listWarRooms();
  return Response.json(warRooms);
}
