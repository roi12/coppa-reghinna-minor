import type {
  CompetitionGenerationPreview,
  CompetitionGroupAssignment,
  CompetitionMatchDefinition,
  CompetitionParticipantSource,
  CompetitionStageDefinition,
  CompetitionTeamInput,
} from "@/features/tournaments/types/competition.types";
import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";

type RoundRobinPairing = {
  homeTeamId: string;
  awayTeamId: string;
  roundNumber: number;
};

type GeneratorInput = {
  format: TournamentFormatValue;
  teams: CompetitionTeamInput[];
  stages: CompetitionStageDefinition[];
  groupAssignments?: CompetitionGroupAssignment[];
};

type GeneratorOutput = {
  matches: CompetitionMatchDefinition[];
  preview: CompetitionGenerationPreview;
};

type RoundRobinParticipant = CompetitionTeamInput | null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPairKey(leftTeamId: string, rightTeamId: string) {
  return [leftTeamId, rightTeamId].sort().join(":");
}

function ensureDistinctTeams(teams: CompetitionTeamInput[]) {
  const seenTournamentTeamIds = new Set<string>();
  const seenTeamIds = new Set<string>();

  for (const team of teams) {
    assert(!seenTournamentTeamIds.has(team.tournamentTeamId), "Tournament teams must be distinct.");
    assert(!seenTeamIds.has(team.teamId), "Team IDs must be distinct within the competition generator.");
    seenTournamentTeamIds.add(team.tournamentTeamId);
    seenTeamIds.add(team.teamId);
  }
}

function rotateRoundRobinParticipants(participants: RoundRobinParticipant[]) {
  const [fixedParticipant, ...rotatingParticipants] = participants;
  const lastParticipant = rotatingParticipants.pop();

  if (!fixedParticipant || !lastParticipant) {
    return participants;
  }

  return [fixedParticipant, lastParticipant, ...rotatingParticipants];
}

function buildSingleLegRoundRobinPairings(teams: CompetitionTeamInput[]): RoundRobinPairing[] {
  if (teams.length < 2) {
    return [];
  }

  const participants: RoundRobinParticipant[] = [...teams];

  if (participants.length % 2 === 1) {
    participants.push(null);
  }

  const totalRounds = participants.length - 1;
  const matchesPerRound = participants.length / 2;
  const pairings: RoundRobinPairing[] = [];
  let roundParticipants = participants;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    for (let pairingIndex = 0; pairingIndex < matchesPerRound; pairingIndex += 1) {
      const leftTeam = roundParticipants[pairingIndex];
      const rightTeam = roundParticipants[roundParticipants.length - 1 - pairingIndex];

      if (!leftTeam || !rightTeam) {
        continue;
      }

      const shouldSwapHomeAndAway = pairingIndex === 0 ? roundIndex % 2 === 1 : pairingIndex % 2 === 1;
      const homeTeam = shouldSwapHomeAndAway ? rightTeam : leftTeam;
      const awayTeam = shouldSwapHomeAndAway ? leftTeam : rightTeam;

      pairings.push({
        homeTeamId: homeTeam.teamId,
        awayTeamId: awayTeam.teamId,
        roundNumber: roundIndex + 1,
      });
    }

    roundParticipants = rotateRoundRobinParticipants(roundParticipants);
  }

  return pairings;
}

function buildRoundRobinPairings(teams: CompetitionTeamInput[], legs: number) {
  const firstLeg = buildSingleLegRoundRobinPairings(teams);

  if (legs === 1) {
    return firstLeg;
  }

  const pairings = [...firstLeg];
  const matchesPerLeg = firstLeg.length;
  const roundsPerLeg = teams.length < 2 ? 0 : (teams.length % 2 === 0 ? teams.length - 1 : teams.length);

  for (let legIndex = 2; legIndex <= legs; legIndex += 1) {
    for (let index = 0; index < matchesPerLeg; index += 1) {
      const pairing = firstLeg[index];

      pairings.push({
        homeTeamId: pairing.awayTeamId,
        awayTeamId: pairing.homeTeamId,
        roundNumber: pairing.roundNumber + roundsPerLeg * (legIndex - 1),
      });
    }
  }

  return pairings;
}

function createDirectTeamSource(team: CompetitionTeamInput): CompetitionParticipantSource {
  return {
    type: "DIRECT_TEAM",
    teamId: team.teamId,
    label: team.teamName,
  };
}

