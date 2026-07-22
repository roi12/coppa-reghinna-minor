import Link from "next/link";

import { TeamMark } from "@/components/ui/team-mark";
import { MatchGoalSummary } from "@/features/matches/components/match-goal-summary";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { buildPublicTournamentTeamHref } from "@/features/teams/utils/public-team-links";
import {
  formatCompactDateTimeLabel,
  formatLocalizedDateTimeLabel,
} from "@/lib/format-date";

type TournamentMatchListProps = {
  matches: MatchSummary[];
  emptyMessage: string;
  tournamentSlug?: string;
};

function getTeamShortLabel(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return name.trim().slice(0, 3).toUpperCase() || "TEAM";
}

function MatchTeamIdentity({
  name,
  teamId,
  tournamentSlug,
  align,
}: {
  name: string;
  teamId: string | null;
  tournamentSlug?: string;
  align: "left" | "right";
}) {
  const content = (
    <>
      <TeamMark name={name} size="sm" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {getTeamShortLabel(name)}
        </p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
          {name}
        </p>
      </div>
    </>
  );

  const className =
    align === "left"
      ? "grid justify-items-start gap-2 text-left"
      : "grid justify-items-end gap-2 text-right";

  if (!teamId || !tournamentSlug) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link
      href={buildPublicTournamentTeamHref(tournamentSlug, teamId)}
      aria-label={`Apri la squadra ${name}`}
      className={`${className} rounded-[1rem] outline-none transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2`}
    >
      {content}
    </Link>
  );
}

export function TournamentMatchList({
  matches,
  emptyMessage,
  tournamentSlug,
}: TournamentMatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Nessun contenuto disponibile al momento.</p>
        <p className="mt-2 leading-6">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      {matches.map((match) => (
        <article
          key={match.id}
          className={`rounded-[1.5rem] border p-3 shadow-sm transition-colors sm:p-5 ${
            match.status === "FINISHED"
              ? "border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)]"
              : match.status === "LIVE"
                ? "border-red-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff1f2_100%)]"
                : match.status === "SCHEDULED"
                  ? "border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]"
                  : "border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {(match.roundLabel ?? "Partita") +
                  (match.startsAt ? ` · ${formatCompactDateTimeLabel(match.startsAt)}` : "")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {match.locationLabel ?? "Campo da definire"}
              </p>
            </div>

            <MatchLiveIndicator status={match.status} />
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/80 bg-white/90 px-3 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
              <MatchTeamIdentity
                name={match.homeTeamName}
                teamId={match.homeTeamId}
                tournamentSlug={tournamentSlug}
                align="left"
              />

              <div
                className={`rounded-[1.15rem] px-3 py-2.5 text-center ${
                  match.status === "LIVE"
                    ? "bg-red-50 text-red-700"
                    : match.status === "FINISHED"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="text-[1.9rem] font-semibold leading-none tabular-nums sm:text-3xl">
                  {match.homeScore}
                  <span className="px-2 opacity-60">-</span>
                  {match.awayScore}
                </p>
              </div>

              <MatchTeamIdentity
                name={match.awayTeamName}
                teamId={match.awayTeamId}
                tournamentSlug={tournamentSlug}
                align="right"
              />
            </div>

            {match.goalSummary.length > 0 ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <MatchGoalSummary
                  items={match.goalSummary}
                  homeTeamId={match.homeTeamId}
                  awayTeamId={match.awayTeamId}
                  compact
                />
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-1 rounded-[1.15rem] bg-white/80 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="font-medium text-slate-600">
              {match.status === "FINISHED"
                ? "Risultato finale"
                : match.status === "LIVE"
                  ? "Aggiornamento live"
                  : match.status === "SCHEDULED"
                    ? "Calcio d'inizio"
                    : "Stato partita"}
            </span>
            <span className="font-semibold text-slate-950">
              {match.status === "SCHEDULED"
                ? formatLocalizedDateTimeLabel(match.startsAt)
                : match.status === "LIVE"
                  ? match.lastScoreUpdatedAt
                    ? `Ultimo aggiornamento ${formatLocalizedDateTimeLabel(match.lastScoreUpdatedAt)}`
                    : "Diretta in corso"
                  : match.status === "POSTPONED"
                    ? "Rinvio comunicato"
                    : match.status === "CANCELLED"
                      ? "Partita annullata"
              : `${match.homeScore} - ${match.awayScore}`}
            </span>
          </div>

          {tournamentSlug ? (
            <div className="mt-3 flex justify-end">
              <Link
                href={`/tournaments/${tournamentSlug}/matches/${match.id}`}
                className="text-sm font-medium text-slate-700 hover:text-slate-950"
              >
                Cronologia eventi
              </Link>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
