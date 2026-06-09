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
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusBadgeClassNames: Record<TeamRegistrationStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
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
          No captain registrations have been submitted for this tournament yet.
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
                  {status === "PENDING"
                    ? "Registrations waiting for organizer review."
                    : status === "APPROVED"
                      ? "Registrations already turned into real tournament teams."
                      : "Registrations declined without creating a team."}
                </p>
              </div>
              <span className="text-sm text-slate-500">{statusRegistrations.length} entries</span>
            </div>

            {statusRegistrations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No {status.toLowerCase()} registrations yet.
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                            Team registration
                          </p>
                          <h5 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                            {registration.teamName}
                          </h5>
                          <p className="mt-2 text-sm text-slate-600">
                            Submitted {formatDateTimeLabel(registration.createdAt)} by {captainFullName}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusBadgeClassNames[registration.status]}`}
                        >
                          {statusLabels[registration.status]}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Captain</p>
                          <p className="mt-1 text-sm font-medium text-slate-950">{captainFullName}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                          <p className="mt-1 break-all text-sm font-medium text-slate-950">
                            {registration.captainEmail}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
                          <p className="mt-1 text-sm font-medium text-slate-950">
                            {registration.captainPhone}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Roster</p>
                          <p className="mt-1 text-sm font-medium text-slate-950">
                            {registration.players.length} players
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 md:col-span-2 xl:col-span-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Documenti
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-950">
                            {documentSummary.uploaded} caricati · {documentSummary.paperDelivery}{" "}
                            cartacei · {documentSummary.missing} mancanti
                          </p>
                        </div>
                      </div>

                      {registration.notes ? (
                        <div className="mt-4 rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Notes</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{registration.notes}</p>
                        </div>
                      ) : null}

                      {registration.reviewedAt ? (
                        <p className="mt-4 text-sm text-slate-500">
                          Reviewed {formatDateTimeLabel(registration.reviewedAt)}
                          {registration.reviewedByName ? ` by ${registration.reviewedByName}` : ""}.
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-2">
                        {registration.players.map((player) => (
                          <div
                            key={player.id}
                            className="grid gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 sm:grid-cols-[minmax(0,1.5fr)_auto_auto]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-950">
                                {player.firstName} {player.lastName}
                              </p>
                              <p className="text-slate-500">{player.role ?? "Role not provided"}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {player.documentStatus === "UPLOADED"
                                  ? `File: ${player.documentFileName ?? "Documento caricato"}`
                                  : player.documentStatus === "PAPER_DELIVERY"
                                    ? "Documento previsto in consegna cartacea"
                                    : "Documento ancora mancante"}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700">
                              #{player.jerseyNumber}
                            </span>
                            <div className="justify-self-start sm:justify-self-end">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${teamRegistrationPlayerDocumentStatusBadgeClassNames[player.documentStatus]}`}
                              >
                                {teamRegistrationPlayerDocumentStatusLabels[player.documentStatus]}
                              </span>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                                Player {player.sortOrder + 1}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800">
                            Link capitano
                          </p>
                          <p className="mt-2 text-sm leading-6 text-amber-950">
                            Usa questa azione solo se il capitano ha perso il link o se devi
                            inviarne uno nuovo.
                          </p>
                          <p className="mt-2 text-sm font-medium text-amber-950">
                            Il vecchio link non sar&agrave; pi&ugrave; valido.
                          </p>
                          <form
                            action={resetCaptainManageLinkAction}
                            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
                          >
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

                        {registration.status === "PENDING" ? (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <form action={approveTeamRegistrationAction}>
                              <input type="hidden" name="registrationId" value={registration.id} />
                              <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
                              <button
                                type="submit"
                                className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white sm:w-fit"
                              >
                                Approve registration
                              </button>
                            </form>
                            <form action={rejectTeamRegistrationAction}>
                              <input type="hidden" name="registrationId" value={registration.id} />
                              <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
                              <button
                                type="submit"
                                className="w-full rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-700 sm:w-fit"
                              >
                                Reject registration
                              </button>
                            </form>
                          </div>
                        ) : null}
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
