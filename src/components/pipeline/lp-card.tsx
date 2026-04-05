import type { LPCard } from "@/app/(dashboard)/page";

const TYPE_LABELS: Record<string, string> = {
  family_office: "FO",
  pension: "Pension",
  sovereign_wealth: "SWF",
  endowment: "Endow",
  foundation: "Found",
  fund_of_funds: "FoF",
  insurance: "Ins",
  corporate: "Corp",
  hnwi: "HNWI",
  gp_commit: "GP",
  other: "Other",
};

export function LPCardComponent({ card }: { card: LPCard }) {
  const isStale = card.daysSinceInteraction !== null && card.daysSinceInteraction > 14;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 hover:border-zinc-700 transition-colors cursor-pointer">
      {/* Header: org name + type badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-white leading-tight">
          {card.name}
        </span>
        {card.lpType && (
          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded shrink-0">
            {TYPE_LABELS[card.lpType] ?? card.lpType}
          </span>
        )}
      </div>

      {/* Target commitment */}
      {card.targetCommitment && parseFloat(card.targetCommitment) > 0 && (
        <div className="text-xs text-zinc-400 mt-1">
          ${parseFloat(card.targetCommitment) >= 1000
            ? `${(parseFloat(card.targetCommitment) / 1000).toFixed(1)}B`
            : `${parseFloat(card.targetCommitment).toFixed(0)}M`}
          {card.actualCommitment &&
            parseFloat(card.actualCommitment) > 0 && (
              <span className="text-emerald-400 ml-1">
                (${parseFloat(card.actualCommitment).toFixed(0)}M committed)
              </span>
            )}
        </div>
      )}

      {/* Primary contact */}
      {card.primaryContact && (
        <div className="text-xs text-zinc-500 mt-1.5">
          {card.primaryContact}
          {card.primaryTitle && (
            <span className="text-zinc-600"> · {card.primaryTitle}</span>
          )}
        </div>
      )}

      {/* Footer: owner + staleness */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        {card.owner && (
          <span className="text-zinc-500 uppercase tracking-wide">
            {card.owner}
          </span>
        )}
        {card.daysSinceInteraction !== null && (
          <span
            className={
              isStale
                ? "text-red-400 font-medium"
                : "text-zinc-500"
            }
          >
            {card.daysSinceInteraction}d ago
          </span>
        )}
      </div>
    </div>
  );
}
