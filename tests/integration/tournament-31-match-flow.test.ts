import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  MatchParticipantSourceType,
  MatchStatus,
  TournamentStageType,
} from "@prisma/client";

import {
  createMatchPlayerEvent,
  listPublicTournamentScorers,
  MatchPlayerEventError,
  readDashboardMatchEventContext,
  updateMatchPlayerEvent,
  voidMatchPlayerEvent,
} from "@/features/matches/server/match-player-events";
import { createPendingTeamRegistration } from "@/features/team-registrations/server/create-pending-team-registration.mjs";
import {
  approvePendingTeamRegistrationRecord,
  syncApprovedTeamPlayers,
} from "@/features/team-registrations/server/approve-pending-team-registration";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import { getMatchParticipantValidationError } from "@/features/matches/server/match-result-guards";
import { generateCompetitionStructure } from "@/features/tournaments/server/generate-competition-structure";
import { buildQualificationResolutionSnapshot } from "@/features/tournaments/server/qualification-resolution";
import {
  buildManualQualificationResolutionPlan,
  type QualificationResolutionSnapshot,
} from "@/features/tournaments/server/qualification-resolution";
import { mapPersistedStagesToCompetitionInput } from "@/features/tournaments/server/tournament-competition";
import { scheduleCompetition, estimateMinimumMatchDays } from "@/features/tournaments/server/schedule-competition";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_SLUG = "integration-flexible-coppa-31-org";
const TOURNAMENT_SLUG = "integration-flexible-coppa-31";
const TOURNAMENT_NAME = "Integration Flexible Coppa 31";

type TeamFixture = {
  teamId: string;
  tournamentTeamId: string;
  groupId: string;
  name: string;
  slug: string;
  groupSequence: number;
  groupSlot: number;
  groupName: string;
};

type IntegrationFixture = {
  organizationId: string;
  tournamentId: string;
  stageIds: {
    groupStageId: string;
    knockoutStageId: string;
  };
  teamFixtures: TeamFixture[];
};

function assertSafeIntegrationEnvironment() {
  const appEnv = process.env.APP_ENV?.trim();

  assert(
    appEnv === "test" || appEnv === "local",
    "APP_ENV must be test or local before writing to the integration test database.",
  );

  assert.equal(process.env.VERCEL, undefined, "VERCEL must not be set for the integration test.");
  assert.notEqual(
    process.env.VERCEL_ENV,
    "production",
    "VERCEL_ENV must not be production for the integration test.",
  );

  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  const directUrl = new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "");

  assert(
    databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1",
    "DATABASE_URL must point to localhost for the integration test.",
  );
  assert(
    directUrl.hostname === "localhost" || directUrl.hostname === "127.0.0.1",
    "DIRECT_URL must point to localhost for the integration test.",
  );
  assert.equal(
    databaseUrl.pathname.replace(/^\//, ""),
    "reghinna_test",
    "DATABASE_URL must point to the reghinna_test database.",
  );
  assert.equal(
    directUrl.pathname.replace(/^\//, ""),
    "reghinna_test",
    "DIRECT_URL must point to the reghinna_test database.",
  );
  assert(
    !/supabase/i.test(process.env.DATABASE_URL ?? "") && !/supabase/i.test(process.env.DIRECT_URL ?? ""),
    "Integration tests must not touch Supabase.",
  );
}

function buildTeamSlug(groupLetter: string, groupSlot: number) {
  return `${TOURNAMENT_SLUG}-${groupLetter.toLowerCase()}${groupSlot}`;
}

function buildTeamName(groupLetter: string, groupSlot: number) {
  return `Integration ${groupLetter}${groupSlot}`;
}

function buildScheduleSlots() {
  return [
    {
      sequence: 1,
      startMinutes: 22 * 60,
      durationMinutes: 60,
    },
    {
      sequence: 2,
      startMinutes: 23 * 60,
      durationMinutes: 60,
    },
  ];
}

function buildStageInputs(groupStageId: string, knockoutStageId: string) {
  return [
    {
      stageId: groupStageId,
      type: "GROUP_STAGE" as const,
      order: 1,
      name: "Fase a gironi",
      groupCount: 4,
      teamsPerGroup: 4,
      legs: 1,
      qualifiersPerGroup: 2,
      stageBreakDaysAfter: 0,
    },
    {
      stageId: knockoutStageId,
      type: "KNOCKOUT_STAGE" as const,
      order: 2,
      name: "Fase finale",
      knockoutTeamCount: 8,
      knockoutRound: "QUARTER_FINAL" as const,
      includeThirdPlaceMatch: false,
      stageBreakDaysAfter: 0,
      pairingRule: "CROSS_ADJACENT_GROUPS",
    },
  ];
}

function buildGroupAssignments(teamFixtures: TeamFixture[]) {
  return teamFixtures.map((team) => ({
    tournamentTeamId: team.tournamentTeamId,
    teamId: team.teamId,
    teamName: team.name,
    seed: team.groupSequence * 10 + team.groupSlot,
    createdAt: new Date(Date.UTC(2026, 0, team.groupSequence * 4 + team.groupSlot)),
    groupId: team.groupId,
    groupName: team.groupName,
    groupSequence: team.groupSequence,
    groupSlot: team.groupSlot,
  }));
}

function buildCompetitionTeamInputs(teamFixtures: TeamFixture[]) {
  return teamFixtures.map((team) => ({
    tournamentTeamId: team.tournamentTeamId,
    teamId: team.teamId,
    teamName: team.name,
    seed: team.groupSequence * 10 + team.groupSlot,
    createdAt: new Date(Date.UTC(2026, 0, team.groupSequence * 4 + team.groupSlot)),
  }));
}

function buildMatchWriteData(
  match: ReturnType<typeof generateCompetitionStructure>["matches"][number],
  createdMatchIdsByKey: Map<string, string>,
) {
  const baseData = {
    stageId: match.stageId,
    groupId: match.groupId,
    sequence: match.sequence,
    roundLabel: match.roundLabel,
    startsAt: null,
    endsAt: null,
    locationLabel: null,
    status: MatchStatus.SCHEDULED,
    homeScore: 0,
    awayScore: 0,
  };

  const applySource = (side: "home" | "away", source: typeof match.home) => {
    switch (source.type) {
      case "DIRECT_TEAM":
        return {
          [`${side}TeamId`]: source.teamId,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.DIRECT_TEAM,
          [`${side}SourceTeamId`]: source.teamId,
          [`${side}SourceGroupId`]: null,
          [`${side}SourceGroupPosition`]: null,
          [`${side}SourceMatchId`]: null,
        };
      case "GROUP_POSITION":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.GROUP_POSITION,
          [`${side}SourceGroupId`]: source.groupId,
          [`${side}SourceGroupPosition`]: source.position,
          [`${side}SourceTeamId`]: null,
          [`${side}SourceMatchId`]: null,
        };
      case "MATCH_WINNER":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.MATCH_WINNER,
          [`${side}SourceMatchId`]: createdMatchIdsByKey.get(source.matchKey) ?? null,
          [`${side}SourceTeamId`]: null,
          [`${side}SourceGroupId`]: null,
          [`${side}SourceGroupPosition`]: null,
        };
      case "MATCH_LOSER":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.MATCH_LOSER,
          [`${side}SourceMatchId`]: createdMatchIdsByKey.get(source.matchKey) ?? null,
          [`${side}SourceTeamId`]: null,
          [`${side}SourceGroupId`]: null,
          [`${side}SourceGroupPosition`]: null,
        };
    }
  };

  return {
    ...baseData,
    ...applySource("home", match.home),
    ...applySource("away", match.away),
  };
}

