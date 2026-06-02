import { z } from "zod";

import { tournamentFormatSchema } from "@/features/tournaments/schemas/tournament-format.schema";
import { tournamentStatusSchema } from "@/features/tournaments/schemas/tournament-status.schema";

export const updateTournamentSchema = z.object({
  tournamentId: z.string().cuid(),
  currentSlug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  organizationId: z.string().cuid(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  sport: z.string().trim().min(2).max(60),
  seasonLabel: z.string().trim().min(2).max(80),
  format: tournamentFormatSchema,
  locationLabel: z.string().trim().max(120).optional().or(z.literal("")),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  status: tournamentStatusSchema,
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
