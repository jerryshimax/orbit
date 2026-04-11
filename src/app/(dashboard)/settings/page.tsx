"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data } = useSWR("/api/calendar?start=2099-01-01&end=2099-01-02", fetcher);
  const hasGoogle = data?.hasGoogleConnected ?? false;

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-32 lg:pb-8">
      <h1
        className="font-[Manrope] text-2xl font-extrabold tracking-tight mb-8"
        style={{ color: "var(--text-primary)" }}
      >
        Settings
      </h1>

      {/* Google Connection */}
      <section
        className="p-5 rounded-lg border"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="material-symbols-rounded text-xl"
            style={{ color: "var(--accent)" }}
          >
            event
          </span>
          <h2
            className="font-[Manrope] font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            Google Calendar & Gmail
          </h2>
        </div>

        {hasGoogle ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-rounded text-sm"
                style={{ color: "#22c55e" }}
              >
                check_circle
              </span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                Connected
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Calendar events sync every 15 minutes. Gmail contacts sync every 30 minutes.
            </p>
            <a
              href="/api/google/auth"
              className="inline-block text-xs underline"
              style={{ color: "var(--text-secondary)" }}
            >
              Reconnect account
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Connect your Google account to sync calendar events and auto-import contacts from meetings and emails.
            </p>
            <a
              href="/api/google/auth"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-[var(--font-headline)] transition-colors hover:brightness-110"
              style={{ background: "var(--accent)", color: "#412d00" }}
            >
              <span className="material-symbols-rounded text-lg">link</span>
              Connect Google Account
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
