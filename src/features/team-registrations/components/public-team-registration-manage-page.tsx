import type { TeamRegistrationManageDetail } from "@/features/team-registrations/types/team-registration.types";
import { formatDateTimeLabel } from "@/lib/format-date";
import { TOURNAMENT_DOCUMENTS } from "@/lib/tournament-documents";

type PublicTeamRegistrationManagePageProps = {
  registration: TeamRegistrationManageDetail;
};

const statusLabels: Record<TeamRegistrationManageDetail["status"], string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
};

const statusBadgeClassNames: Record<TeamRegistrationManageDetail["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export function PublicTeamRegistrationManagePage({
  registration,
}: PublicTeamRegistrationManagePageProps) {
  const captainFullName = `${registration.captainFirstName} ${registration.captainLastName}`.trim();

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Link privato capitano
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {registration.teamName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Questa pagina mostra lo stato dell&apos;iscrizione per il torneo{" "}
              <span className="font-medium text-slate-900">{registration.tournamentName}</span>.
              Le modifiche non sono ancora disponibili in questa fase.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusBadgeClassNames[registration.status]}`}
          >
            {statusLabels[registration.status]}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Capitano</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{captainFullName}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-950">
              {registration.captainEmail}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Telefono</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{registration.captainPhone}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Rosa</p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {registration.players.length} giocatori
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Inviata</p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatDateTimeLabel(registration.createdAt)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Aggiornata</p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatDateTimeLabel(registration.updatedAt)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Link emesso</p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {registration.captainManageTokenIssuedAt
                ? formatDateTimeLabel(registration.captainManageTokenIssuedAt)
                : "Non disponibile"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Ultimo accesso link
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {registration.captainManageTokenLastUsedAt
                ? formatDateTimeLabel(registration.captainManageTokenLastUsedAt)
                : "Primo accesso"}
            </p>
          </div>
        </div>

        {registration.notes ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Note inviate</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{registration.notes}</p>
          </div>
        ) : null}

        {registration.reviewedAt ? (
          <p className="mt-4 text-sm text-slate-500">
            Revisione registrata il {formatDateTimeLabel(registration.reviewedAt)}
            {registration.reviewedByName ? ` da ${registration.reviewedByName}` : ""}.
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            L&apos;organizzazione non ha ancora completato la revisione di questa iscrizione.
          </p>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Moduli da scaricare
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Documenti per completare l&apos;iscrizione
          </h2>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600">
            <p>
              Scarica i moduli qui sotto e compila solo quelli richiesti per la tua squadra.
            </p>
            <p>
              I partecipanti maggiorenni devono usare il modulo per maggiorenni. I partecipanti
              minorenni devono usare il modulo per minorenni con firma del genitore o del tutore.
            </p>
            <p>
              L&apos;informativa privacy / GDPR riguarda il trattamento dei dati personali necessari
              alla partecipazione al torneo.
            </p>
            <p>
              Il caricamento digitale dei documenti arriver&agrave; in una fase successiva. Per ora
              questa pagina resta solo consultabile.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {TOURNAMENT_DOCUMENTS.map((document) => (
            <div
              key={document.id}
              className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-950">{document.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{document.description}</p>
              </div>
              <a
                href={document.href}
                download={document.downloadName}
                className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950 sm:w-fit"
              >
                Scarica PDF
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Rosa inviata
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Riepilogo giocatori
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Questa vista &egrave; solo informativa. Le modifiche arriveranno in una fase
            successiva.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {registration.players.map((player) => (
            <div
              key={player.id}
              className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-[minmax(0,1.5fr)_auto_auto]"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-950">
                  {player.firstName} {player.lastName}
                </p>
                <p className="text-slate-500">{player.role ?? "Ruolo non indicato"}</p>
              </div>
              <span className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700">
                #{player.jerseyNumber}
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Giocatore {player.sortOrder + 1}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
