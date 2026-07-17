import { z } from "zod";

export const updateMatchPlayerEventSchema = z.object({
  playerId: z.string().cuid().nullable().optional(),
  type: z.enum(["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"]).optional(),
  matchMinute: z.coerce.number().int().min(0).max(200).nullable().optional(),
});

export const voidMatchPlayerEventSchema = z.object({
  expectedScoreVersion: z.coerce.number().int().min(0).optional(),
});

export type UpdateMatchPlayerEventInput = z.infer<typeof updateMatchPlayerEventSchema>;
export type VoidMatchPlayerEventInput = z.infer<typeof voidMatchPlayerEventSchema>;
