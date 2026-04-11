/**
 * Import CRM data from seed files into the database.
 * Handles dedup by email (contacts) and name (orgs).
 *
 * Usage: npx tsx src/scripts/import-crm.ts
 */

import { db } from "@/db";
import { organizations, people, personOrgAffiliations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crmContacts from "../db/seed/crm-full.json";
import crmOrgs from "../db/seed/crm-data.json";

type CrmContact = {
  fullName: string;
  email?: string;
  title?: string;
  organizationName?: string;
  orgType?: string;
  entityTags?: string[];
  relationshipStrength?: string;
  relationshipScore?: number;
  source?: string;
  lastInteraction?: string;
  notes?: string;
};

type CrmOrgData = {
  organizations: Array<{
    name: string;
    orgType?: string;
    orgSubtype?: string;
    headquarters?: string;
    country?: string;
    entityTags?: string[];
    relationshipOwner?: string;
    notes?: string;
    website?: string;
    sectorFocus?: string[];
    geographyFocus?: string[];
    lpType?: string;
    targetCommitment?: number;
    aumUsd?: number;
  }>;
};

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  // Handle "4/7/2026" format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[2]),
      parseInt(parts[0]) - 1,
      parseInt(parts[1])
    );
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const stats = {
    orgsInserted: 0,
    orgsUpdated: 0,
    orgsSkipped: 0,
    contactsInserted: 0,
    contactsUpdated: 0,
    contactsSkipped: 0,
    affiliationsCreated: 0,
  };

  // ── Step 1: Import organizations ──
  console.log("Importing organizations...");
  const orgData = (crmOrgs as CrmOrgData).organizations;
  const orgNameToId = new Map<string, string>();

  for (const org of orgData) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(sql`lower(${organizations.name})`, org.name.toLowerCase()))
      .limit(1);

    if (existing) {
      orgNameToId.set(org.name.toLowerCase(), existing.id);
      // Merge: update only null fields
      await db
        .update(organizations)
        .set({
          orgSubtype: org.orgSubtype || undefined,
          headquarters: org.headquarters || undefined,
          country: org.country || undefined,
          entityTags: org.entityTags || undefined,
          relationshipOwner: org.relationshipOwner || undefined,
          website: org.website || undefined,
        })
        .where(eq(organizations.id, existing.id));
      stats.orgsUpdated++;
    } else {
      const [inserted] = await db
        .insert(organizations)
        .values({
          name: org.name,
          orgType: (org.orgType as any) || "other",
          orgSubtype: org.orgSubtype,
          headquarters: org.headquarters,
          country: org.country,
          entityTags: org.entityTags || [],
          relationshipOwner: org.relationshipOwner,
          notes: org.notes,
          website: org.website,
          sectorFocus: org.sectorFocus,
          geographyFocus: org.geographyFocus,
          lpType: org.lpType as any,
          targetCommitment: org.targetCommitment?.toString(),
          aumUsd: org.aumUsd?.toString(),
          visibility: "team",
        })
        .returning({ id: organizations.id });
      orgNameToId.set(org.name.toLowerCase(), inserted.id);
      stats.orgsInserted++;
    }
  }

  console.log(
    `  Orgs: ${stats.orgsInserted} inserted, ${stats.orgsUpdated} updated`
  );

  // ── Step 2: Import contacts ──
  console.log("\nImporting contacts...");
  const contacts = crmContacts as CrmContact[];

  for (const contact of contacts) {
    // Parse name — handle "Last, First" format
    let fullName = contact.fullName;
    if (fullName.includes(",") && !fullName.includes(" ")) {
      const [last, first] = fullName.split(",").map((s) => s.trim());
      fullName = `${first} ${last}`;
    } else if (fullName.includes(", ")) {
      const [last, first] = fullName.split(", ").map((s) => s.trim());
      fullName = `${first} ${last}`;
    }

    // Dedup by email
    if (contact.email) {
      const [existing] = await db
        .select({ id: people.id })
        .from(people)
        .where(
          eq(
            sql`lower(${people.email})`,
            contact.email.toLowerCase()
          )
        )
        .limit(1);

      if (existing) {
        // Merge: update enrichable fields only if currently null
        const lastDate = parseDate(contact.lastInteraction);
        await db
          .update(people)
          .set({
            title: contact.title || undefined,
            relationshipStrength:
              (contact.relationshipStrength as any) || undefined,
            relationshipScore: contact.relationshipScore || undefined,
            notes: contact.notes || undefined,
            lastInteractionAt: lastDate || undefined,
            source: contact.source || undefined,
          })
          .where(eq(people.id, existing.id));

        // Link to org if needed
        if (contact.organizationName) {
          await linkToOrg(
            existing.id,
            contact.organizationName,
            contact.title,
            orgNameToId,
            stats
          );
        }

        stats.contactsUpdated++;
        continue;
      }
    }

    // Also dedup by name (catch contacts without email)
    const [existingByName] = await db
      .select({ id: people.id })
      .from(people)
      .where(
        eq(sql`lower(${people.fullName})`, fullName.toLowerCase())
      )
      .limit(1);

    if (existingByName) {
      stats.contactsSkipped++;
      continue;
    }

    // Insert new contact
    const lastDate = parseDate(contact.lastInteraction);
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    const [inserted] = await db
      .insert(people)
      .values({
        fullName,
        firstName,
        lastName,
        email: contact.email,
        title: contact.title,
        entityTags: contact.entityTags || [],
        relationshipStrength: (contact.relationshipStrength as any) || "weak",
        relationshipScore: contact.relationshipScore ?? 0,
        source: contact.source || "crm-import",
        notes: contact.notes,
        lastInteractionAt: lastDate,
        tags: ["unreviewed"],
        visibility: "team",
      })
      .returning({ id: people.id });

    // Link to org
    if (contact.organizationName) {
      await linkToOrg(
        inserted.id,
        contact.organizationName,
        contact.title,
        orgNameToId,
        stats
      );
    }

    stats.contactsInserted++;
  }

  console.log(
    `  Contacts: ${stats.contactsInserted} inserted, ${stats.contactsUpdated} updated, ${stats.contactsSkipped} skipped`
  );
  console.log(`  Affiliations: ${stats.affiliationsCreated} created`);
  console.log("\nDone.");
  process.exit(0);
}

async function linkToOrg(
  personId: string,
  orgName: string,
  title: string | undefined,
  orgNameToId: Map<string, string>,
  stats: { affiliationsCreated: number }
) {
  let orgId = orgNameToId.get(orgName.toLowerCase());

  // Auto-create org if not found
  if (!orgId) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(sql`lower(${organizations.name})`, orgName.toLowerCase()))
      .limit(1);

    if (existing) {
      orgId = existing.id;
    } else {
      const [created] = await db
        .insert(organizations)
        .values({
          name: orgName,
          orgType: "other",
          entityTags: [],
          visibility: "team",
        })
        .returning({ id: organizations.id });
      orgId = created.id;
    }
    orgNameToId.set(orgName.toLowerCase(), orgId);
  }

  // Create affiliation (skip if exists)
  try {
    await db
      .insert(personOrgAffiliations)
      .values({
        personId,
        organizationId: orgId,
        title,
        isPrimaryOrg: true,
      })
      .onConflictDoNothing();
    stats.affiliationsCreated++;
  } catch {
    // Duplicate — skip
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
