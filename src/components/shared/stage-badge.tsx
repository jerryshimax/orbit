const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-zinc-700 text-zinc-300",
  intro: "bg-blue-900/50 text-blue-300",
  meeting: "bg-indigo-900/50 text-indigo-300",
  dd: "bg-purple-900/50 text-purple-300",
  soft_circle: "bg-amber-900/50 text-amber-300",
  committed: "bg-emerald-900/50 text-emerald-300",
  closed: "bg-green-900/50 text-green-300",
  passed: "bg-red-900/50 text-red-300",
};

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  intro: "Intro",
  meeting: "Meeting",
  dd: "DD",
  soft_circle: "Soft Circle",
  committed: "Committed",
  closed: "Closed",
  passed: "Passed",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        STAGE_COLORS[stage] ?? "bg-zinc-800 text-zinc-400"
      }`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
