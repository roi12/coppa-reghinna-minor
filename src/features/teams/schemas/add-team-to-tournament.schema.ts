import { z } from "zod";

export const addTeamToTournamentSchema = z.object({
  tournamentId: z.string().cuid(),
  teamId: z.string().cuid(),
});

export type AddTeamToTournamentInput = z.infer<typeof addTeamToTournamentSchema>;
