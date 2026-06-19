import { z } from "zod";

export function readRequiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function readAssignmentFieldValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""));
}

export function readGroupAssignmentsFromFormData(formData: FormData) {
  const tournamentTeamIds = readAssignmentFieldValues(formData, "tournamentTeamId");

  return tournamentTeamIds.map((tournamentTeamId) => {
    const groupId = readRequiredFormValue(formData, `assignmentGroupId:${tournamentTeamId}`);
    const groupSlot = readRequiredFormValue(formData, `assignmentGroupSlot:${tournamentTeamId}`);

    return {
      tournamentTeamId,
      groupId,
      groupSlot: groupId.trim().length === 0 ? null : groupSlot,
    };
  });
}

export function getGroupAssignmentValidationMessage(error: z.ZodError) {
  const issue = error.issues[0];

  if (!issue) {
    return "Enter valid group assignments.";
  }

  const assignmentIndex = issue.path.find((segment) => typeof segment === "number");

  if (typeof assignmentIndex === "number") {
    return `Team ${assignmentIndex + 1}: ${issue.message}`;
  }

  return issue.message;
}
