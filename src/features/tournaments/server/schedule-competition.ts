import type {
  CompetitionMatchDefinition,
  ScheduledCompetitionMatch,
  SchedulingSettings,
} from "@/features/tournaments/types/competition.types";

const DEFAULT_ALLOWED_WEEKDAYS = [1, 2, 3, 4] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function buildUtcSlotDate(date: Date, startMinutes: number) {
  const slotDate = startOfUtcDay(date);
  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;
  slotDate.setUTCHours(hours, minutes, 0, 0);
  return slotDate;
}

function buildUtcSlotEnd(startsAt: Date, durationMinutes: number) {
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

function getCalendarDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getUtcWeekday(date: Date) {
  return date.getUTCDay();
}

function normalizeAllowedWeekdays(allowedWeekdays: number[] | undefined) {
  const weekdays = allowedWeekdays ?? [...DEFAULT_ALLOWED_WEEKDAYS];

  assert(weekdays.length > 0, "At least one allowed scheduling weekday is required.");

  const uniqueWeekdays = [...new Set(weekdays)];

  for (const weekday of uniqueWeekdays) {
    assert(
      Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
      "Allowed scheduling weekdays must be integers between 0 and 6.",
    );
  }

  return uniqueWeekdays.sort((left, right) => left - right);
}

function moveToNextAllowedSchedulingDate(date: Date, allowedWeekdays: number[]) {
  let nextDate = startOfUtcDay(date);

  while (!allowedWeekdays.includes(getUtcWeekday(nextDate))) {
    nextDate = addUtcDays(nextDate, 1);
  }

  return nextDate;
}

function getKnownParticipantTeamIds(match: CompetitionMatchDefinition) {
  const teamIds: string[] = [];

  if (match.home.type === "DIRECT_TEAM") {
    teamIds.push(match.home.teamId);
  }

  if (match.away.type === "DIRECT_TEAM") {
    teamIds.push(match.away.teamId);
  }

  return teamIds;
}

function getMatchDependencyKeys(match: CompetitionMatchDefinition) {
  const dependencyKeys = new Set<string>();

  for (const participant of [match.home, match.away]) {
    if (participant.type === "MATCH_WINNER" || participant.type === "MATCH_LOSER") {
      assert(
        participant.matchKey.trim().length > 0,
        "Knockout participant dependencies must reference a source match.",
      );
      dependencyKeys.add(participant.matchKey);
    }
  }

  return Array.from(dependencyKeys);
}

type DailyMatchBlock = {
  stageId: string;
  stageOrder: number;
  roundNumber: number;
  matches: CompetitionMatchDefinition[];
};

function groupMatchesIntoBlocks(matches: CompetitionMatchDefinition[]) {
  const blocks = new Map<string, DailyMatchBlock>();

  for (const match of matches) {
    const key = `${match.stageOrder}:${match.stageId}:${match.roundNumber}`;
    const existingBlock = blocks.get(key);

    if (existingBlock) {
      existingBlock.matches.push(match);
      continue;
    }

    blocks.set(key, {
      stageId: match.stageId,
      stageOrder: match.stageOrder,
      roundNumber: match.roundNumber,
      matches: [match],
    });
  }

  return Array.from(blocks.values()).sort((left, right) => {
    if (left.stageOrder !== right.stageOrder) {
      return left.stageOrder - right.stageOrder;
    }

    return left.roundNumber - right.roundNumber;
  });
}

function buildDependencyGraph(matches: CompetitionMatchDefinition[]) {
  const matchesByKey = new Map(matches.map((match) => [match.key, match]));
  assert(matchesByKey.size === matches.length, "Duplicate match keys detected in the competition structure.");
  const dependenciesByKey = new Map<string, string[]>();
  const dependentsByKey = new Map<string, Set<string>>();

  for (const match of matches) {
    const dependencies = getMatchDependencyKeys(match);
    dependenciesByKey.set(match.key, dependencies);

    for (const dependencyKey of dependencies) {
      const sourceMatch = matchesByKey.get(dependencyKey);

      assert(
        sourceMatch,
        `The competition structure references missing source match "${dependencyKey}".`,
      );

      const dependents = dependentsByKey.get(dependencyKey) ?? new Set<string>();
      dependents.add(match.key);
      dependentsByKey.set(dependencyKey, dependents);
    }
  }

  const inDegree = new Map(matches.map((match) => [match.key, dependenciesByKey.get(match.key)?.length ?? 0]));
  const readyQueue = matches
    .filter((match) => (inDegree.get(match.key) ?? 0) === 0)
    .sort((left, right) => {
      if (left.stageOrder !== right.stageOrder) {
        return left.stageOrder - right.stageOrder;
      }

      if (left.roundNumber !== right.roundNumber) {
        return left.roundNumber - right.roundNumber;
      }

      return left.sequence - right.sequence;
    });
  const orderedMatches: CompetitionMatchDefinition[] = [];

  while (readyQueue.length > 0) {
    const match = readyQueue.shift();

    if (!match) {
      continue;
    }

    orderedMatches.push(match);

    for (const dependentKey of dependentsByKey.get(match.key) ?? []) {
      const nextDegree = (inDegree.get(dependentKey) ?? 0) - 1;
      inDegree.set(dependentKey, nextDegree);

      if (nextDegree === 0) {
        const dependentMatch = matchesByKey.get(dependentKey);

        assert(dependentMatch, `The competition structure references missing match "${dependentKey}".`);
        readyQueue.push(dependentMatch);
        readyQueue.sort((left, right) => {
          if (left.stageOrder !== right.stageOrder) {
            return left.stageOrder - right.stageOrder;
          }

          if (left.roundNumber !== right.roundNumber) {
            return left.roundNumber - right.roundNumber;
          }

          return left.sequence - right.sequence;
        });
      }
    }
  }

  assert(
    orderedMatches.length === matches.length,
    "The competition structure contains a circular participant dependency.",
  );

  return {
    orderedMatches,
    dependenciesByKey,
  };
}

function canScheduleMatchOnDate(
  match: CompetitionMatchDefinition,
  date: Date,
  minimumRestDays: number,
  teamLastDayMap: Map<string, string>,
  dependenciesByKey: Map<string, string[]>,
  scheduledMatchesByKey: Map<string, ScheduledCompetitionMatch>,
) {
  const targetDayKey = getCalendarDayKey(date);

  for (const dependencyKey of dependenciesByKey.get(match.key) ?? []) {
    const sourceMatch = scheduledMatchesByKey.get(dependencyKey);

    assert(
      sourceMatch,
      `The competition structure references unresolved source match "${dependencyKey}".`,
    );

    const sourceDay = startOfUtcDay(sourceMatch.startsAt);
    const earliestDependentDay = addUtcDays(sourceDay, minimumRestDays + 1);

    if (date.getTime() < earliestDependentDay.getTime()) {
      return false;
    }
  }

  for (const teamId of getKnownParticipantTeamIds(match)) {
    const lastDayKey = teamLastDayMap.get(teamId);

    if (!lastDayKey) {
      continue;
    }

    const lastDay = new Date(`${lastDayKey}T00:00:00.000Z`);
    const targetDay = new Date(`${targetDayKey}T00:00:00.000Z`);
    const diffDays = Math.round((targetDay.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays <= minimumRestDays) {
      return false;
    }
  }

  return true;
}

export function estimateMinimumMatchDays(matchCount: number, maxMatchesPerDay: number) {
  if (matchCount === 0) {
    return 0;
  }

  return Math.ceil(matchCount / maxMatchesPerDay);
}

export function scheduleCompetition(
  matches: CompetitionMatchDefinition[],
  settings: SchedulingSettings,
): ScheduledCompetitionMatch[] {
  assert(matches.length > 0, "At least one abstract match is required for scheduling.");
  assert(settings.maxMatchesPerDay > 0, "The scheduler requires at least one match slot per day.");
  assert(settings.slots.length > 0, "At least one schedule slot must be configured.");
  assert(
    settings.maxMatchesPerDay <= settings.slots.length,
    "The maximum matches per day cannot exceed the configured number of daily slots.",
  );

  const sortedSlots = [...settings.slots].sort((left, right) => left.sequence - right.sequence);
  const allowedWeekdays = normalizeAllowedWeekdays(settings.allowedWeekdays);
  const blocks = groupMatchesIntoBlocks(matches);
  const scheduledMatches: ScheduledCompetitionMatch[] = [];
  const teamLastDayMap = new Map<string, string>();
  const scheduledMatchesByKey = new Map<string, ScheduledCompetitionMatch>();
  const { dependenciesByKey } = buildDependencyGraph(matches);
  let currentDate = moveToNextAllowedSchedulingDate(settings.startDate, allowedWeekdays);
  let previousStageId: string | null = null;

  for (const block of blocks) {
    if (previousStageId && previousStageId !== block.stageId) {
      currentDate = moveToNextAllowedSchedulingDate(
        addUtcDays(currentDate, settings.stageBreakDaysByStageId[previousStageId] ?? 0),
        allowedWeekdays,
      );
    }

    const queue = [...block.matches].sort((left, right) => left.sequence - right.sequence);

    while (queue.length > 0) {
      const dayAssignments: ScheduledCompetitionMatch[] = [];
      let scheduledMatchThisDay = false;

      for (const slot of sortedSlots.slice(0, settings.maxMatchesPerDay)) {
        const nextMatchIndex = queue.findIndex((match) =>
          canScheduleMatchOnDate(
            match,
            currentDate,
            settings.minimumRestDays,
            teamLastDayMap,
            dependenciesByKey,
            scheduledMatchesByKey,
          ),
        );

        if (nextMatchIndex === -1) {
          continue;
        }

        const [match] = queue.splice(nextMatchIndex, 1);

        if (!match) {
          continue;
        }

        const startsAt = buildUtcSlotDate(currentDate, slot.startMinutes);
        const endsAt = buildUtcSlotEnd(startsAt, slot.durationMinutes);
        const calendarDayKey = getCalendarDayKey(currentDate);

        dayAssignments.push({
          ...match,
          startsAt,
          endsAt,
          calendarDayKey,
        });
        scheduledMatchThisDay = true;
        scheduledMatchesByKey.set(match.key, dayAssignments[dayAssignments.length - 1]!);

        for (const teamId of getKnownParticipantTeamIds(match)) {
          teamLastDayMap.set(teamId, calendarDayKey);
        }
      }

      if (!scheduledMatchThisDay) {
        currentDate = moveToNextAllowedSchedulingDate(addUtcDays(currentDate, 1), allowedWeekdays);
        continue;
      }

      scheduledMatches.push(...dayAssignments);
      currentDate = moveToNextAllowedSchedulingDate(addUtcDays(currentDate, 1), allowedWeekdays);
    }

    previousStageId = block.stageId;
  }

  return scheduledMatches;
}
