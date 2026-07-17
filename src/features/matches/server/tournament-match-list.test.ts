import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TournamentMatchList } from "@/features/matches/components/tournament-match-list";
import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  normalizePublicTournamentLiveState,
  serializePublicTournamentLiveState,
  type PublicTournamentLiveState,
  type PublicTournamentLiveStateTransport,
} from "@/features/tournaments/types/public-tournament-live-state.types";

function buildMatch(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: "match-1",
    tournamentId: "tournament-1",
    stageId: null,
    stageType: null,
    stageIsPublic: null,
    groupId: null,
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    homeTeamName: "Northport Rovers",
    awayTeamName: "Old Town Athletic",
    roundLabel: "Round 2",
    startsAt: new Date("2026-07-16T20:30:00.000Z"),
    endsAt: new Date("2026-07-16T21:30:00.000Z"),
    liveStartedAt: null,
    finishedAt: null,
    lastScoreUpdatedAt: null,
    scoreVersion: 0,
    locationLabel: "Palazzetto Comunale",
    status: "SCHEDULED",
    homeScore: 0,
    awayScore: 0,
    ...overrides,
  };
}

function buildState(match: MatchSummary): PublicTournamentLiveState {
  return {
    generatedAt: new Date("2026-07-16T20:40:00.000Z"),
    tournament: {
      id: "tournament-1",
      slug: "coppa-reghinna-minor-2026",
      name: "Coppa Reghinna Minor 2026",
      format: "GROUPS_THEN_KNOCKOUT",
      locationLabel: "Maiori",
      teamCount: 4,
      completedMatchCount: 0,
      knockoutStageIsPublic: true,
      preliminaryStandingsMode: "GROUPS",
      preliminaryStandingsLabel: "Fase a gironi",
    },
    matches: [match],
    standings: [],
    groupStandings: [],
  };
}

function serializeAndNormalize(state: PublicTournamentLiveState) {
  const transport = JSON.parse(
    JSON.stringify(serializePublicTournamentLiveState(state)),
  ) as PublicTournamentLiveStateTransport;

  return normalizePublicTournamentLiveState(transport);
}

test("match list renders safely after a live-state JSON refresh", () => {
  const normalized = serializeAndNormalize(buildState(buildMatch()));

  const markup = renderToStaticMarkup(
    createElement(TournamentMatchList, {
      matches: normalized.matches,
      emptyMessage: "Nessuna partita.",
    }),
  );

  assert.match(markup, /Northport Rovers/);
  assert.match(markup, /Old Town Athletic/);
  assert.match(markup, /16 lug 2026/i);
});

test("match list renders live and finished matches after repeated refresh cycles", () => {
  const refreshCycles = [
    buildState(
      buildMatch({
        status: "LIVE",
        homeScore: 1,
        awayScore: 0,
        liveStartedAt: new Date("2026-07-16T20:31:00.000Z"),
        lastScoreUpdatedAt: new Date("2026-07-16T20:33:00.000Z"),
      }),
    ),
    buildState(
      buildMatch({
        status: "LIVE",
        homeScore: 2,
        awayScore: 1,
        liveStartedAt: new Date("2026-07-16T20:31:00.000Z"),
        lastScoreUpdatedAt: new Date("2026-07-16T20:35:00.000Z"),
      }),
    ),
    buildState(
      buildMatch({
        status: "FINISHED",
        homeScore: 2,
        awayScore: 1,
        liveStartedAt: new Date("2026-07-16T20:31:00.000Z"),
        finishedAt: new Date("2026-07-16T21:20:00.000Z"),
        lastScoreUpdatedAt: new Date("2026-07-16T20:35:00.000Z"),
      }),
    ),
  ].map(serializeAndNormalize);

  for (const normalized of refreshCycles) {
    const markup = renderToStaticMarkup(
      createElement(TournamentMatchList, {
        matches: normalized.matches,
        emptyMessage: "Nessuna partita.",
      }),
    );

    assert.match(markup, /Northport Rovers/);
    assert.doesNotMatch(markup, /Invalid time value/);
  }

  const liveMarkup = renderToStaticMarkup(
    createElement(TournamentMatchList, {
      matches: refreshCycles[1]?.matches ?? [],
      emptyMessage: "Nessuna partita.",
    }),
  );
  const finishedMarkup = renderToStaticMarkup(
    createElement(TournamentMatchList, {
      matches: refreshCycles[2]?.matches ?? [],
      emptyMessage: "Nessuna partita.",
    }),
  );

  assert.match(liveMarkup, /Live Now/);
  assert.match(finishedMarkup, /Full Time|FULL TIME|Risultato finale/);
});
