import type {
  KnockoutRoundValue,
  TournamentFormatValue,
  TournamentStageTypeValue,
} from "@/features/tournaments/types/tournament-format.types";

export type CompetitionTeamInput = {
  tournamentTeamId: string;
  teamId: string;
  teamName: string;
  seed: number | null;
  createdAt: Date;
};

export type CompetitionGroupAssignment = CompetitionTeamInput & {
  groupId: string;
  groupName: string;
  groupSequence: number;
  groupSlot: number;
};

export type CompetitionStageDefinition =
  | {
      stageId: string;
      type: "GROUP_STAGE";
      order: number;
      name: string;
      groupCount: number;
      teamsPerGroup: number;
      legs: number;
      qualifiersPerGroup: number;
      stageBreakDaysAfter: number;
    }
  | {
      stageId: string;
      type: "KNOCKOUT_STAGE";
      order: number;
      name: string;
      knockoutTeamCount: number;
      knockoutRound: KnockoutRoundValue;
      includeThirdPlaceMatch: boolean;
      stageBreakDaysAfter: number;
      pairingRule: string | null;
    };

export type CompetitionParticipantSource =
  | {
      type: "DIRECT_TEAM";
      teamId: string;
      label: string;
    }
  | {
      type: "GROUP_POSITION";
      groupId: string;
      groupName: string;
      position: number;
      label: string;
    }
  | {
      type: "MATCH_WINNER";
      matchKey: string;
      label: string;
    }
  | {
      type: "MATCH_LOSER";
      matchKey: string;
      label: string;
    };

export type CompetitionMatchDefinition = {
  key: string;
  format: TournamentFormatValue;
  stageId: string;
  stageOrder: number;
  stageType: TournamentStageTypeValue;
  stageName: string;
  groupId: string | null;
  groupName: string | null;
  knockoutRound: KnockoutRoundValue | null;
  roundNumber: number;
  sequence: number;
  roundLabel: string;
  home: CompetitionParticipantSource;
  away: CompetitionParticipantSource;
};

export type CompetitionGenerationPreview = {
  format: TournamentFormatValue;
  teamCount: number;
  groupCount: number;
  matchesByStage: Array<{
    stageId: string;
    stageName: string;
    stageType: TournamentStageTypeValue;
    matchCount: number;
  }>;
  totalMatchCount: number;
};

export type ScheduleSlotDefinition = {
  sequence: number;
  startMinutes: number;
  durationMinutes: number;
};

export type SchedulingSettings = {
  startDate: Date;
  maxMatchesPerDay: number;
  minimumRestDays: number;
  slots: ScheduleSlotDefinition[];
  allowedWeekdays?: number[];
  stageBreakDaysByStageId: Record<string, number>;
};

export type ScheduledCompetitionMatch = CompetitionMatchDefinition & {
  startsAt: Date;
  endsAt: Date;
  calendarDayKey: string;
};
