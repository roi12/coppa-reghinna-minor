import { z } from "zod";

export const reviewTeamRegistrationSchema = z.object({
  registrationId: z.string().cuid("Choose a valid registration."),
  tournamentSlug: z.string().trim().min(1, "Choose a valid tournament."),
});

export type ReviewTeamRegistrationInput = z.infer<typeof reviewTeamRegistrationSchema>;
