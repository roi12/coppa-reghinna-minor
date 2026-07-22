import type { PlayerSummary } from "@/features/players/types/player.types";
import type { TournamentTeamSummary } from "@/features/teams/types/team.types";
import { getTournamentTeamAnchorId } from "@/features/teams/utils/public-team-links";

type PublicTournamentTeamRoster = {
  team: TournamentTeamSummary;
  players: PlayerSummary[];
};

type PublicTournamentTeamRosterGridProps = {
  rosters: PublicTournamentTeamRoster[];
  highlightedTeamId?: string | null;
};

function getPlayerDisplayName(player: PlayerSummary) {
  return player.displayName ?? `${player.firstName} ${player.lastName}`;
}

export function PublicTournamentTeamRosterGrid({
  rosters,
  highlightedTeamId,
}: PublicTournamentTeamRosterGridProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {rosters.map(({ team, players }) => {
        const isHighlighted = highlightedTeamId === team.id;

        return (
          <article
            key={team.id}
            id={getTournamentTeamAnchorId(team.id)}
            className={`scroll-mt-28 rounded-[1.75rem] border bg-white p-5 shadow-sm transition-[border-color,box-shadow,background-color] sm:p-6 ${
              isHighlighted
                ? "team-card-highlight border-slate-300"
                : "border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {team.seed ? `Testa di serie ${team.seed}` : "Squadra partecipante"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {team.name}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {team.playerCount} giocatori
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {players.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Nessuna rosa pubblica disponibile per questa squadra.
                </div>
              ) : (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">
                        {getPlayerDisplayName(player)}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {player.firstName} {player.lastName}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700">
                      #{player.jerseyNumber ?? "-"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
