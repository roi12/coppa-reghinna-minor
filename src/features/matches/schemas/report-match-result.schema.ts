import { z } from "zod";

const optionalScoreSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.number().int().min(0).optional());

export const reportMatchResultSchema = z.object({
  matchId: z.string().cuid(),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]),
  homeScore: optionalScoreSchema,
  awayScore: optionalScoreSchema,
}).superRefine((value, context) => {
  if (value.status === "FINISHED") {
    if (typeof value.homeScore !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeScore"],
        message: "Home score is required for a completed match.",
      });
    }

    if (typeof value.awayScore !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["awayScore"],
        message: "Away score is required for a completed match.",
      });
    }
  }

});

export type ReportMatchResultInput = z.infer<typeof reportMatchResultSchema>;
