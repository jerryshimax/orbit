import { getRelationshipMomentum } from "@/db/queries/momentum";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getRelationshipMomentum();
  return Response.json(data);
}
