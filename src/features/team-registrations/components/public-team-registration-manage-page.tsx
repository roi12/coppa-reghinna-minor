import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PrivateManagePlayerDocumentCard } from "@/features/team-registrations/components/private-manage-player-document-card";
import type { TeamRegistrationManageDetail } from "@/features/team-registrations/types/team-registration.types";
import {
  TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_LABEL,
  summarizeTeamRegistrationPlayerDocuments,
} from "@/features/team-registrations/utils/team-registration-player-documents";
import { formatDateTimeLabel } from "@/lib/format-date";
import { TOURNAMENT_DOCUMENTS } from "@/lib/tournament-documents";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";

type PublicTeamRegistrationManagePageProps = {
  feedback: DashboardFeedback | null;
  registration: TeamRegistrationManageDetail;
  token: string;
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
  feedback,
  registration,
  token,
}: PublicTeamRegistrationManagePageProps) {
  const captainFullName = `${registration.captainFirstName} ${registration.captainLastName}`.trim();
  const documentSummary = summarizeTeamRegistrationPlayerDocuments(registration.players);
  const documentsEditable = registration.status !== "REJECTED";
  const globalFeedback = feedback?.playerId ? null : feedback;
  const documentSectionTitle =
    registration.status === "APPROVED"
      ? "Rosa approvata, documenti ancora caricabili"
      : registration.status === "REJECTED"
        ? "Documenti non modificabili"
        : "Caricamento documenti giocatori";

  return (
    <div className="grid gap-6">
      <FeedbackBanner feedback={globalFeedback} />

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
              La rosa resta in sola lettura, ma i documenti dei giocatori possono essere caricati
              dal link privato finch&eacute; l&apos;iscrizione non viene rifiutata.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusBadgeClassNames[registration.status]}`}
          >
            {statusLabels[registration.status]}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Documenti</p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {documentSummary.uploaded} caricati · {documentSummary.paperDelivery} cartacei ·{" "}
              {documentSummary.missing} mancanti
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
              Dopo il download puoi caricare il documento compilato nella sezione giocatori qui
              sotto.
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
            Documenti giocatori
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {documentSectionTitle}
          </h2>
          <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-600">
            <p>Carica il documento compilato per ogni giocatore.</p>
            <p>
              Sono accettati PDF, JPG e PNG fino a {TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_LABEL}.
            </p>
            <p>
              Se il modulo verr&agrave; consegnato a mano, seleziona Consegna cartacea.
            </p>
            <p>Questo link &egrave; riservato alla squadra. Non condividerlo pubblicamente.</p>
            {registration.status === "APPROVED" ? (
              <p className="font-medium text-emerald-700">
                L&apos;iscrizione &egrave; approvata, ma puoi ancora completare i documenti dei
                giocatori.
              </p>
            ) : null}
            {registration.status === "REJECTED" ? (
              <p className="font-medium text-rose-700">
                L&apos;iscrizione &egrave; stata rifiutata. I documenti restano visibili ma non sono
                pi&ugrave; modificabili.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {registration.players.map((player) => (
            <PrivateManagePlayerDocumentCard
              key={player.id}
              documentsEditable={documentsEditable}
              feedback={feedback?.playerId === player.id ? feedback : null}
              player={player}
              token={token}
              tournamentSlug={registration.tournamentSlug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
