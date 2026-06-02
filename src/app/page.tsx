import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className={`min-h-screen px-6 py-14 text-slate-950 sm:px-10 ${BRAND.classes.pageBackground}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white/95 shadow-sm">
          <div className={`grid gap-8 p-8 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] ${BRAND.classes.heroBackground}`}>
            <div className="flex items-start gap-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-3 shadow-sm">
                <Image
                  src={BRAND.logoPath}
                  alt={BRAND.appName}
                  width={92}
                  height={92}
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${BRAND.classes.accentText}`}>
                  {BRAND.sport}
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {BRAND.appName}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
                  {BRAND.tagline}
                </p>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
              <p className="text-sm leading-7 text-slate-700">
                Una piattaforma semplice per i capitani e affidabile per gli organizzatori:
                iscrizione della squadra, approvazione, calendario, risultati e classifica in un
                unico spazio pubblico pronto da condividere.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre</p>
                  <p className="mt-1 font-semibold text-slate-950">Registrazione capitani</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Calendario</p>
                  <p className="mt-1 font-semibold text-slate-950">Partite e risultati</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Classifica</p>
                  <p className="mt-1 font-semibold text-slate-950">Aggiornata dai risultati finali</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-white px-8 py-6 sm:px-10">
            <Link
              href="/tournaments"
              className={`rounded-full px-5 py-3 text-sm font-medium ${BRAND.classes.primaryButton}`}
            >
              Vai ai tornei
            </Link>
            <Link
              href="/login"
              className={`rounded-full px-5 py-3 text-sm font-medium ${BRAND.classes.secondaryButton}`}
            >
              Accesso organizzatori
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-300 bg-white/92 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Iscrizione</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Capitani e roster</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              I capitani possono registrare una squadra con minimo 5 e massimo 11 giocatori.
            </p>
          </article>
          <article className="rounded-3xl border border-slate-300 bg-white/92 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Approvazione</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Controllo organizzazione</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Le richieste restano in attesa fino alla verifica dell’organizzazione.
            </p>
          </article>
          <article className="rounded-3xl border border-slate-300 bg-white/92 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Matchday</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Calendario e risultati</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Le partite pubblicate mostrano programma, punteggi finali e attività del torneo.
            </p>
          </article>
          <article className="min-w-0 rounded-3xl border border-slate-300 bg-white/92 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Supporto</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{BRAND.supportContact.label}</h2>
            <p className="mt-2 min-w-0 break-words text-sm leading-6 text-slate-600">
              {BRAND.supportContact.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{BRAND.supportContact.note}</p>
          </article>
        </section>
      </div>
    </main>
  );
}
