import { z } from "zod";

export const manageTournamentCompetitionStructureSchema = z.object({
  tournamentId: z.string().cuid(),
  tournamentSlug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  confirmation: z.string().trim().optional().or(z.literal("")),
  replacementMode: z
    .enum(["BLOCK_ON_EXISTING", "REPLACE_MANAGED_SCHEDULED", "REPLACE_LEGACY_SCHEDULED"])
    .optional()
    .default("BLOCK_ON_EXISTING"),
});

export type ManageTournamentCompetitionStructureInput = z.infer<
  typeof manageTournamentCompetitionStructureSchema
>;
