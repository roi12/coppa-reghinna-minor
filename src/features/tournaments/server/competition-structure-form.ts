import { manageTournamentCompetitionStructureSchema } from "@/features/tournaments/schemas/manage-tournament-competition-structure.schema";

export function extractManageCompetitionStructureFormInput(formData: FormData) {
  return {
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    confirmation: formData.get("confirmation") ?? "",
    replacementMode: formData.get("replacementMode"),
  };
}

export function validateManageCompetitionStructure(formData: FormData) {
  return manageTournamentCompetitionStructureSchema.safeParse(
    extractManageCompetitionStructureFormInput(formData),
  );
}
