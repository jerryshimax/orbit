"use client";

import { useState } from "react";
import Link from "next/link";
import { usePeople } from "@/hooks/use-people";
import { WarmthDot } from "@/components/shared/warmth-dot";

export default function ContactsPage() {
  const { data: people } = usePeople();
  const [search, setSearch] = useState("");

  const filtered = people?.filter(
    (p) =>
      !search ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.fullNameZh?.toLowerCase().includes(search.toLowerCase()) ||
      p.primaryOrg?.toLowerCase().includes(search.toLowerCase()) ||
      p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          People
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {people?.length ?? 0} contacts across all organizations
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search people..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm w-64 outline-none"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Name", "Organization", "Title", "Relationship", "Introduced By", "Warmth", "Contact"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-xs font-medium text-left"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered?.map((p) => (
              <tr
                key={p.id}
                className="transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-surface-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                onClick={() =>
                  (window.location.href = `/contacts/${p.id}`)
                }
              >
                <td className="px-3 py-2.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.fullName}
                  </span>
                  {p.fullNameZh && p.fullNameZh !== p.fullName && (
                    <span
                      className="ml-1.5 text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {p.fullNameZh}
                    </span>
                  )}
                </td>
                <td
                  className="px-3 py-2.5 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.primaryOrgId)
                      window.location.href = `/organizations/${p.primaryOrgId}`;
                  }}
                >
                  {p.primaryOrg ?? "—"}
                  {p.affiliationCount > 1 && (
                    <span
                      className="ml-1 text-[10px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      +{p.affiliationCount - 1}
                    </span>
                  )}
                </td>
                <td
                  className="px-3 py-2.5 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {p.primaryOrgTitle ?? p.title ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  {p.relationshipStrength && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={{
                        background: "var(--bg-surface-hover)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {p.relationshipStrength}
                    </span>
                  )}
                </td>
                <td
                  className="px-3 py-2.5 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {p.introducedByName ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <WarmthDot daysSinceTouch={p.daysSinceInteraction} showLabel />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-2">
                    {p.wechat && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "var(--bg-surface-hover)", color: "var(--text-tertiary)" }}
                      >
                        WeChat
                      </span>
                    )}
                    {p.email && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "var(--bg-surface-hover)", color: "var(--text-tertiary)" }}
                      >
                        Email
                      </span>
                    )}
                    {p.telegram && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "var(--bg-surface-hover)", color: "var(--text-tertiary)" }}
                      >
                        TG
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!filtered || filtered.length === 0) && (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No people found
          </div>
        )}
      </div>
    </div>
  );
}
