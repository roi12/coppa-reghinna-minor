import assert from "node:assert/strict";
import test from "node:test";

import { getMatchParticipantValidationError } from "@/features/matches/server/match-result-guards";

test("unresolved matches are rejected for result entry", () => {
  assert.equal(
    getMatchParticipantValidationError({ homeTeamId: null, awayTeamId: null }),
    "La partita deve avere entrambe le squadre assegnate prima di registrare un risultato o marcarla come live.",
  );
});

test("partially resolved matches are rejected for result entry", () => {
  assert.equal(
    getMatchParticipantValidationError({ homeTeamId: "team-1", awayTeamId: null }),
    "La partita deve avere entrambe le squadre assegnate prima di registrare un risultato o marcarla come live.",
  );
});

test("fully resolved matches are accepted for result entry", () => {
  assert.equal(
    getMatchParticipantValidationError({ homeTeamId: "team-1", awayTeamId: "team-2" }),
    null,
  );
});

test("the same team cannot occupy both sides", () => {
  assert.equal(
    getMatchParticipantValidationError({ homeTeamId: "team-1", awayTeamId: "team-1" }),
    "La partita deve avere due squadre diverse prima di registrare un risultato o marcarla come live.",
  );
});

