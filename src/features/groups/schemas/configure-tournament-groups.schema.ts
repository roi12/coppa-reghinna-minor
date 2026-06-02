import { z } from "zod";

export const configureTournamentGroupsSchema = z.object({
  tournamentId: z.string().trim().min(1),
  tournamentSlug: z.string().trim().min(1),
  groupCount: z.coerce.number().int().min(2),
});

export type ConfigureTournamentGroupsInput = z.infer<typeof configureTournamentGroupsSchema>;
