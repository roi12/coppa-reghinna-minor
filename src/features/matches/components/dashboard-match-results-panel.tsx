import { DashboardLiveMatchControls } from "@/features/matches/components/dashboard-live-match-controls";
import type { MatchSummary } from "@/features/matches/types/match.types";

type DashboardMatchResultsPanelProps = {
  matches: MatchSummary[];
};

export function DashboardMatchResultsPanel({
  matches,
}: DashboardMatchResultsPanelProps) {
  if (matches.length === 0) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        Non ci sono ancora partite create per questo torneo.
      </p>
    );
  }

  return (
    <div className="mt-4 grid w-full max-w-full min-w-0 gap-3">
      {matches.map((match) => (
        <DashboardLiveMatchControls key={match.id} match={match} />
      ))}
    </div>
  );
}
