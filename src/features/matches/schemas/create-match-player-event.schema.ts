import { z } from "zod";

import { entityIdSchema } from "@/lib/schemas/entity-id";

export const createMatchPlayerEventSchema = z
  .object({
    type: z.enum(["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"]),
    teamId: entityIdSchema,
    awardedTeamId: entityIdSchema.nullable().optional(),
    playerId: entityIdSchema.nullable().optional(),
    expectedScoreVersion: z.coerce.number().int().min(0).optional(),
    matchMinute: z.coerce.number().int().min(0).max(200).nullable().optional(),
  })
  .superRefine((value, context) => {
    if ((value.type === "GOAL" || value.type === "OWN_GOAL") && typeof value.expectedScoreVersion !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedScoreVersion"],
        message: "Goal events require the current score version.",
      });
    }

    if ((value.type === "YELLOW_CARD" || value.type === "RED_CARD") && !value.playerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerId"],
        message: "Card events require a selected player.",
      });
    }
  });

export const reconcileMissingGoalsSchema = z.object({
  teamId: entityIdSchema,
});

export type CreateMatchPlayerEventInput = z.infer<typeof createMatchPlayerEventSchema>;
export type ReconcileMissingGoalsInput = z.infer<typeof reconcileMissingGoalsSchema>;