async function applyMatchResult(matchId: string, status: MatchStatus, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  assert(match, `Match ${matchId} was not found.`);

  const participantValidationError = getMatchParticipantValidationError(match);
  const hasScoreInputs = typeof homeScore === "number" || typeof awayScore === "number";

  if (
    (status === MatchStatus.LIVE || status === MatchStatus.FINISHED || hasScoreInputs) &&
    participantValidationError
  ) {
    throw new Error(participantValidationError);
  }

  if (status === MatchStatus.SCHEDULED && hasScoreInputs) {
    throw new Error("Per registrare un punteggio, imposta la partita come live o completata.");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status,
      homeScore: status === MatchStatus.LIVE || status === MatchStatus.FINISHED ? homeScore : 0,
      awayScore: status === MatchStatus.LIVE || status === MatchStatus.FINISHED ? awayScore : 0,
    },
  });
}

async function ensureNoExistingFixture() {
  await prisma.tournament.deleteMany({
    where: {
      slug: TOURNAMENT_SLUG,
    },
  });

  await prisma.organization.deleteMany({
    where: {
      slug: ORGANIZATION_SLUG,
    },
  });
}

async function createIntegrationFixture(): Promise<IntegrationFixture> {
  await ensureNoExistingFixture();

  const teamFixtures: TeamFixture[] = [];

  const created = await prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.create({
      data: {
        name: "Integration Flexible Coppa Org",
        slug: ORGANIZATION_SLUG,
      },
      select: {
        id: true,
      },
    });

    const tournament = await transaction.tournament.create({
      data: {
        organizationId: organization.id,
        name: TOURNAMENT_NAME,
        slug: TOURNAMENT_SLUG,
        sport: "Calcio a 5",
        seasonLabel: "2026",
        status: "DRAFT",
        format: "GROUPS_THEN_KNOCKOUT",
        expectedTeamCount: 16,
        scheduleStartDate: new Date("2026-06-20T00:00:00.000Z"),
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
      },
      select: {
        id: true,
      },
    });

    const groupStage = await transaction.tournamentStage.create({
      data: {
        tournamentId: tournament.id,
        order: 1,
        type: TournamentStageType.GROUP_STAGE,
        name: "Fase a gironi",
        groupCount: 4,
        teamsPerGroup: 4,
        legs: 1,
        qualifiersPerGroup: 2,
        stageBreakDaysAfter: 0,
      },
      select: {
        id: true,
      },
    });

    const knockoutStage = await transaction.tournamentStage.create({
      data: {
        tournamentId: tournament.id,
        order: 2,
        type: TournamentStageType.KNOCKOUT_STAGE,
        name: "Fase finale",
        knockoutTeamCount: 8,
        knockoutRound: "QUARTER_FINAL",
        includeThirdPlaceMatch: false,
        stageBreakDaysAfter: 0,
        configuration: {
          pairingRule: "CROSS_ADJACENT_GROUPS",
        },
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      buildScheduleSlots().map((slot) =>
        transaction.tournamentScheduleSlot.create({
          data: {
            tournamentId: tournament.id,
            sequence: slot.sequence,
            startMinutes: slot.startMinutes,
            durationMinutes: slot.durationMinutes,
          },
        }),
      ),
    );

    const groupSequenceLabels = [
      { sequence: 1, name: "Gruppo A" },
      { sequence: 2, name: "Gruppo B" },
      { sequence: 3, name: "Gruppo C" },
      { sequence: 4, name: "Gruppo D" },
    ];

    const groups = await Promise.all(
      groupSequenceLabels.map((group) =>
        transaction.tournamentGroup.create({
          data: {
            tournamentId: tournament.id,
            stageId: groupStage.id,
            name: group.name,
            sequence: group.sequence,
          },
          select: {
            id: true,
            name: true,
            sequence: true,
          },
        }),
      ),
    );

    for (const group of groups) {
      for (let groupSlot = 1; groupSlot <= 4; groupSlot += 1) {
        const teamName = buildTeamName(String.fromCharCode(64 + group.sequence), groupSlot);
        const teamSlug = buildTeamSlug(String.fromCharCode(64 + group.sequence), groupSlot);

        const team = await transaction.team.create({
          data: {
            organizationId: organization.id,
            name: teamName,
            slug: teamSlug,
          },
          select: {
            id: true,
            name: true,
          },
        });

        const tournamentTeam = await transaction.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            teamId: team.id,
            groupId: group.id,
            groupSlot,
            seed: group.sequence * 10 + groupSlot,
          },
          select: {
            id: true,
            createdAt: true,
          },
        });

        await transaction.player.createMany({
          data: [
            {
              organizationId: organization.id,
              teamId: team.id,
              firstName: "Luigi",
              lastName: `${group.name} ${groupSlot} A`,
              displayName: `Luigi ${group.name} ${groupSlot} A`,
              jerseyNumber: "9",
            },
            {
              organizationId: organization.id,
              teamId: team.id,
              firstName: "Mario",
              lastName: `${group.name} ${groupSlot} B`,
              displayName: `Mario ${group.name} ${groupSlot} B`,
              jerseyNumber: "10",
            },
            {
              organizationId: organization.id,
              teamId: team.id,
              firstName: "Christian",
              lastName: `${group.name} ${groupSlot} C`,
              displayName: `Christian ${group.name} ${groupSlot} C`,
              jerseyNumber: "15",
            },
          ],
        });

        teamFixtures.push({
          teamId: team.id,
          tournamentTeamId: tournamentTeam.id,
          groupId: group.id,
          name: team.name,
          slug: teamSlug,
          groupSequence: group.sequence,
          groupSlot,
          groupName: group.name,
        });
      }
    }

    return {
      organizationId: organization.id,
      tournamentId: tournament.id,
      stageIds: {
        groupStageId: groupStage.id,
        knockoutStageId: knockoutStage.id,
      },
    };
  });

  return {
    ...created,
    teamFixtures,
  };
}

