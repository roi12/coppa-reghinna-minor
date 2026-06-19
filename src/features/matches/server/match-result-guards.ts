type MatchParticipantSnapshot = {
  homeTeamId: string | null;
  awayTeamId: string | null;
};

export function getMatchParticipantValidationError(match: MatchParticipantSnapshot) {
  if (!match.homeTeamId || !match.awayTeamId) {
    return "La partita deve avere entrambe le squadre assegnate prima di registrare un risultato o marcarla come live.";
  }

  if (match.homeTeamId === match.awayTeamId) {
    return "La partita deve avere due squadre diverse prima di registrare un risultato o marcarla come live.";
  }

  return null;
}

