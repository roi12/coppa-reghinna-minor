"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
  markTeamRegistrationGdprPaperDeliveryAction,
  uploadTeamRegistrationGdprDocumentAction,
} from "@/features/team-registrations/server/team-registration-document-actions";
import type { TeamRegistrationManageDetail } from "@/features/team-registrations/types/team-registration.types";
import {
  TEAM_REGISTRATION_PLAYER_DOCUMENT_ACCEPT,
  TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_LABEL,
  formatTeamRegistrationDocumentSize,
  getTeamRegistrationGdprDocumentStatus,
  getTeamRegistrationPlayerDocumentValidationError,
  teamRegistrationPlayerDocumentStatusBadgeClassNames,
  teamRegistrationPlayerDocumentStatusLabels,
} from "@/features/team-registrations/utils/team-registration-player-documents";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";
import { formatDateTimeLabel } from "@/lib/format-date";

type PrivateManageCaptainGdprDocumentCardProps = {
  documentsEditable: boolean;
  feedback: DashboardFeedback | null;
  registration: Pick<
    TeamRegistrationManageDetail,
    | "captainFirstName"
    | "captainLastName"
    | "gdprDocumentFileName"
    | "gdprDocumentSizeBytes"
    | "gdprDocumentUploadedAt"
    | "gdprDocumentFilePath"
    | "gdprPaperDeliveryMarkedAt"
    | "tournamentSlug"
  >;
  token: string;
};

type PendingAction = "upload" | "paper-delivery" | null;

function getCardFeedbackTitle(feedback: DashboardFeedback | null) {
  if (!feedback) {
    return null;
  }

  if (feedback.type === "success" && feedback.documentAction === "upload") {
    return "Documento GDPR caricato";
  }

  if (feedback.type === "success" && feedback.documentAction === "paper-delivery") {
    return "Consegna cartacea salvata";
  }

  if (feedback.type === "error" && feedback.documentAction === "paper-delivery") {
    return "Salvataggio non riuscito";
  }

  return "Caricamento non riuscito";
}

export function PrivateManageCaptainGdprDocumentCard({
  documentsEditable,
  feedback,
  registration,
  token,
}: PrivateManageCaptainGdprDocumentCardProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const status = getTeamRegistrationGdprDocumentStatus(registration);
  const isPending = pendingAction !== null;
  const feedbackTitle = getCardFeedbackTitle(feedback);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setSelectedFileName(nextFile?.name ?? null);
    setClientError(nextFile ? getTeamRegistrationPlayerDocumentValidationError(nextFile) : null);
  }

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    if (isPending) {
      event.preventDefault();
      return;
    }

    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      event.preventDefault();
      setClientError("Seleziona un file PDF, JPG o PNG da caricare.");
      return;
    }

    const validationError = getTeamRegistrationPlayerDocumentValidationError(file);

    if (validationError) {
      event.preventDefault();
      setClientError(validationError);
      return;
    }

    setClientError(null);
    setPendingAction("upload");
  }

  function handlePaperSubmit(event: FormEvent<HTMLFormElement>) {
    if (isPending) {
      event.preventDefault();
      return;
    }

    setClientError(null);
    setPendingAction("paper-delivery");
  }

  return (
    <article className="grid gap-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-slate-950">
            {registration.captainFirstName} {registration.captainLastName}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Documento richiesto una sola volta per la squadra
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${teamRegistrationPlayerDocumentStatusBadgeClassNames[status]}`}
        >
          {teamRegistrationPlayerDocumentStatusLabels[status]}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Stato documento
        </p>
        {status === "UPLOADED" ? (
          <p className="mt-2 leading-6 text-slate-700">
            File caricato:{" "}
            <span className="font-medium text-slate-900">
              {registration.gdprDocumentFileName ?? "Documento GDPR"}
            </span>
            {registration.gdprDocumentUploadedAt
              ? ` · ${formatDateTimeLabel(registration.gdprDocumentUploadedAt)}`
              : ""}
            {formatTeamRegistrationDocumentSize(registration.gdprDocumentSizeBytes)
              ? ` · ${formatTeamRegistrationDocumentSize(registration.gdprDocumentSizeBytes)}`
              : ""}
          </p>
        ) : status === "PAPER_DELIVERY" ? (
          <p className="mt-2 leading-6 text-slate-700">
            Consegna cartacea registrata
            {registration.gdprPaperDeliveryMarkedAt
              ? ` il ${formatDateTimeLabel(registration.gdprPaperDeliveryMarkedAt)}`
              : ""}
            .
          </p>
        ) : (
          <p className="mt-2 leading-6 text-slate-700">
            Nessun documento privacy / GDPR registrato per il capitano.
          </p>
        )}
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedbackTitle ? <p className="text-sm font-semibold">{feedbackTitle}</p> : null}
          <p className="mt-1 text-sm leading-6">{feedback.message}</p>
        </div>
      ) : null}

      {clientError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Caricamento non riuscito</p>
          <p className="mt-1 leading-6">{clientError}</p>
        </div>
      ) : null}

      {documentsEditable ? (
        <div className="grid gap-3 border-t border-slate-200 pt-4">
          <form
            action={uploadTeamRegistrationGdprDocumentAction}
            className="grid gap-3"
            onSubmit={handleUploadSubmit}
          >
            <input type="hidden" name="tournamentSlug" value={registration.tournamentSlug} />
            <input type="hidden" name="token" value={token} />
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                {status === "UPLOADED" ? "Sostituisci documento GDPR" : "Carica documento GDPR"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                name="documentFile"
                accept={TEAM_REGISTRATION_PLAYER_DOCUMENT_ACCEPT}
                disabled={isPending}
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-slate-950 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </label>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
              <p>Formati accettati: PDF, JPG, PNG.</p>
              <p>Dimensione massima: {TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_LABEL}.</p>
              {selectedFileName ? (
                <p className="mt-1 font-medium text-slate-900">{selectedFileName}</p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isPending}
              aria-busy={pendingAction === "upload"}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {pendingAction === "upload"
                ? "Caricamento…"
                : status === "UPLOADED"
                  ? "Aggiorna file"
                  : "Carica file"}
            </button>
          </form>

          <form
            action={markTeamRegistrationGdprPaperDeliveryAction}
            className="grid gap-3"
            onSubmit={handlePaperSubmit}
          >
            <input type="hidden" name="tournamentSlug" value={registration.tournamentSlug} />
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              disabled={isPending}
              aria-busy={pendingAction === "paper-delivery"}
              className="inline-flex w-full items-center justify-center rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {pendingAction === "paper-delivery" ? "Salvataggio…" : "Consegna cartacea"}
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