async function persistCompetitionStructure(
  fixture: IntegrationFixture,
) {
  const stageDefinitions = buildStageInputs(fixture.stageIds.groupStageId, fixture.stageIds.knockoutStageId);
  const teamInputs = buildCompetitionTeamInputs(fixture.teamFixtures);
  const groupAssignments = buildGroupAssignments(fixture.teamFixtures);

  const generated = generateCompetitionStructure({
    format: "GROUPS_THEN_KNOCKOUT",
    teams: teamInputs,
    stages: stageDefinitions,
    groupAssignments,
  });

  assert.equal(generated.preview.totalMatchCount, 31);
  assert.equal(generated.preview.groupCount, 4);
  const groupStagePreview = generated.preview.matchesByStage.find((stage) => stage.stageType === "GROUP_STAGE");
  const knockoutStagePreview = generated.preview.matchesByStage.find((stage) => stage.stageType === "KNOCKOUT_STAGE");
  assert.equal(groupStagePreview?.matchCount, 24);
  assert.equal(knockoutStagePreview?.matchCount, 7);
  assert.equal(estimateMinimumMatchDays(generated.preview.totalMatchCount, 2), 16);

  const createdMatchIdsByKey = new Map<string, string>();

  await prisma.$transaction(async (transaction) => {
    for (const match of generated.matches) {
      const createdMatch = await transaction.match.create({
        data: {
          tournamentId: fixture.tournamentId,
          ...buildMatchWriteData(match, createdMatchIdsByKey),
        },
        select: {
          id: true,
        },
      });

      createdMatchIdsByKey.set(match.key, createdMatch.id);
    }
  });

  return {
    generated,
    createdMatchIdsByKey,
    stageDefinitions,
    teamInputs,
    groupAssignments,
  };
}

