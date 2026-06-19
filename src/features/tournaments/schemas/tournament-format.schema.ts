import { z } from "zod";

import {
  PERSISTED_TOURNAMENT_FORMAT_VALUES,
  TOURNAMENT_FORMAT_VALUES,
} from "@/features/tournaments/types/tournament-format.types";

export const tournamentFormatSchema = z.enum(TOURNAMENT_FORMAT_VALUES);
export const persistedTournamentFormatSchema = z.enum(PERSISTED_TOURNAMENT_FORMAT_VALUES);

export const tournamentScheduleSlotSchema = z.object({
  sequence: z.number().int().min(1),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  durationMinutes: z.number().int().min(15).max(24 * 60),
});

export const groupStageConfigurationSchema = z.object({
  type: z.literal("GROUP_STAGE"),
  name: z.string().trim().min(1).max(80),
  order: z.number().int().min(1),
  groupCount: z.number().int().min(1),
  teamsPerGroup: z.number().int().min(2),
  legs: z.number().int().min(1).max(4),
  qualifiersPerGroup: z.number().int().min(1),
  stageBreakDaysAfter: z.number().int().min(0).max(365),
});

export const knockoutStageConfigurationSchema = z.object({
  type: z.literal("KNOCKOUT_STAGE"),
  name: z.string().trim().min(1).max(80),
  order: z.number().int().min(1),
  knockoutTeamCount: z.number().int().min(2),
  knockoutRound: z.enum([
    "ROUND_OF_32",
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "FINAL",
    "THIRD_PLACE",
  ]),
  includeThirdPlaceMatch: z.boolean(),
  stageBreakDaysAfter: z.number().int().min(0).max(365),
  pairingRule: z.string().trim().min(1).max(120).nullable(),
});

export const tournamentStageConfigurationSchema = z.discriminatedUnion("type", [
  groupStageConfigurationSchema,
  knockoutStageConfigurationSchema,
]);

export const tournamentCompetitionSettingsSchema = z.object({
  expectedTeamCount: z.number().int().min(2).nullable(),
  scheduleStartDate: z.date().nullable(),
  scheduleMaxMatchesPerDay: z.number().int().min(1).max(32).nullable(),
  scheduleMinimumRestDays: z.number().int().min(0).max(365).nullable(),
  scheduleSlots: z.array(tournamentScheduleSlotSchema),
  stages: z.array(tournamentStageConfigurationSchema),
});

export type TournamentFormatInput = z.infer<typeof tournamentFormatSchema>;
export type PersistedTournamentFormatInput = z.infer<typeof persistedTournamentFormatSchema>;
export type TournamentScheduleSlotInput = z.infer<typeof tournamentScheduleSlotSchema>;
export type GroupStageConfigurationInput = z.infer<typeof groupStageConfigurationSchema>;
export type KnockoutStageConfigurationInput = z.infer<typeof knockoutStageConfigurationSchema>;
export type TournamentStageConfigurationInput = z.infer<typeof tournamentStageConfigurationSchema>;
export type TournamentCompetitionSettingsInput = z.infer<typeof tournamentCompetitionSettingsSchema>;
