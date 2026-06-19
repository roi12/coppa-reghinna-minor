import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultTournamentStageVisibility,
  getKnockoutStageVisibilityState,
} from "@/features/tournaments/server/tournament-stage-visibility";

test("generated group stage is public by default", () => {
  assert.equal(getDefaultTournamentStageVisibility("GROUP_STAGE"), true);
});

test("generated knockout stage is hidden by default", () => {
  assert.equal(getDefaultTournamentStageVisibility("KNOCKOUT_STAGE"), false);
});

test("final phase visibility state targets only knockout stages", () => {
  const visibility = getKnockoutStageVisibilityState([
    {
      id: "stage-groups",
      type: "GROUP_STAGE",
      isPublic: true,
    },
    {
      id: "stage-knockout",
      type: "KNOCKOUT_STAGE",
      isPublic: false,
    },
  ]);

  assert.equal(visibility.groupStageIsPublic, true);
  assert.equal(visibility.knockoutStageIsPublic, false);
  assert.deepEqual(visibility.knockoutStageIds, ["stage-knockout"]);
});
