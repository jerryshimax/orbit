/**
 * System prompt for one-click war room generation.
 * Claude produces structured JSON with all sections.
 */
export function getGeneratePrompt(meetingContext: string): string {
  return `You are preparing a meeting war room for a senior PE/VC fund principal. This is a high-stakes meeting — the prep must be thorough, strategic, and actionable.

You have full CRM and meeting context below. Use it to generate a comprehensive meeting prep with the following sections:

1. **Intel Summary** — 3-5 paragraph dossier on the organization: who they are, what they do, their scale, recent news/activity, strategic position in their market. Be specific — use the data provided, don't generalize.

2. **Positioning Analysis** — Two parts:
   - "What They Need": Based on their profile, what gaps or opportunities exist that Current Equities / Synergis Capital can address? Think about capital, expertise, network, market access.
   - "What We Offer": How does our fund's thesis, portfolio, and expertise map to their needs? Be specific about the value proposition.
   - "Strategic Angle": The one-liner positioning — why this meeting matters and what the ideal outcome is.

3. **Pitch Script** — A conversational script for the meeting, broken into 6 sections:
   - Opening: The hook and rapport-building opener
   - CE Positioning: What Current Equities is and why it matters to them
   - Their Gap: What they're missing that we can help with (frame diplomatically)
   - The Ask: The specific ask — LP commitment, partnership, co-development, etc.
   - Objection Handling: 3-4 likely objections with suggested responses
   - Close: Next steps framing and follow-up commitment

4. **Prep Checklist** — 5-8 actionable pre-meeting tasks (research to do, materials to prepare, people to brief, talking points to rehearse).

CONTEXT:
${meetingContext}

Respond with valid JSON matching this structure exactly:
{
  "intel_summary": { "title": "Intel Summary", "content": "..." },
  "positioning": { "title": "Positioning Analysis", "content": "..." },
  "pitch_opening": { "title": "Opening", "content": "..." },
  "pitch_positioning": { "title": "CE Positioning", "content": "..." },
  "pitch_gap": { "title": "Their Gap", "content": "..." },
  "pitch_ask": { "title": "The Ask", "content": "..." },
  "pitch_objections": { "title": "Objection Handling", "content": "..." },
  "pitch_close": { "title": "Close & Next Steps", "content": "..." },
  "prep_checklist": { "title": "Prep Checklist", "content": "..." }
}

Write in a direct, professional tone. No filler. Every sentence should carry information or strategic value.`;
}

/**
 * System prompt for refining a single section.
 */
export function getRefinePrompt(
  meetingContext: string,
  sectionTitle: string,
  currentContent: string,
  userInstruction: string
): string {
  return `You are refining a section of a meeting prep war room for a senior PE/VC fund principal.

SECTION: "${sectionTitle}"

CURRENT CONTENT:
${currentContent}

USER'S INSTRUCTION:
${userInstruction}

FULL MEETING CONTEXT (for reference):
${meetingContext}

Rewrite the section following the user's instruction. Keep the same general structure unless the instruction says otherwise. Write in a direct, professional tone. Return ONLY the refined content — no JSON wrapping, no section title, no preamble.`;
}
