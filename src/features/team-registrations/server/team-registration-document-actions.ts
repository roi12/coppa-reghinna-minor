"use server";

import { redirect } from "next/navigation";

import { manageTeamRegistrationPlayerDocumentSchema } from "@/features/team-registrations/schemas/manage-team-registration-player-document.schema";
import { buildCaptainManagePath, hashCaptainManageToken } from "@/features/team-registrations/server/captain-manage-link";
import { prisma } from "@/lib/prisma";
import {
  buildTeamRegistrationPlayerDocumentPath,
  deletePrivateBucketObject,
  getSupabaseTeamDocumentsBucketName,
  uploadPrivateBucketObject,
  validateTeamRegistrationPlayerDocumentFile,
} from "@/lib/supabase-storage";

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

  redirect(`${buildCaptainManagePath(tournamentSlug, token)}?${searchParams.toString()}`);
}

function readManageDocumentActionInput(formData: FormData) {
  return manageTeamRegistrationPlayerDocumentSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    token: formData.get("token"),
    playerId: formData.get("playerId"),
  });
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

async function deletePreviousPlayerDocumentIfPresent(documentFilePath: string | null) {
  if (!documentFilePath) {
    return;
  }

  try {
    await deletePrivateBucketObject(getSupabaseTeamDocumentsBucketName(), documentFilePath);
  } catch (error) {
    console.error("Failed to delete previous team document", error);
  }
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
        playerId,
      },
    );
  }

  const fileValidationError = validateTeamRegistrationPlayerDocumentFile(fileValue);

  if (fileValidationError) {
    return redirectWithMessage(tournamentSlug, token, "error", fileValidationError, {
      documentAction: "upload",
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

    await deletePreviousPlayerDocumentIfPresent(access.player.documentFilePath);
  } catch (error) {
    console.error("Team registration player document upload failed", error);

    return redirectWithMessage(
      tournamentSlug,
      token,
      "error",
      "Caricamento non disponibile. Controlla la configurazione di Supabase Storage e riprova.",
      {
        documentAction: "upload",
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
      playerId,
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

  await deletePreviousPlayerDocumentIfPresent(access.player.documentFilePath);

  return redirectWithMessage(
    tournamentSlug,
    token,
    "success",
    `Consegna cartacea registrata per ${access.player.firstName} ${access.player.lastName}.`,
    {
      documentAction: "paper-delivery",
      playerId,
    },
  );
}
