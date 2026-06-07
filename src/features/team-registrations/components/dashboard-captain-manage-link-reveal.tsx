"use client";

import { useEffect } from "react";

import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";

type DashboardCaptainManageLinkRevealProps = {
  tournamentSlug: string;
  reveal: TeamRegistrationManageLinkReveal;
};

export function DashboardCaptainManageLinkReveal({
  tournamentSlug,
  reveal,
}: DashboardCaptainManageLinkRevealProps) {
  useEffect(() => {
    void fetch(`/dashboard/tournaments/${tournamentSlug}/captain-manage-link/consume`, {
      method: "POST",
      credentials: "same-origin",
    });
  }, [tournamentSlug]);

  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <h4 className="text-base font-semibold tracking-tight">Nuovo link privato capitano</h4>
      <p className="mt-2 leading-6">
        Copia e invia subito questo link al capitano. Non verr&agrave; mostrato di nuovo in questa
        pagina dopo il primo caricamento.
      </p>
      <p className="mt-2 font-medium leading-6">Il vecchio link non sar&agrave; pi&ugrave; valido.</p>
      <a
        href={reveal.managePath}
        className="mt-4 block break-all rounded-2xl border border-amber-300 bg-white px-4 py-3 font-medium text-amber-900 underline underline-offset-4"
      >
        {reveal.manageUrl}
      </a>
    </div>
  );
}
