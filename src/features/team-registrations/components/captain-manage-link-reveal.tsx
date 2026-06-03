"use client";

import { useEffect } from "react";

import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";

type CaptainManageLinkRevealProps = {
  tournamentSlug: string;
  reveal: TeamRegistrationManageLinkReveal;
};

export function CaptainManageLinkReveal({
  tournamentSlug,
  reveal,
}: CaptainManageLinkRevealProps) {
  useEffect(() => {
    void fetch(`/tournaments/${tournamentSlug}/register-team/manage-link/consume`, {
      method: "POST",
      credentials: "same-origin",
    });
  }, [tournamentSlug]);

  return (
    <div className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <h3 className="text-base font-semibold tracking-tight">Link privato di gestione</h3>
      <p className="mt-2 leading-6">
        Salva subito questo link privato. Non verr&agrave; mostrato di nuovo in questa pagina
        dopo il primo caricamento.
      </p>
      <p className="mt-2 leading-6">
        Chiunque abbia questo link potr&agrave; accedere allo stato di questa iscrizione.
      </p>
      <a
        href={reveal.managePath}
        className="mt-4 block break-all rounded-2xl border border-amber-300 bg-white px-4 py-3 font-medium text-amber-900 underline underline-offset-4"
      >
        {reveal.manageUrl}
      </a>
    </div>
  );
}
