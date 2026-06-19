import { MatchStatus } from "@prisma/client";

export function hasProtectedMatches(
  matches: Array<{ status: MatchStatus; homeScore: number | null; awayScore: number | null }>,
) {
  return matches.some(
    (match) =>
      match.status === MatchStatus.FINAL ||
      match.status === MatchStatus.LIVE ||
      match.homeScore !== null ||
      match.awayScore !== null,
  );
}