function createGroupPositionSource(
  groupAssignment: CompetitionGroupAssignment,
  position: number,
): CompetitionParticipantSource {
  return {
    type: "GROUP_POSITION",
    groupId: groupAssignment.groupId,
    groupName: groupAssignment.groupName,
    position,
    label: `${position}° ${groupAssignment.groupName}`,
  };
}

function createMatchWinnerSource(matchKey: string): CompetitionParticipantSource {
  return {
    type: "MATCH_WINNER",
    matchKey,
    label: `Vincente ${matchKey}`,
  };
}

function buildGroupsMap(groupAssignments: CompetitionGroupAssignment[]) {
  const groups = new Map<
    string,
    {
      groupId: string;
      groupName: string;
      groupSequence: number;
      teams: CompetitionGroupAssignment[];
    }
  >();

  for (const assignment of groupAssignments) {
    const existingGroup = groups.get(assignment.groupId);

    if (existingGroup) {
      existingGroup.teams.push(assignment);
      continue;
    }

    groups.set(assignment.groupId, {
      groupId: assignment.groupId,
      groupName: assignment.groupName,
      groupSequence: assignment.groupSequence,
      teams: [assignment],
    });
  }

  return Array.from(groups.values()).sort((left, right) => left.groupSequence - right.groupSequence);
}

function validateGroupAssignments(
  stage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }>,
  teams: CompetitionTeamInput[],
  groupAssignments: CompetitionGroupAssignment[],
) {
  assert(
    groupAssignments.length === teams.length,
    "Every tournament team must have a group assignment before grouped competition can be generated.",
  );

  const seenTournamentTeamIds = new Set<string>();
  const seenGroupSlots = new Set<string>();

  for (const assignment of groupAssignments) {
    assert(
      !seenTournamentTeamIds.has(assignment.tournamentTeamId),
      "A tournament team cannot belong to more than one group in the same stage.",
    );
    seenTournamentTeamIds.add(assignment.tournamentTeamId);

    const groupSlotKey = `${assignment.groupId}:${assignment.groupSlot}`;
    assert(!seenGroupSlots.has(groupSlotKey), "Group slots must be unique within each group.");
    seenGroupSlots.add(groupSlotKey);
  }

  const groups = buildGroupsMap(groupAssignments);
  assert(groups.length === stage.groupCount, `Expected ${stage.groupCount} groups but found ${groups.length}.`);

  for (const group of groups) {
    assert(
      group.teams.length === stage.teamsPerGroup,
      `${group.groupName} must contain exactly ${stage.teamsPerGroup} teams.`,
    );
  }
}

function buildGroupStageMatches(args: {
  format: TournamentFormatValue;
  stage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }>;
  groupAssignments: CompetitionGroupAssignment[];
}) {
  const groups = buildGroupsMap(args.groupAssignments);
  const matches: CompetitionMatchDefinition[] = [];
  const pairKeys = new Set<string>();
  const teamMatchCounts = new Map<string, number>();

  for (const group of groups) {
    const groupTeams = [...group.teams].sort((left, right) => left.groupSlot - right.groupSlot);
    const pairings = buildRoundRobinPairings(groupTeams, args.stage.legs);

    for (const pairing of pairings) {
      const pairKey = `${group.groupId}:${buildPairKey(pairing.homeTeamId, pairing.awayTeamId)}:${pairing.roundNumber}`;
      assert(!pairKeys.has(pairKey), `Duplicate pairing detected inside ${group.groupName}.`);
      pairKeys.add(pairKey);

      teamMatchCounts.set(
        pairing.homeTeamId,
        (teamMatchCounts.get(pairing.homeTeamId) ?? 0) + 1,
      );
      teamMatchCounts.set(
        pairing.awayTeamId,
        (teamMatchCounts.get(pairing.awayTeamId) ?? 0) + 1,
      );

      const homeTeam = groupTeams.find((team) => team.teamId === pairing.homeTeamId);
      const awayTeam = groupTeams.find((team) => team.teamId === pairing.awayTeamId);

      assert(homeTeam && awayTeam, "Group-stage pairings must resolve to assigned teams.");

      matches.push({
        key: `${group.groupName.replace(/\s+/g, "")}-MD${pairing.roundNumber}-${matches.length + 1}`,
        format: args.format,
        stageId: args.stage.stageId,
        stageOrder: args.stage.order,
        stageType: args.stage.type,
        stageName: args.stage.name,
        groupId: group.groupId,
        groupName: group.groupName,
        knockoutRound: null,
        roundNumber: pairing.roundNumber,
        sequence: matches.length + 1,
        roundLabel: `${group.groupName} · Giornata ${pairing.roundNumber}`,
        home: createDirectTeamSource(homeTeam),
        away: createDirectTeamSource(awayTeam),
      });
    }
  }

  const expectedMatchesPerTeam = (args.stage.teamsPerGroup - 1) * args.stage.legs;

  for (const assignment of args.groupAssignments) {
    assert(
      (teamMatchCounts.get(assignment.teamId) ?? 0) === expectedMatchesPerTeam,
      `Each group-stage team must play exactly ${expectedMatchesPerTeam} matches.`,
    );
  }

  return matches;
}

