"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { StageBadge } from "@/components/shared/stage-badge";
import { WarmthDot } from "@/components/shared/warmth-dot";
import { daysSince } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Contact = {
  id: string;
  fullName: string;
  title: string | null;
  email: string | null;
  relationship: string | null;
  introducedBy: string | null;
  lastInteractionAt: string | null;
  orgId: string | null;
  orgName: string | null;
  orgStage: string | null;
  orgOwner: string | null;
};

export default function ContactsPage() {
  const { data: contacts } = useSWR<Contact[]>(
    "/api/contacts",
    fetcher,
    { refreshInterval: 5000 }
  );
  const [search, setSearch] = useState("");

  const filtered = contacts?.filter(
    (c) =>
      !search ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.orgName?.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Contacts
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {contacts?.length ?? 0} contacts across all organizations
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search contacts..."
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
              {["Name", "Organization", "Title", "Stage", "Introduced By", "Warmth", "Owner"].map(
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
            {filtered?.map((c) => {
              const days = daysSince(c.lastInteractionAt);
              return (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td className="px-3 py-2.5">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {c.fullName}
                    </span>
                    {c.relationship && (
                      <span
                        className="ml-2 text-[10px] px-1.5 py-0.5 rounded capitalize"
                        style={{
                          background: "var(--bg-surface-hover)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {c.relationship}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2.5 text-sm cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => {
                      if (c.orgId)
                        window.location.href = `/organizations/${c.orgId}`;
                    }}
                  >
                    {c.orgName ?? "—"}
                  </td>
                  <td
                    className="px-3 py-2.5 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {c.title ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.orgStage && <StageBadge stage={c.orgStage} />}
                  </td>
                  <td
                    className="px-3 py-2.5 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {c.introducedBy ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <WarmthDot daysSinceTouch={days} showLabel />
                  </td>
                  <td
                    className="px-3 py-2.5 text-xs uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {c.orgOwner ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!filtered || filtered.length === 0) && (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No contacts found
          </div>
        )}
      </div>
    </div>
  );
}
