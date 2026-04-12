"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEntity } from "@/components/shared/entity-provider";
import { useObjectives } from "@/hooks/use-objectives";
import { useActions } from "@/hooks/use-actions";
import { useMomentum } from "@/hooks/use-momentum";
import { useTeamPulse } from "@/hooks/use-team-pulse";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { usePipelineSummary } from "@/hooks/use-pipeline";
import { formatMoney } from "@/lib/format";

const PRIORITY_COLORS: Record<string, string> = {
  p0: "#ef4444",
  p1: "#f59e0b",
  p2: "#6b7280",
};

const ENTITY_COLORS: Record<string, string> = {
  CE: "#e9c176",
  SYN: "#3b82f6",
  UUL: "#22c55e",
  FO: "#a855f7",
};

const ACTION_TABS = [
  { key: "all", label: "All" },
  { key: "action", label: "Actions" },
  { key: "decision", label: "Decisions" },
  { key: "follow_up", label: "Follow-ups" },
];

export default function FocusPage() {
  const { entityParam } = useEntity();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().split("T")[0];

  const { data: objectivesData, mutate: mutateObjectives } = useObjectives("active", entityParam);
  const { data: allActions, mutate: mutateActions } = useActions({ entity: entityParam });
  const { data: momentum } = useMomentum();
  const { data: teamPulse } = useTeamPulse();
  const { events: todayEvents } = useCalendarEvents(today, tomorrow);
  const { data: pipeline } = usePipelineSummary({ entity: entityParam });

  const [actionTab, setActionTab] = useState("all");
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [showNewAction, setShowNewAction] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newObjEntity, setNewObjEntity] = useState("");
  const [newObjPriority, setNewObjPriority] = useState("p1");
  const [newObjDeadline, setNewObjDeadline] = useState("");
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionType, setNewActionType] = useState("action");
  const [newActionDue, setNewActionDue] = useState("");

  const objectives = objectivesData ?? [];
  const actions = allActions ?? [];

  // Today's agenda
  const agenda = useMemo(
    () =>
      todayEvents
        .filter((e) => !e.isAllDay)
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .slice(0, 8),
    [todayEvents]
  );

  // Deadline alerts (objectives due in 7 days)
  const deadlineAlerts = useMemo(() => {
    const in7d = new Date(Date.now() + 7 * 86400_000)
      .toISOString()
      .split("T")[0];
    return objectives.filter(
      (o: any) => o.deadline && o.deadline >= today && o.deadline <= in7d
    );
  }, [objectives, today]);

  // Filtered actions by tab
  const filteredActions = useMemo(
    () =>
      actionTab === "all"
        ? actions
        : actions.filter((a: any) => a.type === actionTab),
    [actions, actionTab]
  );

  // Action counts by type
  const actionCounts = useMemo(() => {
    const counts = { action: 0, decision: 0, follow_up: 0, total: actions.length };
    for (const a of actions) {
      if (a.type in counts) (counts as any)[a.type]++;
    }
    return counts;
  }, [actions]);

  const toggleAction = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "open" : "done";
    await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    mutateActions();
  };

  const createObjective = async () => {
    if (!newObjTitle.trim()) return;
    await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newObjTitle,
        entityCode: newObjEntity || undefined,
        priority: newObjPriority,
        deadline: newObjDeadline || undefined,
      }),
    });
    setNewObjTitle("");
    setNewObjEntity("");
    setNewObjPriority("p1");
    setNewObjDeadline("");
    setShowNewObjective(false);
    mutateObjectives();
  };

  const createAction = async () => {
    if (!newActionTitle.trim()) return;
    await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newActionTitle,
        type: newActionType,
        dueDate: newActionDue || undefined,
      }),
    });
    setNewActionTitle("");
    setNewActionType("action");
    setNewActionDue("");
    setShowNewAction(false);
    mutateActions();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 lg:pb-8 space-y-8">
      {/* Header */}
      <div>
        <h1
          className="font-[Manrope] text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Focus
        </h1>
        <p
          className="text-sm mt-1 font-[JetBrains_Mono]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {objectives.length} objective{objectives.length !== 1 ? "s" : ""}
          {actionCounts.total > 0 && ` · ${actionCounts.total} open`}
          {actionCounts.decision > 0 &&
            ` · ${actionCounts.decision} decision${actionCounts.decision !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Deadline Alerts */}
      {deadlineAlerts.length > 0 && (
        <div
          className="p-3 rounded-lg border flex items-center gap-3"
          style={{
            background: "rgba(233, 193, 118, 0.08)",
            borderColor: "var(--accent)",
          }}
        >
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: "var(--accent)" }}
          >
            alarm
          </span>
          <div className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
            {deadlineAlerts.map((o: any, i: number) => (
              <span key={o.id}>
                {i > 0 && " · "}
                <strong>{o.title}</strong>
                {o.deadline && (
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {" "}
                    — due{" "}
                    {new Date(o.deadline + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Today's Agenda */}
      {agenda.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Today's Agenda
            </h2>
            <Link
              href="/calendar"
              className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              See all →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {agenda.map((evt) => (
              <Link
                key={evt.id}
                href={`/calendar/${evt.id}`}
                className="shrink-0 px-3 py-2 rounded-lg hover:brightness-110 transition-colors"
                style={{ background: "#181c22", minWidth: 140 }}
              >
                <div
                  className="font-[JetBrains_Mono] text-xs"
                  style={{ color: "var(--accent)" }}
                >
                  {new Date(evt.startTime)
                    .toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                    .slice(0, 5)}
                </div>
                <div
                  className="text-xs font-[Manrope] font-semibold mt-0.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {evt.title}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Objectives Board — strategic tier */}
      <section
        className="rounded-xl p-5 border"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,180,70,0.04) 0%, rgba(245,180,70,0.01) 100%)",
          borderColor: "rgba(245,180,70,0.18)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="material-symbols-rounded text-[16px]"
                style={{ color: "var(--accent)" }}
              >
                flag
              </span>
              <h2
                className="font-[Manrope] font-bold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                Strategic Objectives
              </h2>
            </div>
            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Big rocks — what success looks like this quarter
            </p>
          </div>
          <button
            onClick={() => setShowNewObjective(!showNewObjective)}
            className="flex items-center gap-1 text-[10px] font-[Space_Grotesk] uppercase tracking-wider hover:opacity-80 px-2 py-1 rounded border"
            style={{ color: "var(--accent)", borderColor: "rgba(245,180,70,0.3)" }}
          >
            <span className="material-symbols-rounded text-[14px]">add</span>
            New Objective
          </button>
        </div>

        {/* Inline create form */}
        {showNewObjective && (
          <div
            className="p-4 rounded-lg mb-3 space-y-2 border"
            style={{ background: "#181c22", borderColor: "var(--accent)" }}
          >
            <input
              type="text"
              value={newObjTitle}
              onChange={(e) => setNewObjTitle(e.target.value)}
              placeholder="What are you trying to accomplish? e.g., Close Fund I LP #3 by EOQ"
              autoFocus
              className="w-full bg-transparent text-sm focus:outline-none placeholder-[#9a8f80]/50"
              style={{ color: "var(--text-primary)" }}
              onKeyDown={(e) => e.key === "Enter" && createObjective()}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={newObjEntity}
                onChange={(e) => setNewObjEntity(e.target.value)}
                className="bg-[#262a31] text-[10px] font-[Space_Grotesk] uppercase rounded px-2 py-1 focus:outline-none"
                style={{ color: "var(--text-secondary)" }}
              >
                <option value="">Entity</option>
                <option value="CE">CE</option>
                <option value="SYN">SYN</option>
                <option value="UUL">UUL</option>
                <option value="FO">FO</option>
              </select>
              <select
                value={newObjPriority}
                onChange={(e) => setNewObjPriority(e.target.value)}
                className="bg-[#262a31] text-[10px] font-[Space_Grotesk] uppercase rounded px-2 py-1 focus:outline-none"
                style={{ color: PRIORITY_COLORS[newObjPriority] }}
              >
                <option value="p0">P0</option>
                <option value="p1">P1</option>
                <option value="p2">P2</option>
              </select>
              <input
                type="date"
                value={newObjDeadline}
                onChange={(e) => setNewObjDeadline(e.target.value)}
                className="bg-[#262a31] text-[10px] font-[JetBrains_Mono] rounded px-2 py-1 focus:outline-none"
                style={{ color: "var(--text-secondary)" }}
              />
              <div className="flex-1" />
              <button
                onClick={createObjective}
                className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider px-3 py-1 rounded hover:brightness-110"
                style={{ background: "var(--accent)", color: "#412d00" }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewObjective(false)}
                className="text-[10px] px-2 py-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {objectives.length > 0 ? (
          <div className="space-y-2">
            {objectives.map((obj: any) => (
              <div
                key={obj.id}
                className="p-4 rounded-lg"
                style={{ background: "#181c22" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {obj.entityCode && (
                        <span
                          className="font-[Space_Grotesk] text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none"
                          style={{
                            background:
                              ENTITY_COLORS[obj.entityCode] ?? "#6b7280",
                            color: obj.entityCode === "CE" ? "#412d00" : "#fff",
                          }}
                        >
                          {obj.entityCode}
                        </span>
                      )}
                      <span
                        className="font-[Space_Grotesk] text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none"
                        style={{
                          background: "#1c2026",
                          color: PRIORITY_COLORS[obj.priority] ?? "#6b7280",
                          border: `1px solid ${PRIORITY_COLORS[obj.priority] ?? "#6b7280"}40`,
                        }}
                      >
                        {obj.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3
                      className="font-[Manrope] font-bold text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {obj.title}
                    </h3>
                    {obj.description && (
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {obj.description}
                      </p>
                    )}
                  </div>
                  {obj.deadline && (
                    <div
                      className="text-[10px] font-[JetBrains_Mono] shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {new Date(obj.deadline + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                {obj.keyResults?.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-[Space_Grotesk]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {obj.keyResults.length} key result
                        {obj.keyResults.length !== 1 ? "s" : ""}
                      </span>
                      <span
                        className="text-[10px] font-[JetBrains_Mono]"
                        style={{ color: "var(--accent)" }}
                      >
                        {obj.progress}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#262a31" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${obj.progress}%`,
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="p-6 rounded-lg text-center text-sm"
            style={{ background: "#181c22", color: "var(--text-tertiary)" }}
          >
            No objectives yet. Create your first strategic objective.
          </div>
        )}
      </section>

      {/* Action Stream — tactical tier */}
      <section>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="material-symbols-rounded text-[14px]"
              style={{ color: "var(--text-secondary)" }}
            >
              bolt
            </span>
            <h2
              className="font-[Manrope] font-semibold text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Work Queue
            </h2>
          </div>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Day-to-day execution — actions, decisions, follow-ups
          </p>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-4 flex-1">
          {ACTION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActionTab(tab.key)}
              className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{
                color:
                  actionTab === tab.key
                    ? "var(--accent)"
                    : "var(--text-tertiary)",
                borderBottom:
                  actionTab === tab.key ? "1px solid var(--accent)" : "none",
                paddingBottom: 4,
              }}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span className="ml-1 opacity-60">
                  {tab.key === "action"
                    ? actionCounts.action
                    : tab.key === "decision"
                      ? actionCounts.decision
                      : actionCounts.follow_up}
                </span>
              )}
            </button>
          ))}
          </div>
          <button
            onClick={() => setShowNewAction(!showNewAction)}
            className="flex items-center gap-1 text-[10px] font-[Space_Grotesk] uppercase tracking-wider hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            <span className="material-symbols-rounded text-[14px]">add</span>
            New
          </button>
        </div>

        {/* Inline create form */}
        {showNewAction && (
          <div
            className="p-3 rounded-lg mb-3 space-y-2 border"
            style={{ background: "#181c22", borderColor: "var(--accent)" }}
          >
            <input
              type="text"
              value={newActionTitle}
              onChange={(e) => setNewActionTitle(e.target.value)}
              placeholder="Next step... e.g., Send deck to Ray by Friday"
              autoFocus
              className="w-full bg-transparent text-sm focus:outline-none placeholder-[#9a8f80]/50"
              style={{ color: "var(--text-primary)" }}
              onKeyDown={(e) => e.key === "Enter" && createAction()}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={newActionType}
                onChange={(e) => setNewActionType(e.target.value)}
                className="bg-[#262a31] text-[10px] font-[Space_Grotesk] uppercase rounded px-2 py-1 focus:outline-none"
                style={{ color: "var(--text-secondary)" }}
              >
                <option value="action">Action</option>
                <option value="decision">Decision</option>
                <option value="follow_up">Follow-up</option>
              </select>
              <input
                type="date"
                value={newActionDue}
                onChange={(e) => setNewActionDue(e.target.value)}
                className="bg-[#262a31] text-[10px] font-[JetBrains_Mono] rounded px-2 py-1 focus:outline-none"
                style={{ color: "var(--text-secondary)" }}
              />
              <div className="flex-1" />
              <button
                onClick={createAction}
                className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider px-3 py-1 rounded hover:brightness-110"
                style={{ background: "var(--accent)", color: "#412d00" }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewAction(false)}
                className="text-[10px] px-2 py-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {filteredActions.length > 0 ? (
          <div className="space-y-1.5">
            {filteredActions.map((a: any) => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "#181c22" }}
              >
                <button
                  onClick={() => toggleAction(a.id, a.status)}
                  className="w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                  style={{
                    borderColor:
                      a.status === "done"
                        ? "var(--accent)"
                        : "var(--border)",
                    background:
                      a.status === "done" ? "var(--accent)" : "transparent",
                  }}
                >
                  {a.status === "done" && (
                    <span
                      className="material-symbols-rounded text-[14px]"
                      style={{ color: "#412d00" }}
                    >
                      check
                    </span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm"
                    style={{
                      color:
                        a.status === "done"
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                      textDecoration:
                        a.status === "done" ? "line-through" : "none",
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    className="text-[11px] mt-0.5 flex items-center gap-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <span>{a.owner}</span>
                    {a.objectiveTitle && (
                      <>
                        <span>·</span>
                        <span className="truncate">{a.objectiveTitle}</span>
                      </>
                    )}
                    {a.type === "decision" && (
                      <span
                        className="font-[Space_Grotesk] text-[8px] uppercase tracking-wider px-1 py-px rounded"
                        style={{ background: "#ef444420", color: "#ef4444" }}
                      >
                        Decision
                      </span>
                    )}
                    {a.type === "follow_up" && (
                      <span
                        className="font-[Space_Grotesk] text-[8px] uppercase tracking-wider px-1 py-px rounded"
                        style={{ background: "#3b82f620", color: "#3b82f6" }}
                      >
                        Follow-up
                      </span>
                    )}
                  </div>
                </div>
                {a.dueDate && (
                  <span
                    className="text-[10px] font-[JetBrains_Mono] shrink-0"
                    style={{
                      color:
                        a.dueDate < today ? "#ef4444" : "var(--text-tertiary)",
                    }}
                  >
                    {new Date(a.dueDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="p-4 rounded-lg text-center text-xs"
            style={{ background: "#181c22", color: "var(--text-tertiary)" }}
          >
            No open items
          </div>
        )}
      </section>

      {/* Relationship Momentum */}
      {momentum && (momentum.warming?.length > 0 || momentum.cooling?.length > 0) && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Relationship Momentum
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Warming */}
            <div className="space-y-1.5">
              <div
                className="text-[9px] font-[Space_Grotesk] uppercase tracking-wider flex items-center gap-1"
                style={{ color: "#22c55e" }}
              >
                <span className="material-symbols-rounded text-[12px]">
                  trending_up
                </span>
                Warming
              </div>
              {(momentum.warming ?? []).map((c: any) => (
                <Link
                  key={c.personId}
                  href={`/contacts/${c.personId}`}
                  className="block p-2 rounded-lg hover:brightness-110 transition-colors"
                  style={{ background: "#181c22" }}
                >
                  <div
                    className="text-xs font-[Manrope] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="text-[10px] font-[JetBrains_Mono]"
                    style={{ color: "#22c55e" }}
                  >
                    +{c.delta} interactions
                  </div>
                </Link>
              ))}
            </div>
            {/* Cooling */}
            <div className="space-y-1.5">
              <div
                className="text-[9px] font-[Space_Grotesk] uppercase tracking-wider flex items-center gap-1"
                style={{ color: "#ef4444" }}
              >
                <span className="material-symbols-rounded text-[12px]">
                  trending_down
                </span>
                Cooling
              </div>
              {(momentum.cooling ?? []).map((c: any) => (
                <Link
                  key={c.personId}
                  href={`/contacts/${c.personId}`}
                  className="block p-2 rounded-lg hover:brightness-110 transition-colors"
                  style={{ background: "#181c22" }}
                >
                  <div
                    className="text-xs font-[Manrope] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="text-[10px] font-[JetBrains_Mono]"
                    style={{ color: "#ef4444" }}
                  >
                    {c.delta} interactions
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Pulse */}
      {teamPulse && teamPulse.length > 0 && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Team Pulse
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {teamPulse.map((m: any) => (
              <div
                key={m.handle}
                className="shrink-0 px-3 py-2.5 rounded-lg"
                style={{ background: "#181c22", minWidth: 130 }}
              >
                <div
                  className="font-[Manrope] font-bold text-xs"
                  style={{ color: "var(--text-primary)" }}
                >
                  {m.fullName}
                </div>
                <div
                  className="text-[10px] mt-1 font-[Space_Grotesk]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {m.openActions} open
                  {m.overdueActions > 0 && (
                    <span style={{ color: "#ef4444" }}>
                      {" "}
                      · {m.overdueActions} overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fund Pulse */}
      {pipeline && (
        <section>
          <h2
            className="font-[Space_Grotesk] text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Fund Pulse
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Committed",
                value: formatMoney(pipeline.totalCommitted),
              },
              {
                label: "Pipeline",
                value: formatMoney(pipeline.totalTarget),
              },
              { label: "Active", value: String(pipeline.totalOrgs) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-lg"
                style={{ background: "#181c22" }}
              >
                <div
                  className="font-[Space_Grotesk] text-[9px] uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </div>
                <div
                  className="font-[JetBrains_Mono] text-lg font-bold mt-1"
                  style={{ color: "var(--accent)" }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
