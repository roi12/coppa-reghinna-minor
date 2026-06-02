"use client";

import { useState } from "react";

type PublicShareLinkProps = {
  path: string;
  title: string;
};

export function PublicShareLink({ path, title }: PublicShareLinkProps) {
  const [feedbackLabel, setFeedbackLabel] = useState("Condividi");

  async function handleShare() {
    const url = `${window.location.origin}${path}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        setFeedbackLabel("Condiviso");
      } catch {
        setFeedbackLabel("Condividi");
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedbackLabel("Link copiato");
    } catch {
      setFeedbackLabel("Copia non riuscita");
    }

    window.setTimeout(() => {
      setFeedbackLabel("Condividi");
    }, 1800);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
    >
      {feedbackLabel}
    </button>
  );
}
