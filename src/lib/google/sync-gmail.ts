import { db } from "@/db";
import {
  googleOauthTokens,
  people,
  emailContactMap,
  interactions,
  syncQueue,
  syncLog,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getGoogleClient } from "./client";

const GMAIL_THREADS_URL = "https://gmail.googleapis.com/gmail/v1/users/me/threads";
const GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

const INTERNAL_DOMAINS = ["synergiscap.com", "neuronvc.io", "uulglobal.com"];
const SKIP_PATTERNS = [
  /no-?reply/i,
  /noreply/i,
  /notifications?@/i,
  /newsletter/i,
  /unsubscribe/i,
  /mailer-daemon/i,
  /postmaster/i,
  /calendar-notification/i,
];

/**
 * Sync Gmail for a user — extract contact signals from threads.
 */
export async function syncGmailForUser(userId: string): Promise<{
  threadsScanned: number;
  autoCreated: number;
  queued: number;
}> {
  const client = await getGoogleClient(userId);
  if (!client) return { threadsScanned: 0, autoCreated: 0, queued: 0 };

  // Get user's own email to filter self
  const [tokenRow] = await db
    .select({
      googleEmail: googleOauthTokens.googleEmail,
      lastGmailHistoryId: googleOauthTokens.lastGmailHistoryId,
    })
    .from(googleOauthTokens)
    .where(eq(googleOauthTokens.userId, userId))
    .limit(1);

  if (!tokenRow) return { threadsScanned: 0, autoCreated: 0, queued: 0 };

  const myEmail = tokenRow.googleEmail.toLowerCase();

  // Fetch recent threads (last 90 days, max 100)
  const after = Math.floor((Date.now() - 90 * 86400_000) / 1000);
  const params = new URLSearchParams({
    q: `after:${after}`,
    maxResults: "100",
  });

  const res = await client.fetch(`${GMAIL_THREADS_URL}?${params}`);
  if (!res.ok) {
    console.error("Gmail threads fetch failed:", res.status);
    return { threadsScanned: 0, autoCreated: 0, queued: 0 };
  }

  const data = await res.json();
  const threadSummaries: Array<{ id: string }> = data.threads ?? [];

  let threadsScanned = 0;
  let autoCreated = 0;
  let queued = 0;

  // Track contact signals: email → { turns, lastDate, name, isOutboundOnly }
  const contactSignals = new Map<
    string,
    {
      name: string;
      turns: number;
      lastDate: string;
      isOutboundNoReply: boolean;
      subjects: string[];
    }
  >();

  for (const threadSummary of threadSummaries.slice(0, 50)) {
    const threadRes = await client.fetch(
      `${GMAIL_THREADS_URL}/${threadSummary.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe`
    );
    if (!threadRes.ok) continue;

    const thread = await threadRes.json();
    const messages: any[] = thread.messages ?? [];
    threadsScanned++;

    // Skip newsletters (List-Unsubscribe header)
    const hasUnsubscribe = messages.some((m: any) =>
      m.payload?.headers?.some(
        (h: any) => h.name.toLowerCase() === "list-unsubscribe"
      )
    );
    if (hasUnsubscribe) continue;

    // Extract participants
    const participants = new Map<string, { name: string; sentCount: number; receivedCount: number }>();
    let subject = "";

    for (const msg of messages) {
      const headers: Array<{ name: string; value: string }> =
        msg.payload?.headers ?? [];

      const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
      const to = headers.find((h) => h.name.toLowerCase() === "to")?.value ?? "";
      if (!subject) {
        subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
      }
      const date = headers.find((h) => h.name.toLowerCase() === "date")?.value ?? "";

      const fromParsed = parseEmailAddress(from);
      const toParsed = parseEmailAddresses(to);

      if (!fromParsed) continue;

      const isFromMe = fromParsed.email.toLowerCase() === myEmail;

      // Track external participants
      for (const addr of [fromParsed, ...toParsed]) {
        if (addr.email.toLowerCase() === myEmail) continue;
        if (isSkipEmail(addr.email)) continue;

        const key = addr.email.toLowerCase();
        const existing = participants.get(key) ?? {
          name: addr.name || addr.email.split("@")[0],
          sentCount: 0,
          receivedCount: 0,
        };

        if (isFromMe) {
          existing.sentCount++;
        } else if (addr.email.toLowerCase() === fromParsed.email.toLowerCase()) {
          existing.receivedCount++;
        }

        participants.set(key, existing);
      }
    }

    // Aggregate signals per participant
    for (const [email, p] of participants) {
      const totalTurns = p.sentCount + p.receivedCount;
      const isOutboundNoReply = p.sentCount > 0 && p.receivedCount === 0;

      const existing = contactSignals.get(email);
      if (existing) {
        existing.turns += totalTurns;
        existing.subjects.push(subject);
        if (isOutboundNoReply) existing.isOutboundNoReply = true;
      } else {
        contactSignals.set(email, {
          name: p.name,
          turns: totalTurns,
          lastDate: new Date().toISOString(),
          isOutboundNoReply: isOutboundNoReply,
          subjects: [subject],
        });
      }
    }
  }

  // Process signals
  for (const [email, signal] of contactSignals) {
    // Check if contact already exists
    const [existingMap] = await db
      .select({ personId: emailContactMap.personId })
      .from(emailContactMap)
      .where(eq(emailContactMap.emailAddress, email))
      .limit(1);

    if (existingMap?.personId) continue; // Already tracked

    let confidence: number;
    let signalType: string;

    if (signal.turns >= 3) {
      confidence = 0.9;
      signalType = "multi_turn_email";
    } else if (signal.isOutboundNoReply) {
      confidence = 0.7;
      signalType = "outbound_no_reply";
    } else {
      confidence = 0.5;
      signalType = "low_engagement_email";
    }

    if (confidence >= 0.85) {
      // Auto-create contact
      const nameParts = signal.name.split(" ");
      const [inserted] = await db
        .insert(people)
        .values({
          fullName: signal.name,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || null,
          email,
          source: "gmail_scan",
          entityTags: [],
          visibility: "team",
          relationshipStrength: "weak",
          relationshipScore: Math.round(confidence * 100),
          tags: ["auto-imported"],
        })
        .returning({ id: people.id });

      await db.insert(emailContactMap).values({
        emailAddress: email,
        personId: inserted.id,
        confidence: confidence.toFixed(2),
        source: "gmail_scan",
      });

      await db.insert(syncLog).values({
        source: "gmail",
        sourceId: email,
        action: "created_person",
        targetTable: "people",
        targetId: inserted.id,
        confidence: confidence.toFixed(2),
        autoApproved: true,
        metadata: { signal: signalType, turns: signal.turns },
      });

      autoCreated++;
    } else {
      // Queue for review
      await db
        .insert(syncQueue)
        .values({
          source: "gmail",
          sourceId: email,
          eventType:
            signalType === "outbound_no_reply"
              ? "follow_up_needed"
              : "new_contact",
          payload: {
            email,
            name: signal.name,
            confidence,
            signal: signalType,
            turns: signal.turns,
            isOutboundNoReply: signal.isOutboundNoReply,
            subjects: signal.subjects.slice(0, 3),
          },
          status: "pending",
        })
        .onConflictDoNothing();
      queued++;
    }
  }

  return { threadsScanned, autoCreated, queued };
}

function parseEmailAddress(raw: string): { email: string; name: string } | null {
  // Handle "Name <email@domain.com>" or "email@domain.com"
  const match = raw.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
  if (!match) return null;
  return { name: (match[1] ?? "").trim(), email: match[2].trim() };
}

function parseEmailAddresses(raw: string): Array<{ email: string; name: string }> {
  return raw
    .split(",")
    .map((s) => parseEmailAddress(s.trim()))
    .filter((a): a is NonNullable<typeof a> => a !== null);
}

function isSkipEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (INTERNAL_DOMAINS.includes(domain)) return true;
  return SKIP_PATTERNS.some((p) => p.test(email));
}
