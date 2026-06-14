"use server";

import { redirect } from "next/navigation";

import { manageTeamRegistrationGdprDocumentSchema } from "@/features/team-registrations/schemas/manage-team-registration-gdpr-document.schema";
import { manageTeamRegistrationPlayerDocumentSchema } from "@/features/team-registrations/schemas/manage-team-registration-player-document.schema";
import { buildCaptainManagePath, hashCaptainManageToken } from "@/features/team-registrations/server/captain-manage-link";
import { prisma } from "@/lib/prisma";
import {
  buildTeamRegistrationGdprDocumentPath,
  buildTeamRegistrationPlayerDocumentPath,
  deletePrivateBucketObject,
  getSupabaseTeamDocumentsBucketName,
  uploadPrivateBucketObject,
  validateTeamRegistrationPlayerDocumentFile,
} from "@/lib/supabase-storage";

type ManageRegistrationAccess = {
  registrationId: string;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  captainFirstName: string;
  captainLastName: string;
  gdprDocumentFilePath: string | null;
};

type ManageRegistrationPlayerAccess = {
  registrationId: string;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  player: {
    id: string;
    firstName: string;
    lastName: string;
    documentFilePath: string | null;
  };
};

function redirectWithMessage(
  tournamentSlug: string,
  token: string,
  type: "success" | "error",
  message: string,
  options?: {
    documentAction?: "upload" | "paper-delivery";
    documentTarget?: "player" | "gdpr";
    playerId?: string;
  },
): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  if (options?.playerId) {
    searchParams.set("playerId", options.playerId);
  }

  if (options?.documentAction) {
    searchParams.set("documentAction", options.documentAction);
  }

  if (options?.documentTarget) {
    searchParams.set("documentTarget", options.documentTarget);
  }

  redirect(`${buildCaptainManagePath(tournamentSlug, token)}?${searchParams.toString()}`);
}

function readManageGdprDocumentActionInput(formData: FormData) {
  return manageTeamRegistrationGdprDocumentSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    token: formData.get("token"),
  });
}

function readManageDocumentActionInput(formData: FormData) {
  return manageTeamRegistrationPlayerDocumentSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    token: formData.get("token"),
    playerId: formData.get("playerId"),
  });
}

async function getManageRegistrationAccess(
  tournamentSlug: string,
  token: string,
): Promise<ManageRegistrationAccess | null> {
  const registration = await prisma.teamRegistration.findFirst({
    where: {
      captainManageTokenHash: hashCaptainManageToken(token),
      captainManageTokenRevokedAt: null,
      tournament: {
        slug: tournamentSlug,
      },
    },
    select: {
      id: true,
      captainFirstName: true,
      captainLastName: true,
      status: true,
      gdprDocumentFilePath: true,
    },
  });

  if (!registration) {
    return null;
  }

  return {
    registrationId: registration.id,
    registrationStatus: registration.status,
    captainFirstName: registration.captainFirstName,
    captainLastName: registration.captainLastName,
    gdprDocumentFilePath: registration.gdprDocumentFilePath,
  };
}

