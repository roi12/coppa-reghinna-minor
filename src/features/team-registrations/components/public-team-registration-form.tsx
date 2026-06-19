"use client";

import { useRef, useState } from "react";

import { FUTSAL_PLAYER_ROLE_OPTIONS } from "@/features/team-registrations/constants/futsal-player-roles";
import { submitTeamRegistrationAction } from "@/features/team-registrations/server/team-registration-actions";
import { BRAND } from "@/lib/brand";

type PublicTeamRegistrationFormProps = {
  tournamentId: string;
  tournamentSlug: string;
};

type PlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  role: string;
};

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 11;

function createPlayerRow(id: number): PlayerRow {
  return {
    id: `player-${id}`,
    firstName: "",
    lastName: "",
    jerseyNumber: "",
    role: "",
  };
}

function createInitialPlayers() {
  return Array.from({ length: MIN_PLAYERS }, (_, index) => createPlayerRow(index));
}

function isValidJerseyNumberInput(value: string) {
  return /^\d{0,2}$/.test(value);
}

export function PublicTeamRegistrationForm({
  tournamentId,
  tournamentSlug,
}: PublicTeamRegistrationFormProps) {
  const [players, setPlayers] = useState(createInitialPlayers);
  const nextPlayerIdRef = useRef(MIN_PLAYERS);

  function updatePlayer(id: string, field: keyof Omit<PlayerRow, "id">, value: string) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === id ? { ...player, [field]: value } : player)),
    );
  }

  function addPlayer() {
    setPlayers((currentPlayers) => {
      if (currentPlayers.length >= MAX_PLAYERS) {
        return currentPlayers;
      }

      const nextPlayer = createPlayerRow(nextPlayerIdRef.current);
      nextPlayerIdRef.current += 1;

      return [...currentPlayers, nextPlayer];
    });
  }

  function removePlayer(id: string) {
    setPlayers((currentPlayers) => {
      if (currentPlayers.length <= 1) {
        return currentPlayers;
      }

      return currentPlayers.filter((player) => player.id !== id);
    });
  }

  const squadSizeMessage =
    players.length < MIN_PLAYERS
      ? `Aggiungi almeno ${MIN_PLAYERS - players.length} ${MIN_PLAYERS - players.length === 1 ? "giocatore" : "giocatori"} prima di inviare.`
      : `${players.length} posti rosa utilizzati su ${MAX_PLAYERS}.`;

  return (
    <form
      action={submitTeamRegistrationAction}
      data-testid="team-registration-form"
      className="grid w-full max-w-full min-w-0 gap-8"
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

      <section className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Nome capitano
          <input
            name="captainFirstName"
            required
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Giulia"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Cognome capitano
          <input
            name="captainLastName"
            required
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Conti"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Email capitano
          <input
            type="email"
            name="captainEmail"
            required
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="capitano@example.com"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Telefono capitano
          <input
            type="tel"
            name="captainPhone"
            required
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="+39 347 123 4567"
          />
        </label>
      </section>

      <section className="grid w-full max-w-full min-w-0 gap-4">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Nome squadra
          <input
            name="teamName"
            required
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Reghinna Futsal"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Note
          <textarea
            name="notes"
            rows={4}
            className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            placeholder="Eventuali note utili per gli organizzatori."
          />
        </label>
      </section>

      <section className="grid w-full max-w-full min-w-0 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Rosa squadra</h2>
          <p className="mt-1 text-sm text-slate-600">
            Inserisci almeno 5 giocatori. I numeri di maglia non possono ripetersi nella stessa squadra.
          </p>
        </div>

        <p
          className={`text-sm ${
            players.length < MIN_PLAYERS ? "text-amber-700" : "text-slate-600"
          }`}
        >
          {squadSizeMessage}
        </p>

        <div className="grid w-full max-w-full min-w-0 gap-4">
          {players.map((player, index) => (
            <article
              key={player.id}
              data-testid="player-row"
              className="w-full max-w-full min-w-0 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">Giocatore {index + 1}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Dati giocatore
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePlayer(player.id)}
                  disabled={players.length <= 1}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-fit"
                >
                  Rimuovi
                </button>
              </div>

              <div className="mt-4 grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)]">
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Nome
                  <input
                    name="playerFirstName"
                    data-testid="player-first-name"
                    value={player.firstName}
                    onChange={(event) => updatePlayer(player.id, "firstName", event.target.value)}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Luca"
                  />
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Cognome
                  <input
                    name="playerLastName"
                    data-testid="player-last-name"
                    value={player.lastName}
                    onChange={(event) => updatePlayer(player.id, "lastName", event.target.value)}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Rossi"
                  />
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Numero maglia
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    pattern="[0-9]*"
                    autoComplete="off"
                    name="playerJerseyNumber"
                    data-testid="player-jersey-number"
                    value={player.jerseyNumber}
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      if (!isValidJerseyNumberInput(nextValue)) {
                        return;
                      }

                      updatePlayer(player.id, "jerseyNumber", nextValue);
                    }}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="10"
                  />
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Ruolo
                  <select
                    name="playerRole"
                    data-testid="player-role"
                    value={player.role}
                    onChange={(event) => updatePlayer(player.id, "role", event.target.value)}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    {FUTSAL_PLAYER_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.label} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={addPlayer}
            disabled={players.length >= MAX_PLAYERS}
            data-testid="add-player-button"
            className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-fit"
          >
            Aggiungi giocatore
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Dopo l&apos;invio l&apos;iscrizione resterà in attesa di approvazione. Subito dopo riceverai il link privato della squadra.
        </p>
        <button
          type="submit"
          className={`w-full rounded-full px-5 py-3 text-sm font-medium sm:w-fit ${BRAND.classes.primaryButton}`}
        >
          Invia iscrizione
        </button>
      </div>
    </form>
  );
}
