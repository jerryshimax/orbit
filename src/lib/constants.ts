export const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospect", color: "#6b7280" },
  { key: "intro", label: "Intro", color: "#3b82f6" },
  { key: "meeting", label: "Meeting", color: "#f59e0b" },
  { key: "dd", label: "DD", color: "#8b5cf6" },
  { key: "soft_circle", label: "Soft Circle", color: "#06b6d4" },
  { key: "committed", label: "Committed", color: "#22c55e" },
  { key: "closed", label: "Closed", color: "#10b981" },
  { key: "passed", label: "Passed", color: "#ef4444" },
] as const;

export const STAGE_MAP = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s])
) as Record<string, (typeof PIPELINE_STAGES)[number]>;

export const LP_TYPES: Record<string, string> = {
  pension: "Pension",
  sovereign_wealth: "Sovereign Wealth",
  endowment: "Endowment",
  foundation: "Foundation",
  family_office: "Family Office",
  fund_of_funds: "Fund of Funds",
  insurance: "Insurance",
  corporate: "Corporate",
  hnwi: "HNWI",
  gp_commit: "GP Commit",
  other: "Other",
};

/**
 * Strategic categories — how each org fits into Jerry's ecosystem.
 * This is the primary lens for the dashboard, not pipeline stage or LP type.
 */
export const STRATEGIC_CATEGORIES = [
  { key: "strategic_lp", label: "Strategic LP", icon: "handshake", color: "#8b5cf6", description: "Invests AND brings strategic value (network, deals, expertise)" },
  { key: "financial_lp", label: "Financial LP", icon: "account_balance", color: "#3b82f6", description: "Pure capital — family offices, pensions, wealth managers" },
  { key: "developer", label: "Developer", icon: "domain", color: "#06b6d4", description: "Data center developers, operators, build-to-suit" },
  { key: "manufacturer", label: "Manufacturer", icon: "precision_manufacturing", color: "#f59e0b", description: "Equipment, battery, power electronics, thermal" },
  { key: "hyperscaler", label: "Hyperscaler", icon: "cloud", color: "#10b981", description: "Cloud/AI companies — offtakers for BTM power" },
  { key: "epc", label: "EPC", icon: "engineering", color: "#ef4444", description: "Engineering, procurement, construction — builds the projects" },
  { key: "supply_chain", label: "Supply Chain", icon: "local_shipping", color: "#f97316", description: "Component suppliers, raw materials, logistics" },
  { key: "nyfw", label: "NYFW Sponsors", icon: "style", color: "#ec4899", description: "New York Fashion Week brand sponsors" },
  { key: "uncategorized", label: "Uncategorized", icon: "help_outline", color: "#6b7280", description: "Needs categorization" },
] as const;

export const STRATEGIC_CATEGORY_MAP = Object.fromEntries(
  STRATEGIC_CATEGORIES.map((c) => [c.key, c])
) as Record<string, (typeof STRATEGIC_CATEGORIES)[number]>;

/**
 * Infer strategic category from org data.
 * Uses tags, lp_type, notes, and sector_focus to make a best guess.
 * Orgs should eventually have an explicit strategic_category field.
 */
export function inferStrategicCategory(org: {
  lpType: string | null;
  tags: string[] | null;
  notes: string | null;
  sectorFocus: string[] | null;
  name: string;
}): string {
  const tags = (org.tags ?? []).map((t) => t.toLowerCase());
  const notes = (org.notes ?? "").toLowerCase();
  const name = org.name.toLowerCase();

  // NYFW sponsors — clear tag signal
  if (tags.includes("nyfw-sponsor") || tags.includes("nyfw")) {
    return "nyfw";
  }

  // Hyperscaler signals
  if (
    ["alibaba", "tencent", "bytedance", "baidu", "microsoft", "google", "amazon", "meta"].some(
      (h) => name.includes(h)
    ) ||
    tags.includes("hyperscaler")
  ) {
    return "hyperscaler";
  }

  // Developer signals
  if (
    ["gds", "vnet", "chindata", "dayone", "bridge data", "digitalland"].some(
      (d) => name.includes(d)
    ) ||
    tags.includes("developer") ||
    notes.includes("data center developer") ||
    notes.includes("data center operator")
  ) {
    return "developer";
  }

  // EPC signals
  if (
    tags.includes("epc") ||
    notes.includes("epc") ||
    notes.includes("turnkey") ||
    ["shanghai electric", "harbin electric", "dongfang"].some((e) => name.includes(e))
  ) {
    return "epc";
  }

  // Manufacturer signals
  if (
    tags.includes("manufacturer") ||
    notes.includes("manufacturer") ||
    notes.includes("battery") ||
    notes.includes("power electronics") ||
    notes.includes("thermal") ||
    notes.includes("gas turbine") ||
    ["catl", "byd", "eve energy", "huawei", "chint", "sinexcel", "envicool", "jereh", "kstar", "dongshan"].some(
      (m) => name.includes(m)
    )
  ) {
    return "manufacturer";
  }

  // Supply chain signals
  if (
    tags.includes("supply-chain") ||
    tags.includes("supply_chain") ||
    notes.includes("component") ||
    notes.includes("supply chain")
  ) {
    return "supply_chain";
  }

  // Strategic LP: has "strategic" tag or investing + sector overlap
  if (
    tags.includes("strategic-lp") ||
    tags.includes("strategic") ||
    (org.lpType === "corporate" && (notes.includes("potential lp") || notes.includes("co-invest")))
  ) {
    return "strategic_lp";
  }

  // Financial LP: explicit LP types
  if (
    ["pension", "sovereign_wealth", "endowment", "foundation", "family_office", "fund_of_funds", "insurance", "hnwi", "gp_commit"].includes(
      org.lpType ?? ""
    ) ||
    tags.includes("potential-lp") ||
    notes.includes("potential lp") ||
    notes.includes("wealth manag")
  ) {
    return "financial_lp";
  }

  return "uncategorized";
}

export const INTERACTION_TYPES: Record<string, { label: string; icon: string }> = {
  meeting: { label: "Meeting", icon: "groups" },
  call: { label: "Call", icon: "call" },
  email: { label: "Email", icon: "mail" },
  conference: { label: "Conference", icon: "event" },
  intro: { label: "Intro", icon: "handshake" },
  dd_session: { label: "DD Session", icon: "fact_check" },
  deck_sent: { label: "Deck Sent", icon: "slideshow" },
  follow_up: { label: "Follow Up", icon: "reply" },
  commitment: { label: "Commitment", icon: "verified" },
  note: { label: "Note", icon: "edit_note" },
};

export const FUND_TARGET_MM = 500; // $500M Fund I target

export function getWarmthLevel(daysSinceTouch: number | null): {
  label: string;
  color: string;
  level: "hot" | "warm" | "cooling" | "cold" | "unknown";
} {
  if (daysSinceTouch === null)
    return { label: "No contact", color: "#9ca3af", level: "unknown" };
  if (daysSinceTouch <= 7)
    return { label: "Hot", color: "#22c55e", level: "hot" };
  if (daysSinceTouch <= 14)
    return { label: "Warm", color: "#eab308", level: "warm" };
  if (daysSinceTouch <= 30)
    return { label: "Cooling", color: "#f97316", level: "cooling" };
  return { label: "Cold", color: "#ef4444", level: "cold" };
}
