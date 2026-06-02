import { z } from "zod";

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
    .max(10, "Il numero maglia deve avere al massimo 10 caratteri.")
    .regex(/^[1-9]\d*$/, "Il numero maglia deve essere un intero positivo."),
  role: optionalTrimmedString(z.string().max(80, "Il ruolo deve avere al massimo 80 caratteri.")),
  sortOrder: z
    .number()
    .int("L'ordine dei giocatori deve essere un numero intero.")
    .min(0, "L'ordine dei giocatori non può essere negativo."),
});

export type TeamRegistrationPlayerInput = z.infer<typeof teamRegistrationPlayerSchema>;
