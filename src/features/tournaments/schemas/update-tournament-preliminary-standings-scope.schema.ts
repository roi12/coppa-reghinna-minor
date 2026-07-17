import { z } from "zod";

import { PRELIMINARY_STANDINGS_SCOPES } from "@/features/standings/server/preliminary-standings";

export const updateTournamentPreliminaryStandingsScopeSchema = z.object({
  tournamentId: z.string().cuid(),
  tournamentSlug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  standingsScope: z.enum(PRELIMINARY_STANDINGS_SCOPES),
});

export type UpdateTournamentPreliminaryStandingsScopeInput = z.infer<
  typeof updateTournamentPreliminaryStandingsScopeSchema
>;
