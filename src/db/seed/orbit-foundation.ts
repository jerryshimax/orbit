import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { pipelineDefinitions } from "@/db/schema/pipelines";

async function seed() {
  console.log("🌱 Seeding Orbit foundation data (users + pipelines)...");

  // --- USERS ---
  await db.delete(orbitUsers);

  const users = await db
    .insert(orbitUsers)
    .values([
      {
        handle: "jerry",
        fullName: "Jerry Shi",
        email: "jerryshi@synergiscap.com",
        role: "owner",
        entityAccess: ["CE", "SYN", "UUL", "FO", "PERSONAL"],
        telegramUserId: "7337144058",
        isActive: true,
      },
      {
        handle: "ray",
        fullName: "Ray Mao",
        email: "ray@currentequities.com",
        role: "partner",
        entityAccess: ["CE"],
        isActive: true,
      },
      {
        handle: "matt",
        fullName: "Matt",
        email: "matt@synergiscap.com",
        role: "partner",
        entityAccess: ["CE", "SYN"],
        isActive: true,
      },
      {
        handle: "angel",
        fullName: "Angel Zhou",
        email: "angel@neuronvc.io",
        role: "principal",
        entityAccess: ["SYN"],
        isActive: true,
      },
      {
        handle: "david",
        fullName: "David Wu",
        email: "david@synergiscap.com",
        role: "engineer",
        entityAccess: ["CE"],
        isActive: true,
      },
    ])
    .returning();

  console.log(`  ✓ ${users.length} users seeded`);

  // --- PIPELINE DEFINITIONS ---
  await db.delete(pipelineDefinitions);

  const pipelines = await db
    .insert(pipelineDefinitions)
    .values([
      {
        name: "CE LP Fundraising",
        entityCode: "CE",
        pipelineType: "lp_commitment",
        isDefault: true,
        stages: [
          { key: "prospect", label: "Prospect", color: "#6b7280", sort_order: 0 },
          { key: "intro", label: "Intro", color: "#3b82f6", sort_order: 1 },
          { key: "meeting", label: "Meeting", color: "#f59e0b", sort_order: 2 },
          { key: "dd", label: "DD", color: "#8b5cf6", sort_order: 3 },
          { key: "soft_circle", label: "Soft Circle", color: "#06b6d4", sort_order: 4 },
          { key: "committed", label: "Committed", color: "#22c55e", sort_order: 5 },
          { key: "closed", label: "Closed", color: "#10b981", sort_order: 6 },
          { key: "passed", label: "Passed", color: "#ef4444", sort_order: 7 },
        ],
      },
      {
        name: "SYN Deal Pipeline",
        entityCode: "SYN",
        pipelineType: "vc_investment",
        isDefault: true,
        stages: [
          { key: "sourced", label: "Sourced", color: "#6b7280", sort_order: 0 },
          { key: "screening", label: "Screening", color: "#3b82f6", sort_order: 1 },
          { key: "dd", label: "DD", color: "#8b5cf6", sort_order: 2 },
          { key: "term_sheet", label: "Term Sheet", color: "#f59e0b", sort_order: 3 },
          { key: "invested", label: "Invested", color: "#22c55e", sort_order: 4 },
          { key: "passed", label: "Passed", color: "#ef4444", sort_order: 5 },
        ],
      },
      {
        name: "UUL Sales Pipeline",
        entityCode: "UUL",
        pipelineType: "sales_deal",
        isDefault: true,
        stages: [
          { key: "prospect", label: "Prospect", color: "#6b7280", sort_order: 0 },
          { key: "qualified", label: "Qualified", color: "#3b82f6", sort_order: 1 },
          { key: "proposal", label: "Proposal", color: "#f59e0b", sort_order: 2 },
          { key: "negotiation", label: "Negotiation", color: "#8b5cf6", sort_order: 3 },
          { key: "won", label: "Won", color: "#22c55e", sort_order: 4 },
          { key: "lost", label: "Lost", color: "#ef4444", sort_order: 5 },
        ],
      },
      {
        name: "FO Network",
        entityCode: "FO",
        pipelineType: "partnership",
        isDefault: true,
        stages: [
          { key: "met", label: "Met", color: "#6b7280", sort_order: 0 },
          { key: "warm", label: "Warm", color: "#f59e0b", sort_order: 1 },
          { key: "active", label: "Active", color: "#3b82f6", sort_order: 2 },
          { key: "close_friend", label: "Close Friend", color: "#22c55e", sort_order: 3 },
        ],
      },
    ])
    .returning();

  console.log(`  ✓ ${pipelines.length} pipeline definitions seeded`);
  console.log("\n✅ Orbit foundation seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
