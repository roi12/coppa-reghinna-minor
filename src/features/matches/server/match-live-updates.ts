type MatchUpdateListener = (payload: { tournamentSlug: string; matchId: string; updatedAt: string }) => void;

const listenersByTournamentSlug = new Map<string, Set<MatchUpdateListener>>();

export function subscribeToTournamentMatchUpdates(
  tournamentSlug: string,
  listener: MatchUpdateListener,
) {
  const listeners = listenersByTournamentSlug.get(tournamentSlug) ?? new Set<MatchUpdateListener>();
  listeners.add(listener);
  listenersByTournamentSlug.set(tournamentSlug, listeners);

  return () => {
    const currentListeners = listenersByTournamentSlug.get(tournamentSlug);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);

    if (currentListeners.size === 0) {
      listenersByTournamentSlug.delete(tournamentSlug);
    }
  };
}

export function publishTournamentMatchUpdate(payload: {
  tournamentSlug: string;
  matchId: string;
  updatedAt?: Date;
}) {
  const listeners = listenersByTournamentSlug.get(payload.tournamentSlug);

  if (!listeners || listeners.size === 0) {
    return;
  }

  const eventPayload = {
    tournamentSlug: payload.tournamentSlug,
    matchId: payload.matchId,
    updatedAt: (payload.updatedAt ?? new Date()).toISOString(),
  };

  for (const listener of listeners) {
    listener(eventPayload);
  }
}
