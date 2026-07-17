import { MatchParticipantSourceType, TournamentStageType } from "@prisma/client";
import { cache } from "react";

import {
  buildGlobalQualificationResolutionSnapshot,
  buildQualificationResolutionSnapshot,
  type QualificationResolutionSnapshot,
} from "@/features/tournaments/server/qualification-resolution";
import { mapPersistedStagesToCompetitionInput } from "@/features/tournaments/server/tournament-competition";
import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";
import { prisma } from "@/lib/prisma";

export const getTournamentQualificationResolution = cache(
  async (tournamentId: string): Promise<QualificationResolutionSnapshot> => {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        stages: {
          select: {
            id: true,
            order: true,
            type: true,
            name: true,
            groupCount: true,
            teamsPerGroup: true,
            legs: true,
            qualifiersPerGroup: true,
            knockoutTeamCount: true,
            knockoutRound: true,
            includeThirdPlaceMatch: true,
            stageBreakDaysAfter: true,
            configuration: true,
          },
        },
        groups: {
          orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            sequence: true,
            matches: {
              where: {
                stage: {
                  type: TournamentStageType.GROUP_STAGE,
                },
              },
              orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
              select: {
                status: true,
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
                homeTeam: {
                  select: {
                    name: true,
                  },
                },
                awayTeam: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        matches: {
          where: {
            stage: {
              type: TournamentStageType.KNOCKOUT_STAGE,
            },
          },
          orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            homeTeamId: true,
            awayTeamId: true,
            homeParticipantLocked: true,
            awayParticipantLocked: true,
            homeParticipantSourceType: true,
            awayParticipantSourceType: true,
            homeSourceGroupId: true,
            awaySourceGroupId: true,
            homeSourceGroupPosition: true,
            awaySourceGroupPosition: true,
            homeTeam: {
              select: {
                name: true,
              },
            },
            awayTeam: {
              select: {
                name: true,
              },
            },
            homeSourceGroup: {
              select: {
                name: true,
              },
            },
            awaySourceGroup: {
              select: {
                name: true,
              },
            },
            roundLabel: true,
          },
        },
      },
    });

    if (!tournament) {
      return { unresolvedSlots: [] };
    }

    const stageDefinitions = mapPersistedStagesToCompetitionInput(tournament.stages);
    const groupStage = stageDefinitions.find((stage) => stage.type === "GROUP_STAGE");
    const knockoutStage = stageDefinitions.find((stage) => stage.type === "KNOCKOUT_STAGE");

    if (!groupStage || !knockoutStage) {
      return { unresolvedSlots: [] };
    }

    const standingsSnapshot = await getTournamentStandingsSnapshot(tournamentId);

    if (standingsSnapshot.mode === "GLOBAL") {
      return buildGlobalQualificationResolutionSnapshot({
        standings: standingsSnapshot.standings,
        qualifierCount: knockoutStage.knockoutTeamCount,
        knockoutMatches: tournament.matches.map((match) => ({
          id: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeParticipantLocked: match.homeParticipantLocked,
          awayParticipantLocked: match.awayParticipantLocked,
          homeParticipantSourceType: match.homeParticipantSourceType as MatchParticipantSourceType | null,
          awayParticipantSourceType: match.awayParticipantSourceType as MatchParticipantSourceType | null,
          homeSourceGroupId: match.homeSourceGroupId,
          awaySourceGroupId: match.awaySourceGroupId,
          homeSourceGroupPosition: match.homeSourceGroupPosition,
          awaySourceGroupPosition: match.awaySourceGroupPosition,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeSourceGroup: match.homeSourceGroup,
          awaySourceGroup: match.awaySourceGroup,
          roundLabel: match.roundLabel,
        })),
        sourceLabel: "Classifica generale",
      });
    }

    if (groupStage.qualifiersPerGroup <= 0) {
      return { unresolvedSlots: [] };
    }

    return buildQualificationResolutionSnapshot({
      qualifiersPerGroup: groupStage.qualifiersPerGroup,
      groups: tournament.groups.map((group) => ({
        id: group.id,
        name: group.name,
        sequence: group.sequence,
        matches: group.matches,
      })),
      knockoutMatches: tournament.matches.map((match) => ({
        id: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeParticipantLocked: match.homeParticipantLocked,
        awayParticipantLocked: match.awayParticipantLocked,
        homeParticipantSourceType: match.homeParticipantSourceType as MatchParticipantSourceType | null,
        awayParticipantSourceType: match.awayParticipantSourceType as MatchParticipantSourceType | null,
        homeSourceGroupId: match.homeSourceGroupId,
        awaySourceGroupId: match.awaySourceGroupId,
        homeSourceGroupPosition: match.homeSourceGroupPosition,
        awaySourceGroupPosition: match.awaySourceGroupPosition,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeSourceGroup: match.homeSourceGroup,
        awaySourceGroup: match.awaySourceGroup,
        roundLabel: match.roundLabel,
      })),
    });
  },
);
