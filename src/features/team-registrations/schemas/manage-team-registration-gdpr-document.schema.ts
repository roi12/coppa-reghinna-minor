import { z } from "zod";

export const manageTeamRegistrationGdprDocumentSchema = z.object({
  tournamentSlug: z.string().trim().min(1, "Torneo non valido."),
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Link privato non valido."),
});