function buildInitialKnockoutSourcesFromGroups(
  stage: Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }>,
  groupAssignments: CompetitionGroupAssignment[],
  groupStage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }>,
) {
  const groups = buildGroupsMap(groupAssignments);
  assert(
    groups.length * groupStage.qualifiersPerGroup === stage.knockoutTeamCount,
    "The knockout entry size must match the number of qualifying group positions.",
  );
  assert(groupStage.qualifiersPerGroup >= 2, "At least two qualifiers per group are required.");

  const pairingRule = stage.pairingRule ?? "CROSS_ADJACENT_GROUPS";
  assert(
    pairingRule === "CROSS_ADJACENT_GROUPS",
    "Only CROSS_ADJACENT_GROUPS pairing is currently supported for group-to-knockout qualification.",
  );

  const orderedSources = groups.map((group) => ({
    winner: createGroupPositionSource(group.teams[0], 1),
    runnerUp: createGroupPositionSource(group.teams[0], 2),
  }));

  assert(
    orderedSources.length % 2 === 0,
    "Grouped knockout qualification requires an even number of groups.",
  );

  const firstRoundMatches: Array<{
    matchKey: string;
    home: CompetitionParticipantSource;
    away: CompetitionParticipantSource;
  }> = [];

  let matchNumber = 1;

  for (let index = 0; index < orderedSources.length; index += 2) {
    const leftGroup = orderedSources[index];
    const rightGroup = orderedSources[index + 1];

    firstRoundMatches.push({
      matchKey: `QF${matchNumber}`,
      home: leftGroup.winner,
      away: rightGroup.runnerUp,
    });
    matchNumber += 1;

    firstRoundMatches.push({
      matchKey: `QF${matchNumber}`,
      home: rightGroup.winner,
      away: leftGroup.runnerUp,
    });
    matchNumber += 1;
  }

  return firstRoundMatches;
}

function buildInitialKnockoutSourcesFromTeams(
  stage: Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }>,
  teams: CompetitionTeamInput[],
) {
  assert(
    teams.length === stage.knockoutTeamCount,
    `Knockout-only competitions require exactly ${stage.knockoutTeamCount} teams.`,
  );

  const orderedTeams = [...teams].sort((left, right) => {
    const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;

    if (leftSeed !== rightSeed) {
      return leftSeed - rightSeed;
    }

    return left.teamName.localeCompare(right.teamName, undefined, { sensitivity: "base" });
  });

  const firstRoundMatches: Array<{
    matchKey: string;
    home: CompetitionParticipantSource;
    away: CompetitionParticipantSource;
  }> = [];

  const roundPrefix = stage.knockoutRound === "QUARTER_FINAL" ? "QF" : stage.knockoutRound === "SEMI_FINAL" ? "SF" : "KO";

  for (let index = 0; index < orderedTeams.length / 2; index += 1) {
    const homeTeam = orderedTeams[index];
    const awayTeam = orderedTeams[orderedTeams.length - 1 - index];

    firstRoundMatches.push({
      matchKey: `${roundPrefix}${index + 1}`,
      home: createDirectTeamSource(homeTeam),
      away: createDirectTeamSource(awayTeam),
    });
  }

  return firstRoundMatches;
}

