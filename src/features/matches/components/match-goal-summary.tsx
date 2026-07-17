import type { MatchGoalSummaryItem } from "@/features/matches/types/match-player-events.types";

type MatchGoalSummaryProps = {
  items: MatchGoalSummaryItem[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  compact?: boolean;
};

function GoalSummaryColumn({
  items,
  title,
  compact,
}: {
  items: MatchGoalSummaryItem[];
  title: string;
  compact: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <p
            key={`${item.teamId}:${item.type}:${item.playerId ?? "unassigned"}:${item.label}`}
            className={compact ? "truncate text-sm text-slate-700" : "truncate text-sm text-slate-700 sm:text-[15px]"}
          >
            <span className="font-medium text-slate-900">{item.label}</span>
            {item.goalCount > 1 ? ` ${item.goalCount}` : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

export function MatchGoalSummary({
  items,
  homeTeamId,
  awayTeamId,
  compact = false,
}: MatchGoalSummaryProps) {
  if (items.length === 0) {
    return null;
  }

  const homeItems = items.filter((item) => item.teamId === homeTeamId);
  const awayItems = items.filter((item) => item.teamId === awayTeamId);
  const otherItems = items.filter((item) => item.teamId !== homeTeamId && item.teamId !== awayTeamId);

  return (
    <div className="grid gap-3">
      {(homeItems.length > 0 || awayItems.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <GoalSummaryColumn items={homeItems} title="Marcatori casa" compact={compact} />
          <GoalSummaryColumn items={awayItems} title="Marcatori ospiti" compact={compact} />
        </div>
      )}

      {otherItems.length > 0 ? (
        <GoalSummaryColumn items={otherItems} title="Altri eventi gol" compact={compact} />
      ) : null}
    </div>
  );
}
