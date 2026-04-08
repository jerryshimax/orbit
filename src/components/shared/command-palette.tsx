"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useSearch } from "@/hooks/use-search";
import { useRouter } from "next/navigation";
// Constants no longer needed for search results

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data } = useSearch(query);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      router.push(path);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[560px] rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="material-symbols-rounded text-[20px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              search
            </span>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search organizations, people, or navigate..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
              autoFocus
            />
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: "var(--bg-surface-active)",
                color: "var(--text-tertiary)",
              }}
            >
              ESC
            </kbd>
          </div>

          <Command.List
            className="max-h-[300px] overflow-auto p-2"
          >
            {!query && (
              <Command.Group>
                <div
                  className="px-2 py-1.5 text-[11px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Quick Navigation
                </div>
                {[
                  { label: "Dashboard", path: "/", icon: "dashboard" },
                  { label: "Pipeline", path: "/pipeline", icon: "view_kanban" },
                  { label: "Organizations", path: "/organizations", icon: "corporate_fare" },
                  { label: "Contacts", path: "/contacts", icon: "people" },
                  { label: "Briefing", path: "/briefing", icon: "strategy" },
                  { label: "Analytics", path: "/analytics", icon: "monitoring" },
                ].map((item) => (
                  <Command.Item
                    key={item.path}
                    onSelect={() => navigate(item.path)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      {item.icon}
                    </span>
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {data?.organizations && data.organizations.length > 0 && (
              <Command.Group>
                <div
                  className="px-2 py-1.5 text-[11px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Organizations
                </div>
                {data.organizations.map((org) => (
                  <Command.Item
                    key={org.id}
                    onSelect={() => navigate(`/organizations/${org.id}`)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      corporate_fare
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {org.name}
                    </span>
                    <span className="text-xs ml-auto capitalize">
                      {org.orgType?.replace("_", " ") ?? ""}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {data?.people && data.people.length > 0 && (
              <Command.Group>
                <div
                  className="px-2 py-1.5 text-[11px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  People
                </div>
                {data.people.map((c) => (
                  <Command.Item
                    key={c.id}
                    onSelect={() => navigate(`/contacts/${c.id}`)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      person
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {c.name}
                    </span>
                    {c.title && (
                      <span className="text-xs">{c.title}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {query && (!data?.organizations?.length && !data?.people?.length) && (
              <Command.Empty
                className="p-4 text-center text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                No results for &ldquo;{query}&rdquo;
              </Command.Empty>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
