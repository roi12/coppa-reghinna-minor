type GeneratorTeam = {
  id: string;
  name: string;
};

type GeneratedRoundRobinMatch = {
  homeTeamId: string;
  awayTeamId: string;
  roundLabel: string;
  startsAt: Date;
};

type GroupStageGeneratorGroup = {
  groupId: string;
  groupName: string;
  teams: GeneratorTeam[];
};

type GeneratedGroupStageMatch = GeneratedRoundRobinMatch & {
  groupId: string;
};

type GenerateRoundRobinCalendarOptions = {
  teams: GeneratorTeam[];
  startDate: Date;
  intervalDays: number;
  defaultMatchTime?: string;
};

type PairingParticipant = GeneratorTeam | null;

function buildMatchDate(startDate: Date, roundIndex: number, intervalDays: number, defaultMatchTime?: string) {
  const scheduledDate = new Date(startDate);
  scheduledDate.setUTCDate(scheduledDate.getUTCDate() + roundIndex * intervalDays);

  if (defaultMatchTime) {
    const [hours, minutes] = defaultMatchTime.split(":").map(Number);
    scheduledDate.setUTCHours(hours, minutes, 0, 0);
  } else {
    scheduledDate.setUTCHours(0, 0, 0, 0);
  }

  return scheduledDate;
}

function rotateParticipants(participants: PairingParticipant[]) {
  const [fixed, ...rest] = participants;
  const last = rest.pop();

  if (!last) {
    return participants;
  }

  return [fixed, last, ...rest];
}

function selectHomeAndAwayTeams(
  leftTeam: GeneratorTeam,
  rightTeam: GeneratorTeam,
  roundIndex: number,
  pairingIndex: number,
) {
  const shouldSwap = pairingIndex === 0 ? roundIndex % 2 === 1 : pairingIndex % 2 === 1;

  return shouldSwap
    ? { homeTeamId: rightTeam.id, awayTeamId: leftTeam.id }
    : { homeTeamId: leftTeam.id, awayTeamId: rightTeam.id };
}

export function buildSingleRoundRobinCalendar({
  teams,
  startDate,
  intervalDays,
  defaultMatchTime,
}: GenerateRoundRobinCalendarOptions): GeneratedRoundRobinMatch[] {
  if (teams.length < 2) {
    return [];
  }

  const participants: PairingParticipant[] = [...teams];

  if (participants.length % 2 === 1) {
    participants.push(null);
  }

  const totalRounds = participants.length - 1;
  const matchesPerRound = participants.length / 2;
  const generatedMatches: GeneratedRoundRobinMatch[] = [];
  let roundParticipants = participants;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const startsAt = buildMatchDate(startDate, roundIndex, intervalDays, defaultMatchTime);

    for (let pairingIndex = 0; pairingIndex < matchesPerRound; pairingIndex += 1) {
      const leftTeam = roundParticipants[pairingIndex];
      const rightTeam = roundParticipants[roundParticipants.length - 1 - pairingIndex];

      if (!leftTeam || !rightTeam) {
        continue;
      }

      const pairing = selectHomeAndAwayTeams(leftTeam, rightTeam, roundIndex, pairingIndex);

      generatedMatches.push({
        ...pairing,
        roundLabel: `Round ${roundIndex + 1}`,
        startsAt,
      });
    }

    roundParticipants = rotateParticipants(roundParticipants);
  }

  return generatedMatches;
}

export function buildGroupStageCalendar({
  groups,
  startDate,
  intervalDays,
  defaultMatchTime,
}: {
  groups: GroupStageGeneratorGroup[];
  startDate: Date;
  intervalDays: number;
  defaultMatchTime?: string;
}): GeneratedGroupStageMatch[] {
  return groups.flatMap((group) =>
    buildSingleRoundRobinCalendar({
      teams: group.teams,
      startDate,
      intervalDays,
      defaultMatchTime,
    }).map((match) => ({
      ...match,
      groupId: group.groupId,
      roundLabel: `${group.groupName} - ${match.roundLabel}`,
    })),
  );
}

export function buildMatchPairKey(homeTeamId: string, awayTeamId: string) {
  return [homeTeamId, awayTeamId].sort().join(":");
}