async function scheduleCompetitionStructure(
  fixture: IntegrationFixture,
  generatedMatches: ReturnType<typeof generateCompetitionStructure>["matches"],
  createdMatchIdsByKey: Map<string, string>,
) {
  const persistedTournament = await prisma.tournament.findUnique({
    where: { id: fixture.tournamentId },
    select: {
      scheduleStartDate: true,
      scheduleMaxMatchesPerDay: true,
      scheduleMinimumRestDays: true,
      scheduleSlots: {
        orderBy: { sequence: "asc" },
        select: {
          sequence: true,
          startMinutes: true,
          durationMinutes: true,
        },
      },
      stages: {
        orderBy: { order: "asc" },
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
    },
  });

  assert(persistedTournament?.scheduleStartDate);
  assert(persistedTournament.scheduleMaxMatchesPerDay);
  assert(persistedTournament.scheduleSlots.length > 0);

  const scheduledMatches = scheduleCompetition(generatedMatches, {
    startDate: persistedTournament.scheduleStartDate,
    maxMatchesPerDay: persistedTournament.scheduleMaxMatchesPerDay,
    minimumRestDays: persistedTournament.scheduleMinimumRestDays ?? 0,
    slots: persistedTournament.scheduleSlots.map((slot) => ({
      sequence: slot.sequence,
      startMinutes: slot.startMinutes,
      durationMinutes: slot.durationMinutes,
    })),
    stageBreakDaysByStageId: Object.fromEntries(
      mapPersistedStagesToCompetitionInput(persistedTournament.stages).map((stage) => [
        stage.stageId,
        stage.stageBreakDaysAfter,
      ]),
    ),
  });

  await prisma.$transaction(
    scheduledMatches.map((match) =>
      prisma.match.update({
        where: {
          id: createdMatchIdsByKey.get(match.key) ?? "",
        },
        data: {
          startsAt: match.startsAt,
          endsAt: match.endsAt,
        },
      }),
    ),
  );

  return {
    scheduledMatches,
  };
}

async function resolveKnockoutParticipantsFromResults(fixture: IntegrationFixture) {
  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId: fixture.tournamentId },
    orderBy: { sequence: "asc" },
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
  });

  const knockoutMatches = await prisma.match.findMany({
    where: {
      tournamentId: fixture.tournamentId,
      stage: {
        type: TournamentStageType.KNOCKOUT_STAGE,
      },
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homeParticipantLocked: true,
      awayParticipantLocked: true,
      homeParticipantSourceType: true,
      awayParticipantSourceType: true,
      homeSourceGroupId: true,
      awaySourceGroupId: true,
      homeSourceGroupPosition: true,
      awaySourceGroupPosition: true,
      homeSourceMatchId: true,
      awaySourceMatchId: true,
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
  });

  const resolvedGroupPositions = new Map<string, Map<number, string>>();

  for (const group of groups) {
    const standings = calculateStandings(
      group.matches.map((match) => ({
        homeTeamId: match.homeTeamId as string,
        awayTeamId: match.awayTeamId as string,
        homeTeamName: match.homeTeam?.name ?? "Squadra",
        awayTeamName: match.awayTeam?.name ?? "Squadra",
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
      })),
    );

    const groupPositions = new Map<number, string>();
    standings.slice(0, 2).forEach((row, index) => {
      groupPositions.set(index + 1, row.teamId);
    });
    resolvedGroupPositions.set(group.id, groupPositions);
  }

  const matchesById = new Map(knockoutMatches.map((match) => [match.id, match]));

  const resolveSource = (
    sourceType: MatchParticipantSourceType | null,
    sourceGroupId: string | null,
    sourceGroupPosition: number | null,
    sourceMatchId: string | null,
  ) => {
    if (sourceType === MatchParticipantSourceType.DIRECT_TEAM) {
      return null;
    }

    if (sourceType === MatchParticipantSourceType.GROUP_POSITION) {
      if (!sourceGroupId || !sourceGroupPosition) {
        return null;
      }

      return resolvedGroupPositions.get(sourceGroupId)?.get(sourceGroupPosition) ?? null;
    }

    if (
      sourceType === MatchParticipantSourceType.MATCH_WINNER ||
      sourceType === MatchParticipantSourceType.MATCH_LOSER
    ) {
      if (!sourceMatchId) {
        return null;
      }

      const sourceMatch = matchesById.get(sourceMatchId);

      if (
        !sourceMatch ||
        sourceMatch.homeTeamId === null ||
        sourceMatch.awayTeamId === null ||
        sourceMatch.homeScore === null ||
        sourceMatch.awayScore === null ||
        sourceMatch.homeScore === sourceMatch.awayScore
      ) {
        return null;
      }

      const winnerTeamId = sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;
      const loserTeamId = sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.awayTeamId : sourceMatch.homeTeamId;

      return sourceType === MatchParticipantSourceType.MATCH_WINNER ? winnerTeamId : loserTeamId;
    }

    return null;
  };

  const updates = knockoutMatches.flatMap((match) => {
    const nextHomeTeamId = !match.homeParticipantLocked
      ? resolveSource(
          match.homeParticipantSourceType,
          match.homeSourceGroupId,
          match.homeSourceGroupPosition,
          match.homeSourceMatchId,
        )
      : null;
    const nextAwayTeamId = !match.awayParticipantLocked
      ? resolveSource(
          match.awayParticipantSourceType,
          match.awaySourceGroupId,
          match.awaySourceGroupPosition,
          match.awaySourceMatchId,
        )
      : null;
    const data: Record<string, string | null> = {};

    if (nextHomeTeamId && match.homeTeamId !== nextHomeTeamId) {
      data.homeTeamId = nextHomeTeamId;
    }

    if (nextAwayTeamId && match.awayTeamId !== nextAwayTeamId) {
      data.awayTeamId = nextAwayTeamId;
    }

    if (Object.keys(data).length === 0) {
      return [];
    }

    return [
      prisma.match.update({
        where: { id: match.id },
        data,
      }),
    ];
  });

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

before(async () => {
  assertSafeIntegrationEnvironment();
  await ensureNoExistingFixture();
});

after(async () => {
  await ensureNoExistingFixture();
});

test("flexible 31-match tournament flow persists structure, schedules calendar, and propagates knockout rounds", async () => {
  const fixture = await createIntegrationFixture();
  const { generated, createdMatchIdsByKey } = await persistCompetitionStructure(fixture);

  const persistedMatches = await prisma.match.findMany({
    where: { tournamentId: fixture.tournamentId },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      stageId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeParticipantSourceType: true,
      awayParticipantSourceType: true,
      homeSourceMatchId: true,
      awaySourceMatchId: true,
      homeSourceGroupId: true,
      awaySourceGroupId: true,
      homeSourceGroupPosition: true,
      awaySourceGroupPosition: true,
      roundLabel: true,
      groupId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
    },
  });

  assert.equal(persistedMatches.length, 31);
  assert.equal(await prisma.team.count({ where: { organizationId: fixture.organizationId } }), 16);
  assert.equal(await prisma.tournamentTeam.count({ where: { tournamentId: fixture.tournamentId } }), 16);
  assert.equal(await prisma.tournamentGroup.count({ where: { tournamentId: fixture.tournamentId } }), 4);
  assert.equal(await prisma.tournamentStage.count({ where: { tournamentId: fixture.tournamentId } }), 2);
  assert.equal(await prisma.tournamentScheduleSlot.count({ where: { tournamentId: fixture.tournamentId } }), 2);

  const groupMatches = persistedMatches.filter((match) => match.groupId !== null);
  const knockoutMatches = persistedMatches.filter((match) => match.groupId === null && match.stageId !== null);

  assert.equal(groupMatches.length, 24);
  assert.equal(knockoutMatches.length, 7);
  assert.equal(
    groupMatches.every((match) => match.homeTeamId !== null && match.awayTeamId !== null),
    true,
  );
  assert.equal(
    knockoutMatches.every(
      (match) =>
        match.roundLabel?.startsWith("QF")
          ? match.homeParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
            match.awayParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION
          : match.homeParticipantSourceType === MatchParticipantSourceType.MATCH_WINNER ||
            match.awayParticipantSourceType === MatchParticipantSourceType.MATCH_WINNER,
    ),
    true,
  );
  assert.equal(
    knockoutMatches.every((match) => match.stageId !== null && match.homeTeamId === null && match.awayTeamId === null),
    true,
  );

  const scheduledMatches = (
    await scheduleCompetitionStructure(fixture, generated.matches, createdMatchIdsByKey)
  ).scheduledMatches;

  assert.equal(scheduledMatches.length, 31);
  assert.equal(new Set(scheduledMatches.map((match) => match.calendarDayKey)).size >= 16, true);
  assert.equal(
    scheduledMatches.every((match) => match.startsAt instanceof Date && match.endsAt instanceof Date),
    true,
  );
  assert.equal(
    scheduledMatches.every((match) => match.startsAt.getUTCHours() === 22 || match.startsAt.getUTCHours() === 23),
    true,
  );

  const matchesByDay = new Map<string, typeof scheduledMatches>();
  for (const match of scheduledMatches) {
    const existing = matchesByDay.get(match.calendarDayKey) ?? [];
    existing.push(match);
    matchesByDay.set(match.calendarDayKey, existing);
  }

  for (const [dayKey, dayMatches] of matchesByDay) {
    assert(dayMatches.length <= 2, `${dayKey} exceeds the maximum of two matches.`);

    const teamIds = dayMatches.flatMap((match) => {
      const ids: string[] = [];

      if (match.home.type === "DIRECT_TEAM") {
        ids.push(match.home.teamId);
      }

      if (match.away.type === "DIRECT_TEAM") {
        ids.push(match.away.teamId);
      }

      return ids;
    });

    assert.equal(teamIds.length, new Set(teamIds).size, `${dayKey} schedules a known team twice.`);
  }

  const lateMatches = scheduledMatches.filter(
    (match) => match.startsAt.getUTCHours() === 23 && match.endsAt.getUTCHours() === 0,
  );
  assert(lateMatches.length > 0, "Expected at least one 23:00 slot ending at midnight.");
  assert(
    lateMatches.every((match) => match.endsAt.getUTCDate() !== match.startsAt.getUTCDate()),
    "23:00 matches must end on the following calendar day.",
  );

  const qf1 = scheduledMatches.find((match) => match.roundLabel === "QF1");
  const qf2 = scheduledMatches.find((match) => match.roundLabel === "QF2");
  const qf3 = scheduledMatches.find((match) => match.roundLabel === "QF3");
  const qf4 = scheduledMatches.find((match) => match.roundLabel === "QF4");
  const sf1 = scheduledMatches.find((match) => match.roundLabel === "SF1");
  const sf2 = scheduledMatches.find((match) => match.roundLabel === "SF2");
  const final = scheduledMatches.find((match) => match.knockoutRound === "FINAL");

  assert(qf1 && qf2 && qf3 && qf4 && sf1 && sf2 && final);
  assert(qf1.startsAt < sf1.startsAt);
  assert(qf3.startsAt < sf1.startsAt);
  assert(qf2.startsAt < sf2.startsAt);
  assert(qf4.startsAt < sf2.startsAt);
  assert(sf1.startsAt < final.startsAt);
  assert(sf2.startsAt < final.startsAt);
  assert(final.startsAt.getTime() === Math.max(...scheduledMatches.map((match) => match.startsAt.getTime())));
  assert.equal(scheduledMatches.filter((match) => match.calendarDayKey === final.calendarDayKey).length, 1);

  const teamById = new Map(fixture.teamFixtures.map((team) => [team.teamId, team]));

  const qfBySourcePair = new Map(
    scheduledMatches
      .filter((match) => match.roundLabel?.startsWith("QF"))
      .map((match) => [match.roundLabel ?? "", match]),
  );

  assert(qfBySourcePair.get("QF1"));
  assert(qfBySourcePair.get("QF2"));
  assert(qfBySourcePair.get("QF3"));
  assert(qfBySourcePair.get("QF4"));

  const unresolvedSnapshot = buildQualificationResolutionSnapshot({
    scope: "GROUPS",
    qualifiersPerGroup: 2,
    groups: await Promise.all(
      [
        "A",
        "B",
        "C",
        "D",
      ].map(async (groupLetter, index) => {
        const group = await prisma.tournamentGroup.findFirst({
          where: {
            tournamentId: fixture.tournamentId,
            sequence: index + 1,
          },
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
        });

        assert(group, `Group ${groupLetter} was not found.`);
        return group;
      }),
    ),
    knockoutMatches: await prisma.match.findMany({
      where: {
        tournamentId: fixture.tournamentId,
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
    }),
  });

  assert.equal(unresolvedSnapshot.unresolvedSlots.length, 0);

  const unresolvedMatch = persistedMatches.find((match) => match.roundLabel === "QF1");
  assert(unresolvedMatch);
  await assert.rejects(
    () => applyMatchResult(unresolvedMatch.id, MatchStatus.FINISHED, 2, 0),
    /La partita deve avere entrambe le squadre assegnate/i,
  );

  for (const match of groupMatches) {
    assert(match.homeTeamId && match.awayTeamId);
    const home = teamById.get(match.homeTeamId);
    const away = teamById.get(match.awayTeamId);
    assert(home && away);

    const homeWins =
      home.groupSlot < away.groupSlot ||
      (home.groupSlot === away.groupSlot && home.name.localeCompare(away.name) <= 0);

    await applyMatchResult(
      match.id,
      MatchStatus.FINISHED,
      homeWins ? 3 : 0,
      homeWins ? 0 : 3,
    );
  }

  const groupStageGroups = await prisma.tournamentGroup.findMany({
    where: { tournamentId: fixture.tournamentId },
    orderBy: { sequence: "asc" },
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
  });

  for (const group of groupStageGroups) {
    const standings = calculateStandings(
      group.matches.map((match) => ({
        homeTeamId: match.homeTeamId as string,
        awayTeamId: match.awayTeamId as string,
        homeTeamName: match.homeTeam?.name ?? "Squadra",
        awayTeamName: match.awayTeam?.name ?? "Squadra",
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
      })),
    );

    assert.equal(standings.length, 4);
    assert.equal(standings[0]?.teamName.endsWith("1"), true);
    assert.equal(standings[1]?.teamName.endsWith("2"), true);
    assert.equal(standings[2]?.teamName.endsWith("3"), true);
    assert.equal(standings[3]?.teamName.endsWith("4"), true);
  }

  await resolveKnockoutParticipantsFromResults(fixture);

  const qfResolved = await prisma.match.findMany({
    where: {
      tournamentId: fixture.tournamentId,
      roundLabel: {
        in: ["QF1", "QF2", "QF3", "QF4"],
      },
    },
    orderBy: { sequence: "asc" },
    select: {
      id: true,
      roundLabel: true,
      homeTeamId: true,
      awayTeamId: true,
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
  });

  assert.equal(qfResolved.length, 4);
  assert.deepEqual(
    qfResolved.map((match) => [match.homeTeam?.name, match.awayTeam?.name]),
    [
      ["Integration A1", "Integration B2"],
      ["Integration B1", "Integration A2"],
      ["Integration C1", "Integration D2"],
      ["Integration D1", "Integration C2"],
    ],
  );
  assert.equal(
    qfResolved.every((match) => match.homeTeamId && match.awayTeamId && match.homeTeamId !== match.awayTeamId),
    true,
  );

  const unresolvedQf = qfResolved[0];
  assert(unresolvedQf);

  const temporaryPartialMatch = await prisma.match.create({
    data: {
      tournamentId: fixture.tournamentId,
      stageId: fixture.stageIds.knockoutStageId,
      groupId: null,
      sequence: 999,
      roundLabel: "TEST_PARTIAL",
      status: MatchStatus.SCHEDULED,
      homeTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      awayTeamId: null,
      homeParticipantSourceType: MatchParticipantSourceType.DIRECT_TEAM,
      awayParticipantSourceType: MatchParticipantSourceType.DIRECT_TEAM,
      homeSourceTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      awaySourceTeamId: null,
      startsAt: null,
      endsAt: null,
      locationLabel: null,
      homeScore: 0,
      awayScore: 0,
    },
    select: { id: true },
  });

  await assert.rejects(
    () => applyMatchResult(temporaryPartialMatch.id, MatchStatus.FINISHED, 1, 0),
    /La partita deve avere entrambe le squadre assegnate/i,
  );

  const temporarySelfMatch = await prisma.match.create({
    data: {
      tournamentId: fixture.tournamentId,
      stageId: fixture.stageIds.knockoutStageId,
      groupId: null,
      sequence: 1000,
      roundLabel: "TEST_SELF",
      status: MatchStatus.SCHEDULED,
      homeTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      awayTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      homeParticipantSourceType: MatchParticipantSourceType.DIRECT_TEAM,
      awayParticipantSourceType: MatchParticipantSourceType.DIRECT_TEAM,
      homeSourceTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      awaySourceTeamId: fixture.teamFixtures[0]?.teamId ?? null,
      startsAt: null,
      endsAt: null,
      locationLabel: null,
      homeScore: 0,
      awayScore: 0,
    },
    select: { id: true },
  });

  await assert.rejects(
    () => applyMatchResult(temporarySelfMatch.id, MatchStatus.FINISHED, 1, 0),
    /due squadre diverse/i,
  );

  const qfResultMap = new Map([
    ["QF1", [2, 0]],
    ["QF2", [0, 2]],
    ["QF3", [2, 1]],
    ["QF4", [1, 2]],
  ] as [string, [number, number]][]);

  for (const qf of qfResolved) {
    const [homeScore, awayScore] = qfResultMap.get(qf.roundLabel as "QF1" | "QF2" | "QF3" | "QF4") ?? [2, 0];
    await applyMatchResult(
      qf.id,
      MatchStatus.FINISHED,
      homeScore,
      awayScore,
    );
  }

  await resolveKnockoutParticipantsFromResults(fixture);

  const semifinalMatches = await prisma.match.findMany({
    where: {
      tournamentId: fixture.tournamentId,
      roundLabel: {
        in: ["SF1", "SF2"],
      },
    },
    orderBy: { sequence: "asc" },
    select: {
      id: true,
      roundLabel: true,
      homeTeamId: true,
      awayTeamId: true,
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
  });

  assert.equal(semifinalMatches.length, 2);
  assert.deepEqual(
    semifinalMatches.map((match) => [match.homeTeam?.name, match.awayTeam?.name]),
    [
      ["Integration A1", "Integration C1"],
      ["Integration A2", "Integration C2"],
    ],
  );

  for (const semifinal of semifinalMatches) {
    await applyMatchResult(semifinal.id, MatchStatus.FINISHED, 3, 1);
  }

  await resolveKnockoutParticipantsFromResults(fixture);

  const finalMatch = await prisma.match.findFirst({
    where: {
      tournamentId: fixture.tournamentId,
      roundLabel: "Finale",
    },
    select: {
      id: true,
      roundLabel: true,
      homeTeamId: true,
      awayTeamId: true,
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
  });

  assert(finalMatch);
  assert.equal(finalMatch.homeTeamId !== null && finalMatch.awayTeamId !== null, true);
  assert.equal(finalMatch.homeTeamId !== finalMatch.awayTeamId, true);
  assert.deepEqual([finalMatch.homeTeam?.name, finalMatch.awayTeam?.name], ["Integration A1", "Integration A2"]);

  await applyMatchResult(finalMatch.id, MatchStatus.FINISHED, 4, 2);

  const completedFinal = await prisma.match.findUnique({
    where: { id: finalMatch.id },
    select: {
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  assert.deepEqual(completedFinal, {
    status: MatchStatus.FINISHED,
    homeScore: 4,
    awayScore: 2,
    homeTeamId: finalMatch.homeTeamId,
    awayTeamId: finalMatch.awayTeamId,
  });

  await prisma.match.deleteMany({
    where: {
      tournamentId: fixture.tournamentId,
      roundLabel: {
        in: ["TEST_PARTIAL", "TEST_SELF"],
      },
    },
  });

  assert.equal(
    await prisma.match.count({
      where: {
        tournamentId: fixture.tournamentId,
      },
    }),
    31,
  );

  assert.equal(
    await prisma.match.count({
      where: {
        tournamentId: fixture.tournamentId,
        roundLabel: "Finale 3° posto",
      },
    }),
    0,
  );

  const finalCount = await prisma.match.count({
    where: {
      tournamentId: fixture.tournamentId,
      status: MatchStatus.FINISHED,
    },
  });

  assert.equal(finalCount, 31);
});

test("dependency and manual qualification validation rejects invalid states", () => {
  const missingSourceMatches = [
    {
      key: "SF1",
      format: "GROUPS_THEN_KNOCKOUT" as const,
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE" as const,
      stageName: "Fase finale",
      groupId: null,
      groupName: null,
      knockoutRound: "SEMI_FINAL" as const,
      roundNumber: 2,
      sequence: 1,
      roundLabel: "SF1",
      home: {
        type: "MATCH_WINNER" as const,
        matchKey: "MISSING",
        label: "Vincente MISSING",
      },
      away: {
        type: "DIRECT_TEAM" as const,
        teamId: "team-1",
        label: "Team 1",
      },
    },
  ];

  assert.throws(
    () =>
      scheduleCompetition(missingSourceMatches, {
        startDate: new Date("2026-06-20T00:00:00.000Z"),
        maxMatchesPerDay: 2,
        minimumRestDays: 0,
        slots: buildScheduleSlots(),
        stageBreakDaysByStageId: {
          "stage-knockout": 0,
        },
      }),
    /missing source match/i,
  );

  const cyclicMatches = [
    {
      key: "M1",
      format: "GROUPS_THEN_KNOCKOUT" as const,
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE" as const,
      stageName: "Fase finale",
      groupId: null,
      groupName: null,
      knockoutRound: "SEMI_FINAL" as const,
      roundNumber: 2,
      sequence: 1,
      roundLabel: "SF1",
      home: {
        type: "MATCH_WINNER" as const,
        matchKey: "M2",
        label: "Vincente M2",
      },
      away: {
        type: "DIRECT_TEAM" as const,
        teamId: "team-1",
        label: "Team 1",
      },
    },
    {
      key: "M2",
      format: "GROUPS_THEN_KNOCKOUT" as const,
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE" as const,
      stageName: "Fase finale",
      groupId: null,
      groupName: null,
      knockoutRound: "SEMI_FINAL" as const,
      roundNumber: 2,
      sequence: 2,
      roundLabel: "SF2",
      home: {
        type: "MATCH_WINNER" as const,
        matchKey: "M1",
        label: "Vincente M1",
      },
      away: {
        type: "DIRECT_TEAM" as const,
        teamId: "team-2",
        label: "Team 2",
      },
    },
  ];

  assert.throws(
    () =>
      scheduleCompetition(cyclicMatches, {
        startDate: new Date("2026-06-20T00:00:00.000Z"),
        maxMatchesPerDay: 2,
        minimumRestDays: 0,
        slots: buildScheduleSlots(),
        stageBreakDaysByStageId: {
          "stage-knockout": 0,
        },
      }),
    /circular participant dependency/i,
  );

  const snapshot: QualificationResolutionSnapshot = {
    unresolvedSlots: [
      {
        groupId: "group-a",
        groupName: "Gruppo A",
        groupSequence: 1,
        position: 1,
        matchId: "qf-1",
        matchLabel: "QF1",
        side: "home",
        locked: true,
        currentTeamId: "team-1",
        currentTeamName: "Team 1",
        candidateTeams: [
          { teamId: "team-1", teamName: "Team 1" },
          { teamId: "team-2", teamName: "Team 2" },
        ],
      },
    ],
  };

  assert.throws(
    () =>
      buildManualQualificationResolutionPlan(snapshot, [
        {
          matchId: "qf-1",
          side: "home",
          teamId: "team-2",
        },
      ]),
    /non può essere modificata/i,
  );

  assert.throws(
    () =>
      buildManualQualificationResolutionPlan(
        {
          unresolvedSlots: [
            {
              ...snapshot.unresolvedSlots[0],
              locked: false,
            },
          ],
        },
        [
          {
            matchId: "qf-1",
            side: "home",
            teamId: "team-1",
          },
          {
            matchId: "qf-2",
            side: "away",
            teamId: "team-1",
          },
        ],
      ),
    /non è più disponibile/i,
  );
});

test("player goal events keep score updates atomic and reject stale or wrong-team input", async () => {
  const fixture = await createIntegrationFixture();
  await persistCompetitionStructure(fixture);

  const match = await prisma.match.findFirst({
    where: {
      tournamentId: fixture.tournamentId,
      groupId: {
        not: null,
      },
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  assert(match?.homeTeamId);
  assert(match?.awayTeamId);
  const homeTeamId = match.homeTeamId;

  await applyMatchResult(match.id, MatchStatus.LIVE, 0, 0);

  const [homePlayer, awayPlayer] = await Promise.all([
    prisma.player.findFirst({
      where: { teamId: match.homeTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true, displayName: true },
    }),
    prisma.player.findFirst({
      where: { teamId: match.awayTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  assert(homePlayer?.id);
  assert(awayPlayer?.id);

  const result = await createMatchPlayerEvent({
    matchId: match.id,
    type: "GOAL",
    teamId: match.homeTeamId,
    awardedTeamId: match.homeTeamId,
    playerId: homePlayer.id,
    expectedScoreVersion: 0,
  });

  assert.equal(result.homeScore, 1);
  assert.equal(result.awayScore, 0);
  assert.equal(result.scoreVersion, 1);
  assert.ok(result.eventId);

  const persistedMatch = await prisma.match.findUnique({
    where: { id: match.id },
    select: {
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
    },
  });

  assert.deepEqual(persistedMatch, {
    homeScore: 1,
    awayScore: 0,
    scoreVersion: 1,
  });

  const [goalEvent, latestScoreEvent] = await Promise.all([
    prisma.matchPlayerEvent.findUnique({
      where: { id: result.eventId ?? "" },
      select: {
        type: true,
        playerDisplayNameSnapshot: true,
      },
    }),
    prisma.matchScoreEvent.findFirst({
      where: { matchId: match.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        actionType: true,
        nextHomeScore: true,
        nextAwayScore: true,
      },
    }),
  ]);

  assert.equal(goalEvent?.type, "GOAL");
  assert.equal(goalEvent?.playerDisplayNameSnapshot, homePlayer.displayName);
  assert.deepEqual(latestScoreEvent, {
    actionType: "INCREMENT_HOME_SCORE",
    nextHomeScore: 1,
    nextAwayScore: 0,
  });

  await assert.rejects(
    () =>
      createMatchPlayerEvent({
        matchId: match.id,
        type: "GOAL",
        teamId: homeTeamId,
        awardedTeamId: homeTeamId,
        playerId: awayPlayer.id,
        expectedScoreVersion: 1,
      }),
    (error: unknown) =>
      error instanceof MatchPlayerEventError && error.code === "INVALID_PLAYER",
  );

  await assert.rejects(
    () =>
      createMatchPlayerEvent({
        matchId: match.id,
        type: "GOAL",
        teamId: homeTeamId,
        awardedTeamId: homeTeamId,
        playerId: homePlayer.id,
        expectedScoreVersion: 0,
      }),
    (error: unknown) => error instanceof MatchPlayerEventError && error.code === "CONFLICT",
  );
});

test("unassigned goals can be assigned later, cards do not change score, and void restores consistency", async () => {
  const fixture = await createIntegrationFixture();
  await persistCompetitionStructure(fixture);

  await prisma.tournament.update({
    where: { id: fixture.tournamentId },
    data: {
      status: "PUBLISHED",
    },
  });

  const match = await prisma.match.findFirst({
    where: {
      tournamentId: fixture.tournamentId,
      groupId: {
        not: null,
      },
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  assert(match?.homeTeamId);
  assert(match?.awayTeamId);

  await applyMatchResult(match.id, MatchStatus.LIVE, 0, 0);

  const [homePlayer, awayPlayer] = await Promise.all([
    prisma.player.findFirst({
      where: { teamId: match.homeTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true, displayName: true },
    }),
    prisma.player.findFirst({
      where: { teamId: match.awayTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true, displayName: true },
    }),
  ]);

  assert(homePlayer?.id);
  assert(awayPlayer?.id);

  const unassignedGoal = await createMatchPlayerEvent({
    matchId: match.id,
    type: "GOAL",
    teamId: match.homeTeamId,
    awardedTeamId: match.homeTeamId,
    playerId: null,
    expectedScoreVersion: 0,
  });

  assert.ok(unassignedGoal.eventId);
  assert.equal(unassignedGoal.homeScore, 1);

  await updateMatchPlayerEvent({
    matchId: match.id,
    eventId: unassignedGoal.eventId ?? "",
    playerId: homePlayer.id,
  });

  const yellowCard = await createMatchPlayerEvent({
    matchId: match.id,
    type: "YELLOW_CARD",
    teamId: match.awayTeamId,
    playerId: awayPlayer.id,
  });

  assert.equal(yellowCard.homeScore, 1);
  assert.equal(yellowCard.awayScore, 0);

  await voidMatchPlayerEvent({
    matchId: match.id,
    eventId: yellowCard.eventId ?? "",
  });

  const activeGoal = await prisma.matchPlayerEvent.findUnique({
    where: { id: unassignedGoal.eventId ?? "" },
    select: {
      playerDisplayNameSnapshot: true,
      voidedAt: true,
    },
  });

  assert.equal(activeGoal?.playerDisplayNameSnapshot, homePlayer.displayName);
  assert.equal(activeGoal?.voidedAt, null);

  await voidMatchPlayerEvent({
    matchId: match.id,
    eventId: unassignedGoal.eventId ?? "",
    expectedScoreVersion: 1,
  });

  const reconciledMatch = await prisma.match.findUnique({
    where: { id: match.id },
    select: {
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
    },
  });

  assert.deepEqual(reconciledMatch, {
    homeScore: 0,
    awayScore: 0,
    scoreVersion: 2,
  });

  const activeYellowCards = await prisma.matchPlayerEvent.count({
    where: {
      matchId: match.id,
      type: "YELLOW_CARD",
      voidedAt: null,
    },
  });

  assert.equal(activeYellowCards, 0);

  const ownGoal = await createMatchPlayerEvent({
    matchId: match.id,
    type: "OWN_GOAL",
    teamId: match.homeTeamId,
    awardedTeamId: match.awayTeamId,
    playerId: homePlayer.id,
    expectedScoreVersion: 2,
  });

  const awayGoal = await createMatchPlayerEvent({
    matchId: match.id,
    type: "GOAL",
    teamId: match.awayTeamId,
    awardedTeamId: match.awayTeamId,
    playerId: awayPlayer.id,
    expectedScoreVersion: ownGoal.scoreVersion,
  });

  await applyMatchResult(match.id, MatchStatus.FINISHED, 0, 2);

  const scorers = await listPublicTournamentScorers(TOURNAMENT_SLUG);

  assert.equal(scorers.length, 1);
  assert.equal(scorers[0]?.playerName, awayPlayer.displayName);
  assert.equal(scorers[0]?.goals, 1);
  assert.equal(scorers[0]?.yellowCards, 0);
  assert.equal(awayGoal.awayScore, 2);
});

test("sequence allocation stays unique under concurrent event creation and duplicate goal taps", async () => {
  const fixture = await createIntegrationFixture();
  await persistCompetitionStructure(fixture);

  const match = await prisma.match.findFirst({
    where: {
      tournamentId: fixture.tournamentId,
      groupId: {
        not: null,
      },
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  assert(match?.homeTeamId);
  assert(match?.awayTeamId);
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;

  await applyMatchResult(match.id, MatchStatus.LIVE, 0, 0);

  const [homePlayer, awayPlayer] = await Promise.all([
    prisma.player.findFirst({
      where: { teamId: homeTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.player.findFirst({
      where: { teamId: awayTeamId },
      orderBy: [{ jerseyNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  assert(homePlayer?.id);
  assert(awayPlayer?.id);

  await Promise.all([
    createMatchPlayerEvent({
      matchId: match.id,
      type: "YELLOW_CARD",
      teamId: homeTeamId,
      playerId: homePlayer.id,
    }),
    createMatchPlayerEvent({
      matchId: match.id,
      type: "RED_CARD",
      teamId: awayTeamId,
      playerId: awayPlayer.id,
    }),
  ]);

  const concurrentCardEvents = await prisma.matchPlayerEvent.findMany({
    where: { matchId: match.id },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      sequence: true,
      type: true,
    },
  });

  assert.deepEqual(
    concurrentCardEvents.map((event) => event.sequence),
    [1, 2],
  );

  const duplicateGoalAttempts = await Promise.allSettled([
    createMatchPlayerEvent({
      matchId: match.id,
      type: "GOAL",
      teamId: homeTeamId,
      awardedTeamId: homeTeamId,
      playerId: homePlayer.id,
      expectedScoreVersion: 0,
    }),
    createMatchPlayerEvent({
      matchId: match.id,
      type: "GOAL",
      teamId: homeTeamId,
      awardedTeamId: homeTeamId,
      playerId: homePlayer.id,
      expectedScoreVersion: 0,
    }),
  ]);

  assert.equal(
    duplicateGoalAttempts.filter((attempt) => attempt.status === "fulfilled").length,
    1,
  );
  assert.equal(
    duplicateGoalAttempts.filter(
      (attempt) =>
        attempt.status === "rejected" &&
        attempt.reason instanceof MatchPlayerEventError &&
        attempt.reason.code === "CONFLICT",
    ).length,
    1,
  );

  const [goalEvents, scoredMatch] = await Promise.all([
    prisma.matchPlayerEvent.findMany({
      where: {
        matchId: match.id,
        type: "GOAL",
        voidedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.match.findUnique({
      where: { id: match.id },
      select: {
        homeScore: true,
        awayScore: true,
        scoreVersion: true,
      },
    }),
  ]);

  assert.equal(goalEvents.length, 1);
  assert.deepEqual(scoredMatch, {
    homeScore: 1,
    awayScore: 0,
    scoreVersion: 1,
  });
});

test("approved registration players synchronize into Player rows and appear in the scorer selector", async () => {
  const fixture = await createIntegrationFixture();
  await persistCompetitionStructure(fixture);

  const reviewer = await prisma.user.create({
    data: {
      email: `reviewer-${Date.now()}@sports-platform.local`,
      name: "Roster Reviewer",
      passwordHash: "test-password-hash",
      role: "OWNER",
    },
    select: {
      id: true,
    },
  });

  const registration = await createPendingTeamRegistration(
    {
      tournamentId: fixture.tournamentId,
      tournamentSlug: TOURNAMENT_SLUG,
      captainFirstName: "Giulia",
      captainLastName: "Esposito",
      captainEmail: "giulia@example.com",
      captainPhone: "+39 333 0000000",
      teamName: "Approved Roster FC",
      notes: "",
      players: [
        {
          firstName: "Luigi",
          lastName: "Calabrese",
          jerseyNumber: "9",
          role: "Pivot",
          sortOrder: 0,
        },
        {
          firstName: "Christian",
          lastName: "Proto",
          jerseyNumber: "10",
          role: "Laterale",
          sortOrder: 1,
        },
      ],
    },
    { db: prisma },
  );

  await prisma.$transaction((transaction) =>
    approvePendingTeamRegistrationRecord(transaction, {
      registrationId: registration.registrationId,
      tournamentSlug: TOURNAMENT_SLUG,
      reviewedByUserId: reviewer.id,
    }),
  );

  const approvedRegistration = await prisma.teamRegistration.findUnique({
    where: { id: registration.registrationId },
    select: {
      teamId: true,
      status: true,
    },
  });

  assert.equal(approvedRegistration?.status, "APPROVED");
  assert(approvedRegistration?.teamId);
  const approvedTeamId = approvedRegistration.teamId;

  const createdPlayers = await prisma.player.findMany({
    where: {
      teamId: approvedTeamId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      jerseyNumber: true,
      role: true,
      teamId: true,
    },
  });

  assert.deepEqual(
    createdPlayers.map((player) => ({
      firstName: player.firstName,
      lastName: player.lastName,
      displayName: player.displayName,
      jerseyNumber: player.jerseyNumber,
      role: player.role,
      teamId: player.teamId,
    })),
    [
      {
        firstName: "Luigi",
        lastName: "Calabrese",
        displayName: "Luigi Calabrese",
        jerseyNumber: "9",
        role: "Pivot",
        teamId: approvedTeamId,
      },
      {
        firstName: "Christian",
        lastName: "Proto",
        displayName: "Christian Proto",
        jerseyNumber: "10",
        role: "Laterale",
        teamId: approvedTeamId,
      },
    ],
  );

  const luigiPlayerId = createdPlayers.find((player) => player.firstName === "Luigi")?.id;
  assert(luigiPlayerId);

  await prisma.$transaction((transaction) =>
    syncApprovedTeamPlayers(transaction, {
      organizationId: fixture.organizationId,
      teamId: approvedTeamId,
      players: [
        {
          firstName: "Luigi",
          lastName: "Calabrese",
          jerseyNumber: "99",
          role: "Pivot",
          sortOrder: 0,
        },
        {
          firstName: "Christian",
          lastName: "Proto",
          jerseyNumber: "10",
          role: "Laterale",
          sortOrder: 1,
        },
      ],
    }),
  );

  await prisma.$transaction((transaction) =>
    syncApprovedTeamPlayers(transaction, {
      organizationId: fixture.organizationId,
      teamId: approvedTeamId,
      players: [
        {
          firstName: "Luigi",
          lastName: "Calabrese",
          jerseyNumber: "99",
          role: "Pivot",
          sortOrder: 0,
        },
        {
          firstName: "Christian",
          lastName: "Proto",
          jerseyNumber: "10",
          role: "Laterale",
          sortOrder: 1,
        },
      ],
    }),
  );

  const syncedPlayers = await prisma.player.findMany({
    where: {
      teamId: approvedTeamId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jerseyNumber: true,
    },
  });

  assert.equal(syncedPlayers.length, 2);
  assert.equal(
    syncedPlayers.find((player) => player.firstName === "Luigi")?.id,
    luigiPlayerId,
  );
  assert.equal(
    syncedPlayers.find((player) => player.firstName === "Luigi")?.jerseyNumber,
    "99",
  );

  const selectorMatch = await prisma.match.create({
    data: {
      tournamentId: fixture.tournamentId,
      homeTeamId: approvedTeamId,
      awayTeamId: fixture.teamFixtures[0]?.teamId,
      roundLabel: "Selector Check",
      status: MatchStatus.LIVE,
      homeScore: 0,
      awayScore: 0,
    },
    select: {
      id: true,
    },
  });

  const eventContext = await readDashboardMatchEventContext(selectorMatch.id);

  assert.deepEqual(
    eventContext.homePlayers.map((player) => ({
      displayName:
        player.displayName?.trim().length
          ? player.displayName.trim()
          : `${player.firstName} ${player.lastName}`.trim(),
      jerseyNumber: player.jerseyNumber,
      teamId: player.teamId,
    })),
    [
      {
        displayName: "Christian Proto",
        jerseyNumber: "10",
        teamId: approvedTeamId,
      },
      {
        displayName: "Luigi Calabrese",
        jerseyNumber: "99",
        teamId: approvedTeamId,
      },
    ],
  );
  assert(eventContext.homePlayers.every((player) => player.teamId === approvedTeamId));
  assert(
    eventContext.awayPlayers.every((player) => player.teamId === fixture.teamFixtures[0]?.teamId),
  );
});