function getNextKnockoutRound(currentRound: CompetitionMatchDefinition["knockoutRound"]) {
  switch (currentRound) {
    case "ROUND_OF_32":
      return "ROUND_OF_16";
    case "ROUND_OF_16":
      return "QUARTER_FINAL";
    case "QUARTER_FINAL":
      return "SEMI_FINAL";
    case "SEMI_FINAL":
      return "FINAL";
    case "FINAL":
    case "THIRD_PLACE":
    case null:
      return null;
  }
}

function getKnockoutRoundLabel(round: CompetitionMatchDefinition["knockoutRound"], matchIndex: number) {
  switch (round) {
    case "ROUND_OF_32":
      return `Sedicesimo ${matchIndex}`;
    case "ROUND_OF_16":
      return `Ottavo ${matchIndex}`;
    case "QUARTER_FINAL":
      return `QF${matchIndex}`;
    case "SEMI_FINAL":
      return `SF${matchIndex}`;
    case "FINAL":
      return "Finale";
    case "THIRD_PLACE":
      return "Finale 3° posto";
    case null:
      return `KO${matchIndex}`;
  }
}

function buildKnockoutMatches(args: {
  format: TournamentFormatValue;
  stage: Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }>;
  teams: CompetitionTeamInput[];
  groupAssignments: CompetitionGroupAssignment[];
  previousGroupStage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }> | null;
}) {
  assert(
    Number.isInteger(args.stage.knockoutTeamCount) &&
      args.stage.knockoutTeamCount > 1 &&
      (args.stage.knockoutTeamCount & (args.stage.knockoutTeamCount - 1)) === 0,
    "Knockout stages require a power-of-two entry size.",
  );

  let currentRound = args.stage.knockoutRound;
  assert(currentRound !== "FINAL" || args.stage.knockoutTeamCount === 2, "A final can only start with 2 teams.");

  const firstRoundMatches =
    args.previousGroupStage === null
      ? buildInitialKnockoutSourcesFromTeams(args.stage, args.teams)
      : buildInitialKnockoutSourcesFromGroups(args.stage, args.groupAssignments, args.previousGroupStage);

  const matches: CompetitionMatchDefinition[] = [];
  let currentSources = firstRoundMatches.map((match, index) => ({
    matchKey: match.matchKey,
    sequence: index + 1,
    home: match.home,
    away: match.away,
  }));
  let roundNumber = 1;

  while (currentRound && currentSources.length > 0) {
    for (const sourceMatch of currentSources) {
      matches.push({
        key: sourceMatch.matchKey,
        format: args.format,
        stageId: args.stage.stageId,
        stageOrder: args.stage.order,
        stageType: args.stage.type,
        stageName: args.stage.name,
        groupId: null,
        groupName: null,
        knockoutRound: currentRound,
        roundNumber,
        sequence: matches.length + 1,
        roundLabel: getKnockoutRoundLabel(currentRound, sourceMatch.sequence),
        home: sourceMatch.home,
        away: sourceMatch.away,
      });
    }

    if (currentRound === "FINAL") {
      break;
    }

    if (currentRound === "SEMI_FINAL" && args.stage.includeThirdPlaceMatch) {
      const [semiFinalOne, semiFinalTwo] = currentSources;
      assert(semiFinalOne && semiFinalTwo, "Third-place matches require two semi-finals.");

      matches.push({
        key: "THIRD_PLACE",
        format: args.format,
        stageId: args.stage.stageId,
        stageOrder: args.stage.order,
        stageType: args.stage.type,
        stageName: args.stage.name,
        groupId: null,
        groupName: null,
        knockoutRound: "THIRD_PLACE",
        roundNumber: roundNumber + 1,
        sequence: matches.length + 1,
        roundLabel: "Finale 3° posto",
        home: {
          type: "MATCH_LOSER",
          matchKey: semiFinalOne.matchKey,
          label: `Perdente ${semiFinalOne.matchKey}`,
        },
        away: {
          type: "MATCH_LOSER",
          matchKey: semiFinalTwo.matchKey,
          label: `Perdente ${semiFinalTwo.matchKey}`,
        },
      });
    }

    const nextRound = getNextKnockoutRound(currentRound);

    if (!nextRound) {
      break;
    }

    const oddMatches = currentSources.filter((_, index) => index % 2 === 0);
    const evenMatches = currentSources.filter((_, index) => index % 2 === 1);
    const orderedPairs =
      currentRound === "QUARTER_FINAL" && currentSources.length === 4
        ? [oddMatches, evenMatches]
        : [currentSources];
    const nextRoundSources: Array<{
      matchKey: string;
      sequence: number;
      home: CompetitionParticipantSource;
      away: CompetitionParticipantSource;
    }> = [];

    for (const lane of orderedPairs) {
      for (let index = 0; index < lane.length; index += 2) {
        const leftMatch = lane[index];
        const rightMatch = lane[index + 1];

        if (!leftMatch || !rightMatch) {
          continue;
        }

        nextRoundSources.push({
          matchKey: nextRound === "SEMI_FINAL" ? `SF${nextRoundSources.length + 1}` : nextRound === "FINAL" ? "FINAL" : `${nextRound}_${nextRoundSources.length + 1}`,
          sequence: nextRoundSources.length + 1,
          home: createMatchWinnerSource(leftMatch.matchKey),
          away: createMatchWinnerSource(rightMatch.matchKey),
        });
      }
    }

    currentSources = nextRoundSources;
    currentRound = nextRound;
    roundNumber += 1;
  }

  return matches;
}

