"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  normalizePublicTournamentLiveState,
  type PublicTournamentLiveStateTransport,
} from "@/features/tournaments/types/public-tournament-live-state.types";

type LiveConnectionStatus = "connecting" | "connected" | "reconnecting" | "polling";

export function usePublicTournamentLiveState(
  slug: string,
  initialState: PublicTournamentLiveStateTransport,
) {
  const [state, setState] = useState(() => normalizePublicTournamentLiveState(initialState));
  const [connectionStatus, setConnectionStatus] = useState<LiveConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const refreshState = useEffectEvent(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const response = await fetch(`/api/tournaments/${slug}/live-state`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to refresh live match data.");
    }

    const nextState = normalizePublicTournamentLiveState(
      (await response.json()) as PublicTournamentLiveStateTransport,
    );

    if (requestId !== latestRequestIdRef.current) {
      return;
    }

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
