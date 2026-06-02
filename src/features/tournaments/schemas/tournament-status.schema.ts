import { z } from "zod";

export const tournamentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]);

export type TournamentStatusInput = z.infer<typeof tournamentStatusSchema>;
