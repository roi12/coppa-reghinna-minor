import { z } from "zod";

export const updateLiveMatchSchema = z
  .object({
    action: z.enum([
      "start",
      "finish",
      "return_to_scheduled",
      "postpone",
      "cancel",
      "reopen",
      "increment_home",
      "increment_away",
      "decrement_home",
      "decrement_away",
      "set_score",
      "undo",
    ]),
    expectedScoreVersion: z.coerce.number().int().min(0),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
    confirmReopen: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "set_score") {
      if (typeof value.homeScore !== "number") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["homeScore"],
          message: "Home score is required for a direct score correction.",
        });
      }

      if (typeof value.awayScore !== "number") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["awayScore"],
          message: "Away score is required for a direct score correction.",
        });
      }
    }
  });

export type UpdateLiveMatchInput = z.infer<typeof updateLiveMatchSchema>;
