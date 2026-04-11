import { db } from "@/db";
import { orbitUsers, actionItems, fieldTripMeetings } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";

export type TeamMemberPulse = {
  handle: string;
  fullName: string;
  role: string;
  openActions: number;
  overdueActions: number;
  activeMeetings: number;
};

export async function getTeamPulse(): Promise<TeamMemberPulse[]> {
  const users = await db
    .select({
      handle: orbitUsers.handle,
      fullName: orbitUsers.fullName,
      role: orbitUsers.role,
    })
    .from(orbitUsers)
    .where(eq(orbitUsers.isActive, true));

  const today = new Date().toISOString().split("T")[0];

  const results: TeamMemberPulse[] = [];

  for (const user of users) {
    // Open action items for this user
    const [actionStats] = await db
      .select({ cnt: count() })
      .from(actionItems)
      .where(
        and(
          eq(actionItems.owner, user.handle),
          eq(actionItems.status, "open")
        )
      );

    // Overdue actions
    const [overdueStats] = await db
      .select({ cnt: count() })
      .from(actionItems)
      .where(
        and(
          eq(actionItems.owner, user.handle),
          eq(actionItems.status, "open"),
          sql`${actionItems.dueDate} < ${today}`
        )
      );

    // Active meetings (upcoming, not completed/cancelled)
    const [meetingStats] = await db
      .select({ cnt: count() })
      .from(fieldTripMeetings)
      .where(
        and(
          sql`${fieldTripMeetings.meetingDate} >= ${today}`,
          sql`${fieldTripMeetings.status} NOT IN ('completed', 'cancelled')`
        )
      );

    results.push({
      handle: user.handle,
      fullName: user.fullName,
      role: user.role,
      openActions: Number(actionStats.cnt),
      overdueActions: Number(overdueStats.cnt),
      activeMeetings: Number(meetingStats.cnt),
    });
  }

  return results;
}
