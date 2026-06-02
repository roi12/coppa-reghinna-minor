import { z } from "zod";

import { teamRegistrationPlayerSchema } from "@/features/team-registrations/schemas/team-registration-player.schema";

const optionalTrimmedString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, schema.optional());

export const submitTeamRegistrationSchema = z
  .object({
    tournamentId: z.string().cuid("Seleziona un torneo valido."),
    captainFirstName: z
      .string()
      .trim()
      .min(1, "Il nome del capitano è obbligatorio.")
      .max(80, "Il nome del capitano deve avere al massimo 80 caratteri."),
    captainLastName: z
      .string()
      .trim()
      .min(1, "Il cognome del capitano è obbligatorio.")
      .max(80, "Il cognome del capitano deve avere al massimo 80 caratteri."),
    captainEmail: z
      .string()
      .trim()
      .email("L'email del capitano deve essere valida.")
      .max(120, "L'email del capitano deve avere al massimo 120 caratteri."),
    captainPhone: z
      .string()
      .trim()
      .min(7, "Il telefono del capitano è obbligatorio.")
      .max(40, "Il telefono del capitano deve avere al massimo 40 caratteri."),
    teamName: z
      .string()
      .trim()
      .min(2, "Il nome della squadra è obbligatorio.")
      .max(120, "Il nome della squadra deve avere al massimo 120 caratteri."),
    notes: optionalTrimmedString(z.string().max(500, "Le note devono avere al massimo 500 caratteri.")),
    players: z
      .array(teamRegistrationPlayerSchema)
      .min(5, "L'iscrizione deve includere almeno 5 giocatori.")
      .max(11, "L'iscrizione può includere al massimo 11 giocatori."),
  })
  .superRefine((data, context) => {
    const jerseyNumbers = new Set<string>();

    for (const [index, player] of data.players.entries()) {
      const normalizedJerseyNumber = player.jerseyNumber.trim().toLowerCase();

      if (jerseyNumbers.has(normalizedJerseyNumber)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "I numeri maglia devono essere unici nella stessa iscrizione.",
          path: ["players", index, "jerseyNumber"],
        });
      }

      jerseyNumbers.add(normalizedJerseyNumber);
    }
  });

export type SubmitTeamRegistrationInput = z.infer<typeof submitTeamRegistrationSchema>;
