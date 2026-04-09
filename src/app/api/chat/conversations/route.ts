import { db } from "@/db";
import { conversations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.status, "active"))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(20);

  return Response.json(convs);
}
