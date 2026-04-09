"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePeople } from "@/hooks/use-people";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { getWarmthLevel } from "@/lib/constants";

const ENTITY_FILTERS = ["All", "CE", "SYN", "UUL", "FO"];
const STRENGTH_FILTERS = ["All", "strong", "medium", "weak", "cold"];

/**
 * CONTACTS — Visual card grid for browsing people.
 * Filterable by entity, relationship strength, search.
 */
export default function ContactsPage() {
  const { data: people } = usePeople();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [strengthFilter, setStrengthFilter] = useState("All");

  const filtered = useMemo(() => {
    if (!people) return [];
    return people.filter((p) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const match =
          p.fullName.toLowerCase().includes(q) ||
          p.fullNameZh?.toLowerCase().includes(q) ||
          p.primaryOrg?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Entity
      if (entityFilter !== "All") {
        if (!p.entityTags?.includes(entityFilter)) return false;
      }
      // Strength
      if (strengthFilter !== "All") {
        if (p.relationshipStrength !== strengthFilter) return false;
      }
      return true;
    });
  }, [people, search, entityFilter, strengthFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-32 lg:pt-8 lg:pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="font-[Manrope] text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Contacts
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          {people?.length ?? 0} people in your network
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
          style={{
            background: "#262a31",
            color: "var(--text-primary)",
            border: "none",
          }}
        />

        {/* Entity chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ENTITY_FILTERS.map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e)}
              className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors"
              style={{
                background: entityFilter === e ? "var(--accent)" : "#262a31",
                color: entityFilter === e ? "#412d00" : "var(--text-secondary)",
              }}
            >
              {e}
            </button>
          ))}
          <div className="w-px mx-1 self-stretch" style={{ background: "#262a31" }} />
          {STRENGTH_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStrengthFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-[Space_Grotesk] shrink-0 transition-colors capitalize"
              style={{
                background: strengthFilter === s ? "var(--accent)" : "#262a31",
                color: strengthFilter === s ? "#412d00" : "var(--text-secondary)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => {
          const warmth = getWarmthLevel(p.daysSinceInteraction);
          return (
            <Link
              key={p.id}
              href={`/contacts/${p.id}`}
              className="block active:scale-[0.98] transition-transform"
            >
              <div
                className="p-4 rounded-lg space-y-3 h-full"
                style={{
                  background: "#181c22",
                  border: `1px solid ${warmth.color}20`,
                }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    background: `${warmth.color}15`,
                    color: warmth.color,
                  }}
                >
                  {p.fullName
                    .split(/[\s-]+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>

                {/* Name */}
                <div>
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.fullName}
                  </div>
                  {p.fullNameZh && p.fullNameZh !== p.fullName && (
                    <div
                      className="text-xs truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {p.fullNameZh}
                    </div>
                  )}
                </div>

                {/* Org + title */}
                <div className="space-y-0.5">
                  {p.primaryOrg && (
                    <div
                      className="text-xs truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {p.primaryOrg}
                    </div>
                  )}
                  {(p.primaryOrgTitle ?? p.title) && (
                    <div
                      className="text-[10px] truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {p.primaryOrgTitle ?? p.title}
                    </div>
                  )}
                </div>

                {/* Footer: warmth + channels */}
                <div className="flex items-center justify-between pt-1">
                  <WarmthDot daysSinceTouch={p.daysSinceInteraction} size={6} />
                  <div className="flex gap-1">
                    {p.wechat && (
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                        style={{ background: "#262a31", color: "var(--text-tertiary)" }}
                      >
                        W
                      </span>
                    )}
                    {p.email && (
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: "#262a31", color: "var(--text-tertiary)" }}
                      >
                        <span className="material-symbols-outlined text-[10px]">mail</span>
                      </span>
                    )}
                    {p.telegram && (
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                        style={{ background: "#262a31", color: "var(--text-tertiary)" }}
                      >
                        T
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          className="p-12 text-center text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          No contacts match your filters
        </div>
      )}
    </div>
  );
}
