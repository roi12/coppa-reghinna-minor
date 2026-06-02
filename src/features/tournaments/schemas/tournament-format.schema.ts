import { z } from "zod";

import { TOURNAMENT_FORMAT_VALUES } from "@/features/tournaments/types/tournament-format.types";

export const tournamentFormatSchema = z.enum(TOURNAMENT_FORMAT_VALUES);

export const knockoutRoundSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  sequence: z.number().int().min(1),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  expectedMatchCount: z.number().int().min(1),
});

export const knockoutBracketSchema = z.object({
  format: z.literal("KNOCKOUT"),
  thirdPlaceMatch: z.boolean(),
  rounds: z.array(knockoutRoundSchema),
  seedingNotes: z.array(z.string().trim().min(1).max(160)),
});

export const groupStageSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  teamCount: z.number().int().min(2),
  qualifierCount: z.number().int().min(1),
});

export const knockoutQualificationRuleSchema = z.object({
  sourceGroupId: z.string().trim().min(1),
  finishingPosition: z.number().int().min(1),
  bracketSlotLabel: z.string().trim().min(1).max(40),
});

export const groupsPlusKnockoutSchema = z.object({
  format: z.literal("GROUPS_PLUS_KNOCKOUT"),
  groups: z.array(groupStageSchema),
  knockoutRounds: z.array(knockoutRoundSchema),
  qualificationRules: z.array(knockoutQualificationRuleSchema),
});

export type TournamentFormatInput = z.infer<typeof tournamentFormatSchema>;
export type KnockoutBracketInput = z.infer<typeof knockoutBracketSchema>;
export type GroupsPlusKnockoutInput = z.infer<typeof groupsPlusKnockoutSchema>;
