import type { MatchSummary } from "@/features/matches/types/match.types";

export function isPublicTournamentMatch(match: MatchSummary) {
  return match.stageId === null || match.stageIsPublic !== false;
}

export function filterPublicTournamentMatches(matches: MatchSummary[]) {
  return matches.filter(isPublicTournamentMatch);
}
