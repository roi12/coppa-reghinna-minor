import {
  approveTeamRegistrationAction,
  rejectTeamRegistrationAction,
  resetCaptainManageLinkAction,
} from "@/features/team-registrations/server/team-registration-actions";
import { DashboardCaptainManageLinkReveal } from "@/features/team-registrations/components/dashboard-captain-manage-link-reveal";
import type {
  TeamRegistrationDetail,
  TeamRegistrationManageLinkReveal,
  TeamRegistrationStatusValue,
} from "@/features/team-registrations/types/team-registration.types";
import {
  summarizeTeamRegistrationPlayerDocuments,
  teamRegistrationPlayerDocumentStatusBadgeClassNames,
  teamRegistrationPlayerDocumentStatusLabels,
} from "@/features/team-registrations/utils/team-registration-player-documents";
import { formatDateTimeLabel } from "@/lib/format-date";

type DashboardTeamRegistrationsPanelProps = {
  manageLinkReveal: TeamRegistrationManageLinkReveal | null;
  registrations: TeamRegistrationDetail[];
  tournamentSlug: string;
};

const registrationStatuses: TeamRegistrationStatusValue[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const statusLabels: Record<TeamRegistrationStatusValue, string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
};

const statusBadgeClassNames: Record<TeamRegistrationStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const statusDescriptions: Record<TeamRegistrationStatusValue, string> = {
  PENDING: "Iscrizioni in attesa di revisione da parte dell'organizzazione.",
  APPROVED: "Iscrizioni già trasformate in squadre reali del torneo.",
  REJECTED: "Iscrizioni rifiutate senza creare una squadra.",
};

const emptyStateLabels: Record<TeamRegistrationStatusValue, string> = {
  PENDING: "Nessuna iscrizione in attesa.",
  APPROVED: "Nessuna iscrizione approvata.",
  REJECTED: "Nessuna iscrizione rifiutata.",
};

