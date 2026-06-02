import { z } from "zod";

export const createMatchSchema = z.object({
  tournamentId: z.string().cuid(),
  homeTeamId: z.string().cuid(),
  awayTeamId: z.string().cuid(),
  roundLabel: z.string().trim().max(80).optional().or(z.literal("")),
  startsAt: z.coerce.date().optional(),
  locationLabel: z.string().trim().max(120).optional().or(z.literal("")),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
