import { z } from "zod";

function emptyStringToNull(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return value;
}

const tournamentGroupAssignmentSchema = z.object({
  tournamentTeamId: z.string().trim().min(1),
  groupId: z.preprocess(emptyStringToNull, z.string().trim().min(1).nullable()),
  groupSlot: z.preprocess(
    emptyStringToNull,
    z.coerce.number().int().min(1).nullable(),
  ),
});

export const saveTournamentGroupAssignmentsSchema = z
  .object({
    tournamentId: z.string().trim().min(1),
    tournamentSlug: z.string().trim().min(1),
    assignments: z.array(tournamentGroupAssignmentSchema).min(1),
  })
  .superRefine(({ assignments }, context) => {
    const seenTournamentTeamIds = new Set<string>();
    const seenGroupSlots = new Set<string>();

    assignments.forEach((assignment, index) => {
      if (seenTournamentTeamIds.has(assignment.tournamentTeamId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignments", index, "tournamentTeamId"],
          message: "Each tournament team can only be assigned once.",
        });
      } else {
        seenTournamentTeamIds.add(assignment.tournamentTeamId);
      }

      if (!assignment.groupId) {
        return;
      }

      if (assignment.groupSlot === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignments", index, "groupSlot"],
          message: "Assigned teams must include a slot number.",
        });

        return;
      }

      const groupSlotKey = `${assignment.groupId}:${assignment.groupSlot}`;

      if (seenGroupSlots.has(groupSlotKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignments", index, "groupSlot"],
          message: "Group slots must be unique within each group.",
        });
      } else {
        seenGroupSlots.add(groupSlotKey);
      }
    });
  });

export type SaveTournamentGroupAssignmentsInput = z.infer<
  typeof saveTournamentGroupAssignmentsSchema
>;