async function getManageRegistrationPlayerAccess(
  tournamentSlug: string,
  token: string,
  playerId: string,
): Promise<ManageRegistrationPlayerAccess | null> {
  const player = await prisma.teamRegistrationPlayer.findFirst({
    where: {
      id: playerId,
      registration: {
        captainManageTokenHash: hashCaptainManageToken(token),
        captainManageTokenRevokedAt: null,
        tournament: {
          slug: tournamentSlug,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentFilePath: true,
      registration: {
        select: {
          id: true,
          teamName: true,
          status: true,
        },
      },
    },
  });

  if (!player) {
    return null;
  }

  return {
    registrationId: player.registration.id,
    registrationStatus: player.registration.status,
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      documentFilePath: player.documentFilePath,
    },
  };
}

async function deletePreviousStoredDocumentIfPresent(documentFilePath: string | null) {
  if (!documentFilePath) {
    return;
  }

  try {
    await deletePrivateBucketObject(getSupabaseTeamDocumentsBucketName(), documentFilePath);
  } catch (error) {
    console.error("Failed to delete previous team document", error);
  }
}

export async function uploadTeamRegistrationGdprDocumentAction(formData: FormData) {
  const parsed = readManageGdprDocumentActionInput(formData);

  if (!parsed.success) {
    return redirect("/tournaments?type=error&message=Link%20privato%20non%20valido.");
  }

  const { tournamentSlug, token } = parsed.data;
  const access = await getManageRegistrationAccess(tournamentSlug, token);

  if (!access) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Iscrizione non trovata per questo link privato.",
      {
        documentAction: "upload",
        documentTarget: "gdpr",
      },
    );
  }

  if (access.registrationStatus === "REJECTED") {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "I documenti non sono modificabili per un'iscrizione rifiutata.",
      {
        documentAction: "upload",
        documentTarget: "gdpr",
      },
    );
  }

  const fileValue = formData.get("documentFile");

  if (!(fileValue instanceof File)) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Seleziona un file PDF, JPG o PNG da caricare.",
      {
        documentAction: "upload",
        documentTarget: "gdpr",
      },
    );
  }

  const fileValidationError = validateTeamRegistrationPlayerDocumentFile(fileValue);

  if (fileValidationError) {
    return redirectWithMessage(tournamentSlug, token, "error", fileValidationError, {
      documentAction: "upload",
      documentTarget: "gdpr",
    });
  }

  try {
    const bucketName = getSupabaseTeamDocumentsBucketName();
    const objectPath = buildTeamRegistrationGdprDocumentPath({
      registrationId: access.registrationId,
      originalFileName: fileValue.name,
    });

    await uploadPrivateBucketObject({
      bucketName,
      objectPath,
      body: await fileValue.arrayBuffer(),
      contentType: fileValue.type,
    });

    await prisma.teamRegistration.update({
      where: {
        id: access.registrationId,
      },
      data: {
        gdprDocumentFilePath: objectPath,
        gdprDocumentFileName: fileValue.name,
        gdprDocumentMimeType: fileValue.type,
        gdprDocumentSizeBytes: fileValue.size,
        gdprDocumentUploadedAt: new Date(),
        gdprPaperDeliveryMarkedAt: null,
        captainManageTokenLastUsedAt: new Date(),
      },
    });

    await deletePreviousStoredDocumentIfPresent(access.gdprDocumentFilePath);
  } catch (error) {
    console.error("Team registration GDPR document upload failed", error);

    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Caricamento non disponibile. Controlla la configurazione di Supabase Storage e riprova.",
      {
        documentAction: "upload",
        documentTarget: "gdpr",
      },
    );
  }

  return redirectWithMessage(
    tournamentSlug,
    token,
    "success",
    `Documento privacy / GDPR caricato per ${access.captainFirstName} ${access.captainLastName}.`,
    {
      documentAction: "upload",
      documentTarget: "gdpr",
    },
  );
}

export async function uploadTeamRegistrationPlayerDocumentAction(formData: FormData) {
  const parsed = readManageDocumentActionInput(formData);

  if (!parsed.success) {
    return redirect("/tournaments?type=error&message=Link%20privato%20non%20valido.");
  }

  const { tournamentSlug, token, playerId } = parsed.data;
  const access = await getManageRegistrationPlayerAccess(tournamentSlug, token, playerId);

  if (!access) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Giocatore non trovato per questo link privato.",
      {
        documentAction: "upload",
        documentTarget: "player",
        playerId,
      },
    );
  }

  if (access.registrationStatus === "REJECTED") {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "I documenti non sono modificabili per un'iscrizione rifiutata.",
      {
        documentAction: "upload",
        documentTarget: "player",
        playerId,
      },
    );
  }

  const fileValue = formData.get("documentFile");

  if (!(fileValue instanceof File)) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Seleziona un file PDF, JPG o PNG da caricare.",
      {
        documentAction: "upload",
        documentTarget: "player",
        playerId,
      },
    );
  }

  const fileValidationError = validateTeamRegistrationPlayerDocumentFile(fileValue);

  if (fileValidationError) {
    return redirectWithMessage(tournamentSlug, token, "error", fileValidationError, {
      documentAction: "upload",
      documentTarget: "player",
      playerId,
    });
  }

  try {
    const bucketName = getSupabaseTeamDocumentsBucketName();
    const objectPath = buildTeamRegistrationPlayerDocumentPath({
      registrationId: access.registrationId,
      playerId: access.player.id,
      originalFileName: fileValue.name,
    });

    await uploadPrivateBucketObject({
      bucketName,
      objectPath,
      body: await fileValue.arrayBuffer(),
      contentType: fileValue.type,
    });

    await prisma.teamRegistrationPlayer.update({
      where: {
        id: access.player.id,
      },
      data: {
        documentStatus: "UPLOADED",
        documentFilePath: objectPath,
        documentFileName: fileValue.name,
        documentMimeType: fileValue.type,
        documentSizeBytes: fileValue.size,
        documentUploadedAt: new Date(),
        documentMarkedPaperAt: null,
      },
    });

    await prisma.teamRegistration.update({
      where: {
        id: access.registrationId,
      },
      data: {
        captainManageTokenLastUsedAt: new Date(),
      },
    });

    await deletePreviousStoredDocumentIfPresent(access.player.documentFilePath);
  } catch (error) {
    console.error("Team registration player document upload failed", error);

    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Caricamento non disponibile. Controlla la configurazione di Supabase Storage e riprova.",
      {
        documentAction: "upload",
        documentTarget: "player",
        playerId,
      },
    );
  }

  return redirectWithMessage(
    tournamentSlug,
    token,
    "success",
    `Documento caricato per ${access.player.firstName} ${access.player.lastName}.`,
    {
      documentAction: "upload",
      documentTarget: "player",
      playerId,
    },
  );
}

