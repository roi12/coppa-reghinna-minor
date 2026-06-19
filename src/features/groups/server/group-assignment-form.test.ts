import assert from "node:assert/strict";
import test from "node:test";

import { saveTournamentGroupAssignmentsSchema } from "@/features/groups/schemas/save-tournament-group-assignments.schema";
import { readGroupAssignmentsFromFormData } from "@/features/groups/server/group-assignment-form";

function buildBaseFormData() {
  const formData = new FormData();
  formData.set("tournamentId", "cm0000000000000000000001");
  formData.set("tournamentSlug", "coppa-reghinna-minor-2026");

  return formData;
}

test("manual assignment payload with missing slot number is rejected", () => {
  const formData = buildBaseFormData();
  formData.append("tournamentTeamId", "tt-1");
  formData.set("assignmentGroupId:tt-1", "group-a");
  formData.set("assignmentGroupSlot:tt-1", "");

  const parsed = saveTournamentGroupAssignmentsSchema.safeParse({
    tournamentId: "cm0000000000000000000001",
    tournamentSlug: "coppa-reghinna-minor-2026",
    assignments: readGroupAssignmentsFromFormData(formData),
  });

  assert.equal(parsed.success, false);
});

test("manual assignment payload with duplicate slot number in the same group is rejected", () => {
  const parsed = saveTournamentGroupAssignmentsSchema.safeParse({
    tournamentId: "cm0000000000000000000001",
    tournamentSlug: "coppa-reghinna-minor-2026",
    assignments: [
      { tournamentTeamId: "tt-1", groupId: "group-a", groupSlot: "1" },
      { tournamentTeamId: "tt-2", groupId: "group-a", groupSlot: "1" },
    ],
  });

  assert.equal(parsed.success, false);
});

test("manual assignment payload with the same slot number in different groups is accepted", () => {
  const parsed = saveTournamentGroupAssignmentsSchema.safeParse({
    tournamentId: "cm0000000000000000000001",
    tournamentSlug: "coppa-reghinna-minor-2026",
    assignments: [
      { tournamentTeamId: "tt-1", groupId: "group-a", groupSlot: "1" },
      { tournamentTeamId: "tt-2", groupId: "group-b", groupSlot: "1" },
    ],
  });

  assert.equal(parsed.success, true);
});

test("row-keyed assignment form data keeps group and slot aligned per team", () => {
  const formData = buildBaseFormData();
  formData.append("tournamentTeamId", "tt-1");
  formData.append("tournamentTeamId", "tt-2");
  formData.set("assignmentGroupId:tt-1", "group-a");
  formData.set("assignmentGroupSlot:tt-1", "1");
  formData.set("assignmentGroupId:tt-2", "group-b");
  formData.set("assignmentGroupSlot:tt-2", "1");

  assert.deepEqual(readGroupAssignmentsFromFormData(formData), [
    { tournamentTeamId: "tt-1", groupId: "group-a", groupSlot: "1" },
    { tournamentTeamId: "tt-2", groupId: "group-b", groupSlot: "1" },
  ]);
});

test("group assignment reader ignores unrelated competition-setting fields", () => {
  const formData = buildBaseFormData();
  formData.append("tournamentTeamId", "tt-1");
  formData.set("assignmentGroupId:tt-1", "group-a");
  formData.set("assignmentGroupSlot:tt-1", "1");
  formData.set("format", "GROUPS_THEN_KNOCKOUT");
  formData.set("expectedTeamCount", "16");
  formData.set("slotTimes", "22:00, 23:00");

  assert.deepEqual(readGroupAssignmentsFromFormData(formData), [
    { tournamentTeamId: "tt-1", groupId: "group-a", groupSlot: "1" },
  ]);
});
