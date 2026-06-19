import assert from "node:assert/strict";
import test from "node:test";

import { deriveTournamentFormatFromPersistedStages } from "@/features/tournaments/server/tournament-competition";

test("dashboard settings loader prefers persisted grouped knockout stages over legacy format", () => {
  const format = deriveTournamentFormatFromPersistedStages(
    [
      {
        id: "stage-groups",
        order: 1,
        type: "GROUP_STAGE",
        name: "Fase a gironi",
        groupCount: 4,
        teamsPerGroup: 4,
        legs: 1,
        qualifiersPerGroup: 2,
        knockoutTeamCount: null,
        knockoutRound: null,
        includeThirdPlaceMatch: null,
        stageBreakDaysAfter: 0,
        configuration: null,
      },
      {
        id: "stage-knockout",
        order: 2,
        type: "KNOCKOUT_STAGE",
        name: "Fase finale",
        groupCount: null,
        teamsPerGroup: null,
        legs: null,
        qualifiersPerGroup: null,
        knockoutTeamCount: 8,
        knockoutRound: "QUARTER_FINAL",
        includeThirdPlaceMatch: false,
        stageBreakDaysAfter: 0,
        configuration: { pairingRule: "CROSS_ADJACENT_GROUPS" },
      },
    ],
    "ROUND_ROBIN",
  );

  assert.equal(format, "GROUPS_THEN_KNOCKOUT");
});

test("dashboard settings loader falls back to legacy format only when no stages exist", () => {
  assert.equal(deriveTournamentFormatFromPersistedStages([], "GROUPS_PLUS_KNOCKOUT"), "GROUPS_THEN_KNOCKOUT");
  assert.equal(deriveTournamentFormatFromPersistedStages([], "ROUND_ROBIN"), "SINGLE_ROUND_ROBIN");
});