export async function markTeamRegistrationGdprPaperDeliveryAction(formData: FormData) {
  const parsed = readManageGdprDocumentActionInput(formData);

  if (!parsed.success) {
    return redirect("/tournaments?type=error&message=Link%20privato%20non%20valido.");
  }

  const { tournamentSlug, token } = parsed.data;
  const access = await getManageRegistrationAccess(tournamentSlug, token);

  if (!access) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Iscrizione non trovata per questo link privato.",
      {
        documentAction: "paper-delivery",
        documentTarget: "gdpr",
      },
    );
  }

  if (access.registrationStatus === "REJECTED") {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "I documenti non sono modificabili per un'iscrizione rifiutata.",
      {
        documentAction: "paper-delivery",
        documentTarget: "gdpr",
      },
    );
  }

  await prisma.teamRegistration.update({
    where: {
      id: access.registrationId,
    },
    data: {
      gdprDocumentFilePath: null,
      gdprDocumentFileName: null,
      gdprDocumentMimeType: null,
      gdprDocumentSizeBytes: null,
      gdprDocumentUploadedAt: null,
      gdprPaperDeliveryMarkedAt: new Date(),
      captainManageTokenLastUsedAt: new Date(),
    },
  });

  await deletePreviousStoredDocumentIfPresent(access.gdprDocumentFilePath);

  return redirectWithMessage(
    tournamentSlug,
    token,
    "success",
    `Consegna cartacea GDPR registrata per ${access.captainFirstName} ${access.captainLastName}.`,
    {
      documentAction: "paper-delivery",
      documentTarget: "gdpr",
    },
  );
}

export async function markTeamRegistrationPlayerPaperDeliveryAction(formData: FormData) {
  const parsed = readManageDocumentActionInput(formData);

  if (!parsed.success) {
    return redirect("/tournaments?type=error&message=Link%20privato%20non%20valido.");
  }

  const { tournamentSlug, token, playerId } = parsed.data;
  const access = await getManageRegistrationPlayerAccess(tournamentSlug, token, playerId);

  if (!access) {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Giocatore non trovato per questo link privato.",
      {
        documentAction: "paper-delivery",
        documentTarget: "player",
        playerId,
      },
    );
  }

  if (access.registrationStatus === "REJECTED") {
    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "I documenti non sono modificabili per un'iscrizione rifiutata.",
      {
        documentAction: "paper-delivery",
        documentTarget: "player",
        playerId,
      },
    );
  }

  await prisma.teamRegistrationPlayer.update({
    where: {
      id: access.player.id,
    },
    data: {
      documentStatus: "PAPER_DELIVERY",
      documentFilePath: null,
      documentFileName: null,
      documentMimeType: null,
      documentSizeBytes: null,
      documentUploadedAt: null,
      documentMarkedPaperAt: new Date(),
    },
  });

  await prisma.teamRegistration.update({
    where: {
      id: access.registrationId,
    },
    data: {
      captainManageTokenLastUsedAt: new Date(),
    },
  });

  await deletePreviousStoredDocumentIfPresent(access.player.documentFilePath);

  return redirectWithMessage(
    tournamentSlug,
    token,
    "success",
    `Consegna cartacea registrata per ${access.player.firstName} ${access.player.lastName}.`,
    {
      documentAction: "paper-delivery",
      documentTarget: "player",
      playerId,
    },
  );
}
