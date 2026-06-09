import { z } from "zod";

export const manageTeamRegistrationPlayerDocumentSchema = z.object({
  tournamentSlug: z.string().trim().min(1, "Torneo non valido."),
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Link privato non valido."),
  playerId: z.string().trim().min(1, "Giocatore non valido."),
});
