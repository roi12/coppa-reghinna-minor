import { z } from "zod";

import { isFutsalPlayerRole } from "@/features/team-registrations/constants/futsal-player-roles";

const optionalTrimmedString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, schema.optional());

export const teamRegistrationPlayerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Il nome del giocatore è obbligatorio.")
    .max(80, "Il nome del giocatore deve avere al massimo 80 caratteri."),
  lastName: z
    .string()
    .trim()
    .min(1, "Il cognome del giocatore è obbligatorio.")
    .max(80, "Il cognome del giocatore deve avere al massimo 80 caratteri."),
  jerseyNumber: z
    .string()
    .trim()
    .min(1, "Il numero maglia è obbligatorio.")
    .regex(/^\d{1,2}$/, "Il numero di maglia deve essere compreso tra 0 e 99.")
    .refine((value) => Number(value) >= 0 && Number(value) <= 99, {
      message: "Il numero di maglia deve essere compreso tra 0 e 99.",
    }),
  role: optionalTrimmedString(
    z.string().refine((value) => isFutsalPlayerRole(value), {
      message: "Seleziona un ruolo valido.",
    }),
  ),
  sortOrder: z
    .number()
    .int("L'ordine dei giocatori deve essere un numero intero.")
    .min(0, "L'ordine dei giocatori non può essere negativo."),
});

export type TeamRegistrationPlayerInput = z.infer<typeof teamRegistrationPlayerSchema>;
