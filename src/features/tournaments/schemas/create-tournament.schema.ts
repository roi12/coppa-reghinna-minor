import { z } from "zod";

import { tournamentFormatSchema } from "@/features/tournaments/schemas/tournament-format.schema";

export const createTournamentSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  sport: z.string().trim().min(2).max(60),
  seasonLabel: z.string().trim().min(2).max(80),
  format: tournamentFormatSchema,
  locationLabel: z.string().trim().max(120).optional().or(z.literal("")),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
