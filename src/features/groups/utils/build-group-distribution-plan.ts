import type {
  GroupDistributionAssignment,
  GroupDistributionPlan,
  GroupDistributionPlanGroup,
  GroupDistributionTeamInput,
} from "@/features/groups/types/group.types";

function compareDistributionTeams(
  left: GroupDistributionTeamInput,
  right: GroupDistributionTeamInput,
) {
  const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
  const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;

  if (leftSeed !== rightSeed) {
    return leftSeed - rightSeed;
  }

  const teamNameComparison = left.teamName.localeCompare(right.teamName, undefined, {
    sensitivity: "base",
  });

  if (teamNameComparison !== 0) {
    return teamNameComparison;
  }

  const createdAtComparison = left.createdAt.getTime() - right.createdAt.getTime();

  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return left.tournamentTeamId.localeCompare(right.tournamentTeamId);
}

export function getDefaultTournamentGroupName(sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Group sequence must be a positive integer.");
  }

  let remaining = sequence;
  let label = "";

  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }

  return `Group ${label}`;
}

export function buildGroupTargetSizes(teamCount: number, groupCount: number) {
  if (!Number.isInteger(teamCount) || teamCount < 0) {
    throw new Error("Team count must be a non-negative integer.");
  }

  if (!Number.isInteger(groupCount) || groupCount < 1) {
    throw new Error("Group count must be a positive integer.");
  }

  const baseGroupSize = Math.floor(teamCount / groupCount);
  const remainder = teamCount % groupCount;

  return Array.from({ length: groupCount }, (_, index) =>
    baseGroupSize + (index < remainder ? 1 : 0),
  );
}

function buildSnakeGroupOrder(groupCount: number, assignmentCount: number) {
  const order: number[] = [];
  let direction: 1 | -1 = 1;

  while (order.length < assignmentCount) {
    if (direction === 1) {
      for (let groupIndex = 0; groupIndex < groupCount && order.length < assignmentCount; groupIndex += 1) {
        order.push(groupIndex);
      }
    } else {
      for (
        let groupIndex = groupCount - 1;
        groupIndex >= 0 && order.length < assignmentCount;
        groupIndex -= 1
      ) {
        order.push(groupIndex);
      }
    }

    direction = direction === 1 ? -1 : 1;
  }

  return order;
}

export function buildGroupDistributionPlan(
  tournamentTeams: GroupDistributionTeamInput[],
  groupCount: number,
): GroupDistributionPlan {
  const sortedTournamentTeams = [...tournamentTeams].sort(compareDistributionTeams);
  const targetGroupSizes = buildGroupTargetSizes(sortedTournamentTeams.length, groupCount);
  const snakeOrder = buildSnakeGroupOrder(groupCount, sortedTournamentTeams.length);

  const groups: GroupDistributionPlanGroup[] = targetGroupSizes.map((targetSize, index) => ({
    groupSequence: index + 1,
    groupName: getDefaultTournamentGroupName(index + 1),
    targetSize,
    teams: [],
  }));

  let snakeCursor = 0;

  for (const tournamentTeam of sortedTournamentTeams) {
    while (
      snakeCursor < snakeOrder.length &&
      groups[snakeOrder[snakeCursor]].teams.length >= groups[snakeOrder[snakeCursor]].targetSize
    ) {
      snakeCursor += 1;
    }

    if (snakeCursor >= snakeOrder.length) {
      throw new Error("Unable to assign every tournament team to a group.");
    }

    const targetGroup = groups[snakeOrder[snakeCursor]];
    const assignment: GroupDistributionAssignment = {
      tournamentTeamId: tournamentTeam.tournamentTeamId,
      teamId: tournamentTeam.teamId,
      teamName: tournamentTeam.teamName,
      seed: tournamentTeam.seed,
      groupSequence: targetGroup.groupSequence,
      groupName: targetGroup.groupName,
      groupSlot: targetGroup.teams.length + 1,
    };

    targetGroup.teams.push(assignment);
    snakeCursor += 1;
  }

  return {
    groupCount,
    totalTeamCount: sortedTournamentTeams.length,
    isEven: targetGroupSizes.every((size) => size === targetGroupSizes[0]),
    targetGroupSizes,
    groups,
  };
}
