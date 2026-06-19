import assert from "node:assert/strict";
import test from "node:test";

import { buildGroupDistributionPlan } from "@/features/groups/utils/build-group-distribution-plan";

test("auto-assigning 16 teams into 4 groups produces 4 unique slots per group", () => {
  const teams = Array.from({ length: 16 }, (_, index) => ({
    tournamentTeamId: `tt-${index + 1}`,
    teamId: `team-${index + 1}`,
    teamName: `Team ${index + 1}`,
    seed: index + 1,
    createdAt: new Date(Date.UTC(2026, 0, index + 1)),
  }));

  const plan = buildGroupDistributionPlan(teams, 4);

  assert.equal(plan.groups.length, 4);

  for (const group of plan.groups) {
    assert.equal(group.teams.length, 4);
    assert.deepEqual(
      group.teams.map((assignment) => assignment.groupSlot).sort((left, right) => left - right),
      [1, 2, 3, 4],
    );
  }
});