export function DashboardTeamRegistrationsPanel({
  manageLinkReveal,
  registrations,
  tournamentSlug,
}: DashboardTeamRegistrationsPanelProps) {
  if (registrations.length === 0) {
    return (
      <div className="mt-5 grid gap-4">
        {manageLinkReveal ? (
          <DashboardCaptainManageLinkReveal
            tournamentSlug={tournamentSlug}
            reveal={manageLinkReveal}
          />
        ) : null}
        <p className="text-sm text-slate-600">
          Nessuna iscrizione capitano inviata per questo torneo.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-6">
      {manageLinkReveal ? (
        <DashboardCaptainManageLinkReveal
          tournamentSlug={tournamentSlug}
          reveal={manageLinkReveal}
        />
      ) : null}
      {registrationStatuses.map((status) => {
        const statusRegistrations = registrations.filter((registration) => registration.status === status);

        return (
          <section key={status} className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                  {statusLabels[status]}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {statusDescriptions[status]}
                </p>
              </div>
              <span className="text-sm text-slate-500">
                {statusRegistrations.length} {statusRegistrations.length === 1 ? "voce" : "voci"}
              </span>
            </div>

            {statusRegistrations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                {emptyStateLabels[status]}
              </div>
            ) : (
              <div className="grid gap-4">
                {statusRegistrations.map((registration) => {
                  const captainFullName =
                    `${registration.captainFirstName} ${registration.captainLastName}`.trim();
                  const documentSummary = summarizeTeamRegistrationPlayerDocuments(
                    registration.players,
                  );

                  return (
                    <article
                      key={registration.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                              Iscrizione squadra
                            </p>
                            <h5 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                              {registration.teamName}
                            </h5>
                            <p className="mt-2 text-sm text-slate-600">
                              Inviata il {formatDateTimeLabel(registration.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusBadgeClassNames[registration.status]}`}
                          >
                            {statusLabels[registration.status]}
                          </span>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                Capitano
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-950">
                                {captainFullName}
                              </p>
                              <p className="mt-1 break-all text-sm text-slate-600">
                                {registration.captainEmail}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {registration.captainPhone}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                Rosa
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-950">
                                {registration.players.length}{" "}
                                {registration.players.length === 1 ? "giocatore" : "giocatori"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Stato documenti visibile senza aprire i dettagli.
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Documenti
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                {documentSummary.uploaded} caricati
                              </span>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                                {documentSummary.paperDelivery} consegna cartacea
                              </span>
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                {documentSummary.missing} mancanti
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {registration.status === "PENDING" ? (
                            <>
                              <form action={approveTeamRegistrationAction} className="sm:flex-none">
                                <input type="hidden" name="registrationId" value={registration.id} />
                                <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
                                <button
                                  type="submit"
                                  className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white sm:w-fit"
                                >
                                  Approva
                                </button>
                              </form>
                              <form action={rejectTeamRegistrationAction} className="sm:flex-none">
                                <input type="hidden" name="registrationId" value={registration.id} />
                                <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
                                <button
                                  type="submit"
                                  className="w-full rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-700 sm:w-fit"
                                >
                                  Rifiuta
                                </button>
                              </form>
                            </>
                          ) : null}

                          <form action={resetCaptainManageLinkAction} className="sm:flex-none">
                            <input type="hidden" name="registrationId" value={registration.id} />
                            <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
                            <button
                              type="submit"
                              className="w-full rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-medium text-amber-900 sm:w-fit"
                            >
                              Rigenera link capitano
                            </button>
                          </form>
                        </div>

                        <details className="group rounded-2xl border border-slate-200 bg-white">
                          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex items-center gap-2">
                              <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                                Mostra / Nascondi dettagli
                              </span>
                              <span className="text-slate-500">
                                Apri rosa, documenti e note operative
                              </span>
                            </span>
                          </summary>

                          <div className="grid gap-4 border-t border-slate-200 px-4 py-4">
                            <section className="grid gap-3">
                              <h6 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Capitano
                              </h6>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Nome
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-950">
                                    {captainFullName}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Email
                                  </p>
                                  <p className="mt-1 break-all text-sm font-medium text-slate-950">
                                    {registration.captainEmail}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Telefono
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-950">
                                    {registration.captainPhone}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Inviata
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-950">
                                    {formatDateTimeLabel(registration.createdAt)}
                                  </p>
                                </div>
                              </div>

                              {registration.notes ? (
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Note
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-700">
                                    {registration.notes}
                                  </p>
                                </div>
                              ) : null}

                              {registration.reviewedAt ? (
                                <p className="text-sm text-slate-500">
                                  Revisione registrata il {formatDateTimeLabel(registration.reviewedAt)}
                                  {registration.reviewedByName
                                    ? ` da ${registration.reviewedByName}`
                                    : ""}
                                  .
                                </p>
                              ) : null}
                            </section>

                            <section className="grid gap-3">
                              <h6 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Giocatori
                              </h6>
                              <div className="grid gap-2">
                                {registration.players.map((player) => (
                                  <div
                                    key={player.id}
                                    className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-[minmax(0,1.5fr)_auto]"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-950">
                                        {player.firstName} {player.lastName}
                                      </p>
                                      <p className="text-slate-500">
                                        {player.role ?? "Ruolo non indicato"}
                                      </p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                        Giocatore {player.sortOrder + 1}
                                      </p>
                                    </div>
                                    <div className="flex items-start justify-between gap-2 sm:flex-col sm:items-end">
                                      <span className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700">
                                        #{player.jerseyNumber}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${teamRegistrationPlayerDocumentStatusBadgeClassNames[player.documentStatus]}`}
                                      >
                                        {teamRegistrationPlayerDocumentStatusLabels[player.documentStatus]}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="grid gap-3">
                              <h6 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Documenti
                              </h6>
                              <div className="grid gap-2">
                                {registration.players.map((player) => (
                                  <div
                                    key={`${player.id}-document`}
                                    className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="font-medium text-slate-950">
                                          {player.firstName} {player.lastName}
                                        </p>
                                        <p className="mt-1 leading-6 text-slate-600">
                                          {player.documentStatus === "UPLOADED"
                                            ? `File: ${player.documentFileName ?? "Documento caricato"}`
                                            : player.documentStatus === "PAPER_DELIVERY"
                                              ? "Documento previsto in consegna cartacea"
                                              : "Documento ancora mancante"}
                                        </p>
                                      </div>
                                      <span
                                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${teamRegistrationPlayerDocumentStatusBadgeClassNames[player.documentStatus]}`}
                                      >
                                        {teamRegistrationPlayerDocumentStatusLabels[player.documentStatus]}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="grid gap-3">
                              <h6 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Link privato
                              </h6>
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                                <p className="leading-6">
                                  Usa questa azione solo se il capitano ha perso il link o se devi
                                  inviarne uno nuovo.
                                </p>
                                <p className="mt-2 font-medium leading-6">
                                  Il vecchio link non sar&agrave; pi&ugrave; valido.
                                </p>
                              </div>
                            </section>
                          </div>
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
