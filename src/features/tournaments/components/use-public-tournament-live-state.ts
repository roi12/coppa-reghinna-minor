"use client";

import { useEffect, useEffectEvent, useState } from "react";

import type { PublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";

type LiveConnectionStatus = "connecting" | "connected" | "reconnecting" | "polling";

export function usePublicTournamentLiveState(
  slug: string,
  initialState: PublicTournamentLiveState,
) {
  const [state, setState] = useState(initialState);
  const [connectionStatus, setConnectionStatus] = useState<LiveConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshState = useEffectEvent(async () => {
    const response = await fetch(`/api/tournaments/${slug}/live-state`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to refresh live match data.");
    }

    const nextState = (await response.json()) as PublicTournamentLiveState;
    setState(nextState);
    setErrorMessage(null);
  });

  useEffect(() => {
    let isDisposed = false;
    let eventSource: EventSource | null = null;

    const connect = () => {
      if (typeof window === "undefined" || !("EventSource" in window)) {
        setConnectionStatus("polling");
        return;
      }

      eventSource = new EventSource(`/api/tournaments/${slug}/stream`);

      eventSource.onopen = () => {
        if (!isDisposed) {
          setConnectionStatus("connected");
          setErrorMessage(null);
        }
      };

      eventSource.addEventListener("match-update", () => {
        void refreshState().catch((error) => {
          if (!isDisposed) {
            setErrorMessage(error instanceof Error ? error.message : "Live refresh failed.");
          }
        });
      });

      eventSource.onerror = () => {
        if (!isDisposed) {
          setConnectionStatus("reconnecting");
        }
      };
    };

    connect();

    const pollInterval = window.setInterval(() => {
      void refreshState().catch((error) => {
        if (!isDisposed) {
          setErrorMessage(error instanceof Error ? error.message : "Live refresh failed.");
        }
      });
    }, 5000);

    return () => {
      isDisposed = true;
      window.clearInterval(pollInterval);
      eventSource?.close();
    };
  }, [slug]);

  return {
    state,
    connectionStatus,
    errorMessage,
  };
}