export function generateCompetitionStructure(input: GeneratorInput): GeneratorOutput {
  ensureDistinctTeams(input.teams);
  assert(input.stages.length > 0, "At least one competition stage is required.");

  const orderedStages = [...input.stages].sort((left, right) => left.order - right.order);
  const groupStage = orderedStages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }> =>
      stage.type === "GROUP_STAGE",
  );
  const knockoutStage = orderedStages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }> =>
      stage.type === "KNOCKOUT_STAGE",
  );

  let matches: CompetitionMatchDefinition[] = [];

  if (input.format === "SINGLE_ROUND_ROBIN" || input.format === "DOUBLE_ROUND_ROBIN") {
    const stage = groupStage;
    assert(stage, "Round-robin competitions require a league/group stage definition.");

    const roundRobinStage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }> = {
      ...stage,
      groupCount: 1,
      teamsPerGroup: input.teams.length,
      legs: input.format === "DOUBLE_ROUND_ROBIN" ? 2 : 1,
      qualifiersPerGroup: stage.qualifiersPerGroup,
    };

    const assignments = input.teams.map((team, index) => ({
      ...team,
      groupId: "league",
      groupName: "Girone unico",
      groupSequence: 1,
      groupSlot: index + 1,
    }));

    matches = buildGroupStageMatches({
      format: input.format,
      stage: roundRobinStage,
      groupAssignments: assignments,
    }).map((match) => ({
      ...match,
      groupId: null,
      groupName: null,
      roundLabel: `Giornata ${match.roundNumber}`,
    }));
  } else if (input.format === "GROUPS_ONLY" || input.format === "GROUPS_THEN_KNOCKOUT") {
    assert(groupStage, "Grouped competitions require a group stage definition.");
    assert(input.groupAssignments, "Grouped competitions require explicit group assignments.");
    validateGroupAssignments(groupStage, input.teams, input.groupAssignments);

    matches = buildGroupStageMatches({
      format: input.format,
      stage: groupStage,
      groupAssignments: input.groupAssignments,
    });

    if (input.format === "GROUPS_THEN_KNOCKOUT") {
      assert(knockoutStage, "Groups then knockout requires a knockout stage definition.");

      matches = [
        ...matches,
        ...buildKnockoutMatches({
          format: input.format,
          stage: knockoutStage,
          teams: input.teams,
          groupAssignments: input.groupAssignments,
          previousGroupStage: groupStage,
        }),
      ];
    }
  } else {
    assert(knockoutStage, "Knockout competitions require a knockout stage definition.");

    matches = buildKnockoutMatches({
      format: input.format,
      stage: knockoutStage,
      teams: input.teams,
      groupAssignments: input.groupAssignments ?? [],
      previousGroupStage: null,
    });
  }

  const preview: CompetitionGenerationPreview = {
    format: input.format,
    teamCount: input.teams.length,
    groupCount: groupStage?.groupCount ?? 0,
    matchesByStage: orderedStages.map((stage) => ({
      stageId: stage.stageId,
      stageName: stage.name,
      stageType: stage.type,
      matchCount: matches.filter((match) => match.stageId === stage.stageId).length,
    })),
    totalMatchCount: matches.length,
  };

  return {
    matches,
    preview,
  };
}
