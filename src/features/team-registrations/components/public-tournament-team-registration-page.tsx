import Image from "next/image";
import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { CaptainManageLinkReveal } from "@/features/team-registrations/components/captain-manage-link-reveal";
import { PublicTeamRegistrationForm } from "@/features/team-registrations/components/public-team-registration-form";
import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";
import { BRAND } from "@/lib/brand";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";
import { formatDateRangeLabel } from "@/lib/format-date";

type PublicTournamentTeamRegistrationPageProps = {
  slug: string;
  feedback: DashboardFeedback | null;
  manageLinkReveal: TeamRegistrationManageLinkReveal | null;
};

export async function PublicTournamentTeamRegistrationPage({
  slug,
  feedback,
  manageLinkReveal,
}: PublicTournamentTeamRegistrationPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const registrationsOpen = tournament.status === "PUBLISHED";

  return (
    <div className="grid w-full max-w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <aside className="w-full max-w-full min-w-0 rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/95 p-3 shadow-sm">
            <Image
              src={BRAND.logoPath}
              alt={BRAND.appName}
              width={72}
              height={72}
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${BRAND.classes.accentText}`}>
              {BRAND.appName}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Registra la tua squadra
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {BRAND.tagline}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <ul className="grid gap-3 leading-6">
            <li>Registra la tua squadra come capitano del roster.</li>
            <li>Minimo 5 giocatori, massimo 11 giocatori.</li>
            <li>Inserisci nome, cognome, numero maglia da 0 a 99 e ruolo per ogni atleta.</li>
            <li>L’iscrizione verrà controllata dall’organizzazione.</li>
            <li>Solo dopo l’approvazione la squadra sarà visibile pubblicamente.</li>
            <li>
              Il pagamento non avviene online; eventuali istruzioni per bonifico saranno fornite
              separatamente dagli organizzatori.
            </li>
          </ul>
        </div>

        <dl className="mt-6 grid gap-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Iscrizione</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {registrationsOpen ? "Aperta per il torneo pubblicato" : "Chiusa"}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Rosa</dt>
            <dd className="mt-1 font-medium text-slate-900">Da 5 a 11 giocatori</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Periodo torneo</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatDateRangeLabel(tournament.startsAt, tournament.endsAt)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Località</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {tournament.locationLabel ?? "Da definire"}
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {BRAND.supportContact.label}
            </dt>
            <dd className="mt-1 min-w-0 break-words font-medium text-slate-900">
              {BRAND.supportContact.value}
            </dd>
            <p className="mt-1 text-xs leading-5 text-slate-500">{BRAND.supportContact.note}</p>
          </div>
        </dl>
      </aside>

      <section className="w-full max-w-full min-w-0 rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Modulo capitano
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {registrationsOpen ? "Registra una nuova squadra" : "Iscrizioni chiuse"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {registrationsOpen
                ? "Inserisci i dati del capitano, il nome della squadra e una rosa da 5 a 11 giocatori per inviare l’iscrizione all’organizzazione."
                : "Questo torneo non accetta più iscrizioni pubbliche per le squadre."}
            </p>
          </div>

          <FeedbackBanner feedback={feedback} />
        </div>

        {manageLinkReveal ? (
          <CaptainManageLinkReveal tournamentSlug={slug} reveal={manageLinkReveal} />
        ) : null}

        {registrationsOpen ? (
          <div className="mt-6 w-full max-w-full min-w-0">
            <PublicTeamRegistrationForm tournamentId={tournament.id} tournamentSlug={tournament.slug} />
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
            L&apos;iscrizione è disponibile solo mentre il torneo è pubblicato. Le squadre già
            visibili nella rosa pubblica sono state approvate dall&apos;organizzazione.
          </div>
        )}
      </section>
    </div>
  );
}
