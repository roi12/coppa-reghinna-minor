export function getTournamentTeamAnchorId(teamId: string) {
  return `team-${teamId}`;
}

export function buildPublicTournamentTeamHref(slug: string, teamId: string) {
  const anchorId = getTournamentTeamAnchorId(teamId);
  return `/tournaments/${slug}/teams?team=${teamId}#${anchorId}`;
}
