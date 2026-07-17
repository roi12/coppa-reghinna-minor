import assert from "node:assert/strict";
import test from "node:test";

import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  normalizePublicTournamentLiveState,
  serializePublicTournamentLiveState,
  type PublicTournamentLiveState,
  type PublicTournamentLiveStateTransport,
} from "@/features/tournaments/types/public-tournament-live-state.types";
import {
  formatDateInputValue,
  formatDateLabel,
  formatDateTimeInputValue,
  formatDateTimeLabel,
  formatTimeInputValue,
} from "@/lib/format-date";

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
    liveStartedAt: new Date("2026-07-16T20:32:00.000Z"),
    finishedAt: null,
    lastScoreUpdatedAt: new Date("2026-07-16T20:35:00.000Z"),
    scoreVersion: 3,
    locationLabel: "Palazzetto Comunale",
    status: "LIVE",
    homeScore: 2,
    awayScore: 1,
    goalSummary: [],
    latestEventSummary: null,
    scoreReconciliation: null,
    ...overrides,
  };
}

function buildState(overrides: Partial<PublicTournamentLiveState> = {}): PublicTournamentLiveState {
  return {
    generatedAt: new Date("2026-07-16T20:40:00.000Z"),
    tournament: {
      id: "tournament-1",
      slug: "coppa-reghinna-minor-2026",
      name: "Coppa Reghinna Minor 2026",
      format: "GROUPS_THEN_KNOCKOUT",
      locationLabel: "Maiori",
      teamCount: 4,
      completedMatchCount: 1,
      knockoutStageIsPublic: true,
      preliminaryStandingsMode: "GROUPS",
      preliminaryStandingsLabel: "Fase a gironi",
    },
    matches: [buildMatch()],
    standings: [],
    groupStandings: [],
    ...overrides,
  };
}

test("format-date helpers accept valid Date and ISO string values", () => {
  const date = new Date("2026-07-16T20:30:00.000Z");

  assert.equal(formatDateLabel(date), formatDateLabel(date.toISOString()));
  assert.equal(formatDateTimeLabel(date), formatDateTimeLabel(date.toISOString()));
  assert.equal(formatDateInputValue(date), "2026-07-16");
  assert.equal(formatDateTimeInputValue(date), "2026-07-16T20:30");
  assert.equal(formatTimeInputValue(date), "20:30");
});

test("format-date helpers fall back safely for null, undefined, and invalid strings", () => {
  assert.equal(formatDateLabel(null), "Data da definire");
  assert.equal(formatDateLabel(undefined), "Data da definire");
  assert.equal(formatDateLabel("not-a-date"), "Data da definire");
  assert.equal(formatDateTimeLabel("not-a-date"), "Data da definire");
  assert.equal(formatDateInputValue("not-a-date"), "");
  assert.equal(formatDateTimeInputValue(undefined), "");
  assert.equal(formatTimeInputValue(null), "");
});

test("public live-state transport serializes dates as strings", () => {
  const state = buildState();
  const transport = serializePublicTournamentLiveState(state);

  assert.equal(typeof transport.generatedAt, "string");
  assert.equal(transport.matches[0]?.startsAt, "2026-07-16T20:30:00.000Z");
  assert.equal(transport.matches[0]?.liveStartedAt, "2026-07-16T20:32:00.000Z");
  assert.equal(transport.matches[0]?.lastScoreUpdatedAt, "2026-07-16T20:35:00.000Z");
});

test("public live-state normalization converts serialized JSON dates back into Date objects", () => {
  const state = buildState();
  const jsonPayload = JSON.parse(
    JSON.stringify(serializePublicTournamentLiveState(state)),
  ) as PublicTournamentLiveStateTransport;

  const normalized = normalizePublicTournamentLiveState(jsonPayload);

  assert.ok(normalized.generatedAt instanceof Date);
  assert.ok(normalized.matches[0]?.startsAt instanceof Date);
  assert.ok(normalized.matches[0]?.liveStartedAt instanceof Date);
  assert.ok(normalized.matches[0]?.lastScoreUpdatedAt instanceof Date);
  assert.equal(normalized.matches[0]?.startsAt?.toISOString(), "2026-07-16T20:30:00.000Z");
});

test("public live-state normalization preserves null and invalid transport dates as null", () => {
  const normalized = normalizePublicTournamentLiveState({
    generatedAt: "invalid-date",
    tournament: buildState().tournament,
    matches: [
      {
        ...buildMatch({
          startsAt: null,
          endsAt: null,
          liveStartedAt: null,
          finishedAt: null,
          lastScoreUpdatedAt: null,
        }),
        startsAt: "bad-date",
        endsAt: null,
        liveStartedAt: undefined as unknown as string | null,
        finishedAt: "also-bad",
        lastScoreUpdatedAt: null,
      },
    ],
    standings: [],
    groupStandings: [],
  });

  assert.equal(normalized.matches[0]?.startsAt, null);
  assert.equal(normalized.matches[0]?.endsAt, null);
  assert.equal(normalized.matches[0]?.liveStartedAt, null);
  assert.equal(normalized.matches[0]?.finishedAt, null);
  assert.equal(normalized.matches[0]?.lastScoreUpdatedAt, null);
});
