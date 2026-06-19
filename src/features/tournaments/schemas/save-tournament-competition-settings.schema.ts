import { z } from "zod";

import { tournamentFormatSchema } from "@/features/tournaments/schemas/tournament-format.schema";

const optionalPositiveInteger = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  },
  z.coerce.number().int().positive().nullable(),
);

const optionalNonNegativeInteger = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  },
  z.coerce.number().int().min(0).nullable(),
);

export const saveTournamentCompetitionSettingsSchema = z
  .object({
    tournamentId: z.string().cuid(),
    tournamentSlug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
    format: tournamentFormatSchema,
    expectedTeamCount: optionalPositiveInteger,
    groupCount: optionalPositiveInteger,
    teamsPerGroup: optionalPositiveInteger,
    legs: optionalPositiveInteger,
    qualifiersPerGroup: optionalNonNegativeInteger,
    knockoutTeamCount: optionalPositiveInteger,
    knockoutRound: z.preprocess(
      (value) => {
        if (value === null || value === undefined || value === "") {
          return null;
        }

        return value;
      },
      z
        .enum(["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL", "THIRD_PLACE"])
        .nullable(),
    ),
    includeThirdPlaceMatch: z.preprocess(
      (value) => value === "on" || value === true,
      z.boolean(),
    ),
    pairingRule: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : null;
      },
      z.string().min(1).max(120).nullable(),
    ),
    scheduleStartDate: z.preprocess(
      (value) => {
        if (typeof value !== "string" || value.trim().length === 0) {
          return null;
        }

        return new Date(value);
      },
      z.date().nullable(),
    ),
    scheduleMaxMatchesPerDay: optionalPositiveInteger,
    scheduleMinimumRestDays: optionalNonNegativeInteger,
    slotTimes: z.string().trim().min(1),
    slotDurationMinutes: optionalPositiveInteger,
  })
  .superRefine((data, context) => {
    const groupedFormat =
      data.format === "GROUPS_ONLY" || data.format === "GROUPS_THEN_KNOCKOUT";

    if (groupedFormat) {
      if (!data.groupCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groupCount"],
          message: "Group count is required for grouped tournaments.",
        });
      }

      if (!data.teamsPerGroup) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamsPerGroup"],
          message: "Teams per group is required for grouped tournaments.",
        });
      }

      if (!data.legs) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legs"],
          message: "Leg count is required for grouped tournaments.",
        });
      }
    }

    if (data.format === "GROUPS_THEN_KNOCKOUT" || data.format === "KNOCKOUT_ONLY") {
      if (!data.knockoutTeamCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["knockoutTeamCount"],
          message: "Knockout entry size is required.",
        });
      }

      if (!data.knockoutRound) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["knockoutRound"],
          message: "Knockout starting round is required.",
        });
      }
    }
  });

export type SaveTournamentCompetitionSettingsInput = z.infer<
  typeof saveTournamentCompetitionSettingsSchema
>;
