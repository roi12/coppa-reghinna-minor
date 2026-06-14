"use client";

import { useEffect, useState } from "react";

import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";

type CaptainManageLinkRevealProps = {
  tournamentSlug: string;
  reveal: TeamRegistrationManageLinkReveal | null;
};

export function CaptainManageLinkReveal({
  tournamentSlug,
  reveal,
}: CaptainManageLinkRevealProps) {
  const [copyFeedbackLabel, setCopyFeedbackLabel] = useState("Copia link");

  useEffect(() => {
    if (!reveal) {
      return;
    }

    void fetch(`/tournaments/${tournamentSlug}/register-team/manage-link/consume`, {
      method: "POST",
      credentials: "same-origin",
    });
  }, [reveal, tournamentSlug]);

  async function handleCopyLink() {
    if (!reveal) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reveal.manageUrl);
      setCopyFeedbackLabel("Link copiato");
    } catch {
      setCopyFeedbackLabel("Copia non riuscita");
    }

    window.setTimeout(() => {
      setCopyFeedbackLabel("Copia link");
    }, 1800);
  }

  return (
    <div className="mt-6 rounded-[1.75rem] border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-950 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Registrazione squadra
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-emerald-950">
        Iscrizione ricevuta
      </h3>
      <div className="mt-3 grid gap-2 leading-6 text-emerald-950/90">
        <p>
          La tua squadra &egrave; stata registrata correttamente. Ora devi completare la raccolta
          dei documenti prima che gli organizzatori possano approvare la squadra.
        </p>
        <p>
          La squadra dovr&agrave; essere verificata dagli organizzatori prima di comparire
          pubblicamente.
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-emerald-200 bg-white/90 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Link privato della squadra
        </p>
        <p className="mt-2 leading-6 text-slate-700">
          Questo &egrave; il link privato della squadra. Condividilo solo con i giocatori della
          tua squadra per permettere loro di caricare i documenti richiesti.
        </p>

        {reveal ? (
          <>
            <a
              href={reveal.managePath}
              className="mt-4 block break-all rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-900 underline underline-offset-4"
            >
              {reveal.manageUrl}
            </a>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:border-emerald-400 sm:w-fit"
              >
                {copyFeedbackLabel}
              </button>
              <p className="text-xs leading-5 text-slate-500">
                Conserva questo link: servir&agrave; per completare o aggiornare i documenti della
                squadra.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 leading-6 text-slate-700">
            Il link privato della squadra &egrave; gi&agrave; stato mostrato una volta in questa
            pagina ed &egrave; stato inviato anche via email al capitano. Se lo hai perso,
            contatta gli organizzatori per riceverne uno nuovo.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-emerald-200 bg-white/90 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Prossimi passi
        </p>
        <ol className="mt-3 grid gap-2 leading-6 text-slate-700">
          <li>1. Scarica i moduli richiesti.</li>
          <li>2. Carica il GDPR firmato dal capitano.</li>
          <li>3. Fai caricare a ogni giocatore il modulo di esonero/infortuni.</li>
          <li>4. Quando i documenti sono completi, gli organizzatori controlleranno la richiesta.</li>
          <li>5. La squadra sar&agrave; visibile pubblicamente solo dopo l&apos;approvazione.</li>
        </ol>
      </div>
    </div>
  );
}
