import assert from "node:assert/strict";
import test from "node:test";

import { setTournamentPreliminaryStandingsScope } from "@/features/tournaments/server/preliminary-standings-scope-actions";

type MockTournament = {
  id: string;
  slug: string;
  stages: Array<{
    id: string;
    type: "GROUP_STAGE" | "KNOCKOUT_STAGE";
    configuration: Record<string, unknown> | null;
  }>;
};

function createPersistenceClient(overrides: Partial<{
  tournament: MockTournament | null;
  knockoutMatches: Array<{
    id: string;
    homeParticipantSourceType: "GROUP_POSITION" | null;
    awayParticipantSourceType: "GROUP_POSITION" | null;
    homeSourceGroupId: string | null;
    awaySourceGroupId: string | null;
  }>;
}> = {}) {
  const calls = {
    matchFindMany: 0,
    stageUpdates: [] as Array<{ where: { id: string }; data: { configuration: Record<string, unknown> } }>,
  };

  const tournament =
    overrides.tournament ??
    {
      id: "tournament-1",
      slug: "coppa-reghinna-minor-2026",
      stages: [
        {
          id: "stage-preliminary",
          type: "GROUP_STAGE",
          configuration: {
            helperText: "keep-me",
          },
        },
        {
          id: "stage-knockout",
          type: "KNOCKOUT_STAGE",
          configuration: {
            pairingRule: "CROSS_ADJACENT_GROUPS",
          },
        },
      ],
    };

  return {
    calls,
    client: {
      tournament: {
        findUnique: async () => tournament,
      },
      match: {
        findMany: async () => {
          calls.matchFindMany += 1;
          return overrides.knockoutMatches ?? [];
        },
      },
      tournamentStage: {
        update: async (input: { where: { id: string }; data: { configuration: Record<string, unknown> } }) => {
          calls.stageUpdates.push(input);
          return {
            id: input.where.id,
          };
        },
      },
    },
  };
}

test("setting preliminary standings scope merges JSON without deleting existing properties", async () => {
  const { client, calls } = createPersistenceClient();

  const result = await setTournamentPreliminaryStandingsScope(
    {
      tournamentId: "ck12345678901234567890123",
      tournamentSlug: "coppa-reghinna-minor-2026",
      standingsScope: "GROUPS",
    },
    client as never,
  );

  assert.equal(result.tournamentSlug, "coppa-reghinna-minor-2026");
  assert.equal(calls.matchFindMany, 0);
  assert.deepEqual(calls.stageUpdates, [
    {
      where: { id: "stage-preliminary" },
      data: {
        configuration: {
          helperText: "keep-me",
          standingsScope: "GROUPS",
        },
      },
    },
  ]);
});

test("global preliminary standings are rejected when knockout sources still point to specific groups", async () => {
  const { client, calls } = createPersistenceClient({
    knockoutMatches: [
      {
        id: "qf-1",
        homeParticipantSourceType: "GROUP_POSITION",
        awayParticipantSourceType: null,
        homeSourceGroupId: "group-a",
        awaySourceGroupId: null,
      },
    ],
  });

  await assert.rejects(
    () =>
      setTournamentPreliminaryStandingsScope(
        {
          tournamentId: "ck12345678901234567890123",
          tournamentSlug: "coppa-reghinna-minor-2026",
          standingsScope: "GLOBAL",
        },
        client as never,
      ),
    /fase finale usa posizioni di girone già generate/i,
  );
  assert.equal(calls.matchFindMany, 1);
  assert.equal(calls.stageUpdates.length, 0);
});

test("the setting can still be updated after matches exist when no grouped knockout sources block it", async () => {
  const { client, calls } = createPersistenceClient({
    knockoutMatches: [
      {
        id: "qf-1",
        homeParticipantSourceType: "GROUP_POSITION",
        awayParticipantSourceType: "GROUP_POSITION",
        homeSourceGroupId: null,
        awaySourceGroupId: null,
      },
    ],
  });

  await setTournamentPreliminaryStandingsScope(
    {
      tournamentId: "ck12345678901234567890123",
      tournamentSlug: "coppa-reghinna-minor-2026",
      standingsScope: "GLOBAL",
    },
    client as never,
  );

  assert.equal(calls.matchFindMany, 1);
  assert.equal(calls.stageUpdates.length, 1);
  assert.equal(calls.stageUpdates[0]?.data.configuration.standingsScope, "GLOBAL");
});
