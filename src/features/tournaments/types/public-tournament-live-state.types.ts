import type { MatchSummary } from "@/features/matches/types/match.types";
import type {
  GroupStandingSummary,
  PreliminaryStandingsMode,
  StandingRow,
} from "@/features/standings/types/standings.types";
import type { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { parseOptionalDate } from "@/lib/parse-date";

type MatchSummaryTransport = Omit<
  MatchSummary,
  "startsAt" | "endsAt" | "liveStartedAt" | "finishedAt" | "lastScoreUpdatedAt"
> & {
  startsAt: string | null;
  endsAt: string | null;
  liveStartedAt: string | null;
  finishedAt: string | null;
  lastScoreUpdatedAt: string | null;
};

export type PublicTournamentLiveState = {
  generatedAt: Date;
  tournament: {
    id: string;
    slug: string;
    name: string;
    format: ReturnType<typeof normalizeTournamentFormat>;
    locationLabel: string | null;
    teamCount: number;
    completedMatchCount: number;
    knockoutStageIsPublic: boolean | null;
    preliminaryStandingsMode: PreliminaryStandingsMode;
    preliminaryStandingsLabel: string;
  };
  matches: MatchSummary[];
  standings: StandingRow[];
  groupStandings: GroupStandingSummary[];
};

export type PublicTournamentLiveStateTransport = {
  generatedAt: string;
  tournament: PublicTournamentLiveState["tournament"];
  matches: MatchSummaryTransport[];
  standings: StandingRow[];
  groupStandings: GroupStandingSummary[];
};

export function serializePublicTournamentLiveState(
  state: PublicTournamentLiveState,
): PublicTournamentLiveStateTransport {
  return {
    generatedAt: state.generatedAt.toISOString(),
    tournament: state.tournament,
    matches: state.matches.map((match) => ({
      ...match,
      startsAt: match.startsAt?.toISOString() ?? null,
      endsAt: match.endsAt?.toISOString() ?? null,
      liveStartedAt: match.liveStartedAt?.toISOString() ?? null,
      finishedAt: match.finishedAt?.toISOString() ?? null,
      lastScoreUpdatedAt: match.lastScoreUpdatedAt?.toISOString() ?? null,
    })),
    standings: state.standings,
    groupStandings: state.groupStandings,
  };
}

export function normalizePublicTournamentLiveState(
  state: PublicTournamentLiveState | PublicTournamentLiveStateTransport,
): PublicTournamentLiveState {
  return {
    generatedAt: parseOptionalDate(state.generatedAt) ?? new Date(0),
    tournament: state.tournament,
    matches: state.matches.map((match) => ({
      ...match,
      startsAt: parseOptionalDate(match.startsAt),
      endsAt: parseOptionalDate(match.endsAt),
      liveStartedAt: parseOptionalDate(match.liveStartedAt),
      finishedAt: parseOptionalDate(match.finishedAt),
      lastScoreUpdatedAt: parseOptionalDate(match.lastScoreUpdatedAt),
    })),
    standings: state.standings,
    groupStandings: state.groupStandings,
  };
}
