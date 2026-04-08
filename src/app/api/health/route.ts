import { db } from "@/db";
import { organizations } from "@/db/schema";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(organizations);
    return Response.json({ ok: true, orgCount: Number(result.count) });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
