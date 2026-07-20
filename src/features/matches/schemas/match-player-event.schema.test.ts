import assert from "node:assert/strict";
import test from "node:test";

import {
  createMatchPlayerEventSchema,
  reconcileMissingGoalsSchema,
} from "@/features/matches/schemas/create-match-player-event.schema";
import { updateMatchPlayerEventSchema } from "@/features/matches/schemas/update-match-player-event.schema";

const cuidTeamId = "cmczu7k7r0000x8a1p0v7z9q2";
const cuidPlayerId = "cmczu7k7r0001x8a1v5p3n4m6";
const uuidTeamId = "480273d9-9899-4b6a-8569-f30af4fa1a97";
const uuidPlayerId = "5d8c3a3b-3f38-498a-a7ae-70e5a19d5104";

test("create match player event schema accepts cuid identifiers", () => {
  const parsed = createMatchPlayerEventSchema.safeParse({
    type: "GOAL",
    teamId: cuidTeamId,
    awardedTeamId: cuidTeamId,
    playerId: cuidPlayerId,
    expectedScoreVersion: 3,
  });

  assert.equal(parsed.success, true);
});

test("create match player event schema accepts uuid identifiers", () => {
  const parsed = createMatchPlayerEventSchema.safeParse({
    type: "GOAL",
    teamId: uuidTeamId,
    awardedTeamId: uuidTeamId,
    playerId: uuidPlayerId,
    expectedScoreVersion: 3,
  });

  assert.equal(parsed.success, true);
});

test("reconcile and update event schemas accept uuid identifiers", () => {
  const reconcileParsed = reconcileMissingGoalsSchema.safeParse({
    teamId: uuidTeamId,
  });
  const updateParsed = updateMatchPlayerEventSchema.safeParse({
    playerId: uuidPlayerId,
  });

  assert.equal(reconcileParsed.success, true);
  assert.equal(updateParsed.success, true);
});

test("event schemas still reject malformed identifiers", () => {
  const parsed = createMatchPlayerEventSchema.safeParse({
    type: "GOAL",
    teamId: "not-an-id",
    awardedTeamId: "also-not-an-id",
    playerId: "still-not-an-id",
    expectedScoreVersion: 3,
  });

  assert.equal(parsed.success, false);
});
