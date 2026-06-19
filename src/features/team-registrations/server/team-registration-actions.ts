"use server";

import type { Prisma } from "@prisma/client";
import { TournamentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import {
  generateCaptainManageToken,
  hashCaptainManageToken,
  storeDashboardCaptainManageLinkFlash,
  storeCaptainManageLinkFlash,
} from "@/features/team-registrations/server/captain-manage-link";
import { createPendingTeamRegistration } from "@/features/team-registrations/server/create-pending-team-registration.mjs";
import {
  buildRegistrationApprovedEmail,
  buildRegistrationReceivedEmail,
} from "@/features/team-registrations/server/team-registration-emails";
import { reviewTeamRegistrationSchema } from "@/features/team-registrations/schemas/review-team-registration.schema";
import { submitTeamRegistrationSchema } from "@/features/team-registrations/schemas/submit-team-registration.schema";
import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  deletePrivateBucketObject,
  getSupabaseTeamDocumentsBucketName,
} from "@/lib/supabase-storage";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

function getRegistrationPath(tournamentSlug: string) {
  return `/tournaments/${tournamentSlug}/register-team`;
}

function getDashboardTournamentPath(tournamentSlug: string) {
  return `/dashboard/tournaments/${tournamentSlug}`;
}

function readRequiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function readPlayerFieldValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""));
}

function readPlayersFromFormData(formData: FormData) {
  const firstNames = readPlayerFieldValues(formData, "playerFirstName");
  const lastNames = readPlayerFieldValues(formData, "playerLastName");
  const jerseyNumbers = readPlayerFieldValues(formData, "playerJerseyNumber");
  const roles = readPlayerFieldValues(formData, "playerRole");

  if (
    firstNames.length !== lastNames.length ||
    firstNames.length !== jerseyNumbers.length ||
    firstNames.length !== roles.length
  ) {
    return null;
  }

  return firstNames.map((firstName, index) => ({
    firstName,
    lastName: lastNames[index],
    jerseyNumber: jerseyNumbers[index],
    role: roles[index],
    sortOrder: index,
  }));
}

function getValidationMessage(error: z.ZodError) {
  const issue = error.issues[0];

  if (!issue) {
    return "Inserisci un'iscrizione valida.";
  }

  const playerIndex = issue.path.find((segment) => typeof segment === "number");

  if (typeof playerIndex === "number") {
    return `Giocatore ${playerIndex + 1}: ${issue.message}`;
  }

  return issue.message;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function slugifyTeamName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug.length > 0 ? slug.slice(0, 120) : "team";
}

async function generateUniqueTeamSlug(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  teamName: string,
) {
  const baseSlug = slugifyTeamName(teamName);
  const existingTeams = await transaction.team.findMany({
    where: {
      organizationId,
      slug: {
        startsWith: baseSlug,
      },
    },
    select: {
      slug: true,
    },
  });

  const existingSlugs = new Set(existingTeams.map((team) => team.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

type TeamRegistrationApprovalEmailPayload = {
  captainEmail: string;
  captainFirstName: string;
  teamName: string;
};

function logTeamRegistrationStorageCleanupWarning(error: unknown) {
  console.warn("Team registration document cleanup failed", error);
}

async function deleteTeamRegistrationDocuments(documentFilePaths: string[]) {
  if (documentFilePaths.length === 0) {
    return;
  }

  try {
    const bucketName = getSupabaseTeamDocumentsBucketName();

    await Promise.all(
      documentFilePaths.map(async (documentFilePath) => {
        try {
          await deletePrivateBucketObject(bucketName, documentFilePath);
        } catch (error) {
          logTeamRegistrationStorageCleanupWarning(error);
        }
      }),
    );
  } catch (error) {
    logTeamRegistrationStorageCleanupWarning(error);
  }
}

export async function submitTeamRegistrationAction(formData: FormData) {
  const tournamentSlug = readRequiredFormValue(formData, "tournamentSlug");

  if (tournamentSlug.trim().length === 0) {
    return redirectWithMessage("/tournaments", "error", "Seleziona un torneo valido.");
  }

  const registrationPath = getRegistrationPath(tournamentSlug);
  const players = readPlayersFromFormData(formData);

  if (!players) {
    return redirectWithMessage(
      registrationPath,
      "error",
      "I dati dei giocatori non sono stati letti correttamente. Controlla la rosa e riprova.",
    );
  }

  const parsed = submitTeamRegistrationSchema.safeParse({
    tournamentId: readRequiredFormValue(formData, "tournamentId"),
    captainFirstName: readRequiredFormValue(formData, "captainFirstName"),
    captainLastName: readRequiredFormValue(formData, "captainLastName"),
    captainEmail: readRequiredFormValue(formData, "captainEmail"),
    captainPhone: readRequiredFormValue(formData, "captainPhone"),
    teamName: readRequiredFormValue(formData, "teamName"),
    notes: readRequiredFormValue(formData, "notes"),
    players,
  });

  if (!parsed.success) {
    return redirectWithMessage(
      registrationPath,
      "error",
      getValidationMessage(parsed.error),
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: {
      id: true,
      status: true,
    },
  });

  if (!tournament || tournament.id !== parsed.data.tournamentId) {
    return redirectWithMessage(registrationPath, "error", "Seleziona un torneo valido.");
  }

  if (tournament.status !== TournamentStatus.PUBLISHED) {
    return redirectWithMessage(
      registrationPath,
      "error",
      "Le iscrizioni per questo torneo sono attualmente chiuse.",
    );
  }

  const registration = await createPendingTeamRegistration({
    tournamentId: tournament.id,
    tournamentSlug,
    captainFirstName: parsed.data.captainFirstName,
    captainLastName: parsed.data.captainLastName,
    captainEmail: parsed.data.captainEmail,
    captainPhone: parsed.data.captainPhone,
    teamName: parsed.data.teamName,
    notes: parsed.data.notes,
    players: parsed.data.players,
  });

  await sendEmail({
    to: parsed.data.captainEmail,
    ...buildRegistrationReceivedEmail({
      captainFirstName: parsed.data.captainFirstName,
      teamName: parsed.data.teamName,
      manageLink: registration.captainManageUrl,
    }),
  });

  await storeCaptainManageLinkFlash(tournamentSlug, registration.captainManageToken);

  return redirectWithMessage(
    registrationPath,
    "success",
    "Iscrizione ricevuta. L'organizzazione controllerà la squadra prima della pubblicazione.",
  );
}

export async function resetCaptainManageLinkAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = reviewTeamRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard", "error", "Scegli un'iscrizione valida.");
  }

  const dashboardPath = getDashboardTournamentPath(parsed.data.tournamentSlug);
  const registration = await prisma.teamRegistration.findUnique({
    where: { id: parsed.data.registrationId },
    select: {
      id: true,
      tournament: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!registration || registration.tournament.slug !== parsed.data.tournamentSlug) {
    return redirectWithMessage(dashboardPath, "error", "Iscrizione non trovata.");
  }

  const captainManageToken = generateCaptainManageToken();

  await prisma.teamRegistration.update({
    where: { id: registration.id },
    data: {
      captainManageTokenHash: hashCaptainManageToken(captainManageToken),
      captainManageTokenIssuedAt: new Date(),
      captainManageTokenLastUsedAt: null,
      captainManageTokenRevokedAt: null,
    },
  });

  await storeDashboardCaptainManageLinkFlash(parsed.data.tournamentSlug, captainManageToken);

  return redirectWithMessage(
    dashboardPath,
    "success",
    "Nuovo link capitano generato. Copialo e invialo al capitano.",
  );
}

export async function approveTeamRegistrationAction(formData: FormData) {
  const user = await requireOwnerOrAdmin();

  const parsed = reviewTeamRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard", "error", "Choose a valid registration to approve.");
  }

  const dashboardPath = getDashboardTournamentPath(parsed.data.tournamentSlug);
  let approvalErrorMessage: string | null = null;
  let approvalEmailPayload: TeamRegistrationApprovalEmailPayload | null = null;

  try {
    approvalEmailPayload = await prisma.$transaction(async (transaction) => {
      const registration = await transaction.teamRegistration.findUnique({
        where: { id: parsed.data.registrationId },
        select: {
          id: true,
          tournamentId: true,
          teamId: true,
          status: true,
          teamName: true,
          captainFirstName: true,
          captainEmail: true,
          tournament: {
            select: {
              id: true,
              slug: true,
              organizationId: true,
            },
          },
          players: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              firstName: true,
              lastName: true,
              jerseyNumber: true,
              role: true,
              sortOrder: true,
            },
          },
        },
      });

      if (!registration || registration.tournament.slug !== parsed.data.tournamentSlug) {
        throw new Error("Registration not found.");
      }

      if (registration.status !== "PENDING") {
        throw new Error("Only pending registrations can be approved.");
      }

      const existingTournamentTeams = await transaction.tournamentTeam.findMany({
        where: {
          tournamentId: registration.tournamentId,
        },
        select: {
          team: {
            select: {
              name: true,
            },
          },
        },
      });

      const hasDuplicateTeamName = existingTournamentTeams.some(
        (entry) => normalizeText(entry.team.name) === normalizeText(registration.teamName),
      );

      if (hasDuplicateTeamName) {
        throw new Error("A team with that name already exists in this tournament.");
      }

      const teamSlug = await generateUniqueTeamSlug(
        transaction,
        registration.tournament.organizationId,
        registration.teamName,
      );

      const team = await transaction.team.create({
        data: {
          organizationId: registration.tournament.organizationId,
          name: registration.teamName,
          slug: teamSlug,
        },
      });

      const highestSeedEntry = await transaction.tournamentTeam.findFirst({
        where: { tournamentId: registration.tournamentId },
        orderBy: { seed: "desc" },
        select: { seed: true },
      });

      await transaction.tournamentTeam.create({
        data: {
          tournamentId: registration.tournamentId,
          teamId: team.id,
          seed: (highestSeedEntry?.seed ?? 0) + 1,
        },
      });

      await transaction.player.createMany({
        data: registration.players.map((player) => ({
          organizationId: registration.tournament.organizationId,
          teamId: team.id,
          firstName: player.firstName,
          lastName: player.lastName,
          displayName: `${player.firstName} ${player.lastName}`,
          jerseyNumber: player.jerseyNumber,
          role: player.role,
        })),
      });

      await transaction.teamRegistration.update({
        where: { id: registration.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
          teamId: team.id,
          // Preserve the original private manage link. Only the manual reset action rotates it.
        },
      });

      return {
        captainEmail: registration.captainEmail,
        captainFirstName: registration.captainFirstName,
        teamName: registration.teamName,
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      approvalErrorMessage = error.message;
    } else {
      throw error;
    }
  }

  if (approvalErrorMessage) {
    return redirectWithMessage(dashboardPath, "error", approvalErrorMessage);
  }

  revalidateTournamentPaths(parsed.data.tournamentSlug);

  if (approvalEmailPayload) {
    await sendEmail({
      to: approvalEmailPayload.captainEmail,
      ...buildRegistrationApprovedEmail({
        captainFirstName: approvalEmailPayload.captainFirstName,
        teamName: approvalEmailPayload.teamName,
      }),
    });
  }

  return redirectWithMessage(dashboardPath, "success", "Registration approved and team created.");
}

export async function rejectTeamRegistrationAction(formData: FormData) {
  const user = await requireOwnerOrAdmin();

  const parsed = reviewTeamRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard", "error", "Choose a valid registration to reject.");
  }

  const dashboardPath = getDashboardTournamentPath(parsed.data.tournamentSlug);
  let rejectionErrorMessage: string | null = null;

  try {
    const registration = await prisma.teamRegistration.findUnique({
      where: { id: parsed.data.registrationId },
      select: {
        id: true,
        status: true,
        tournament: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!registration || registration.tournament.slug !== parsed.data.tournamentSlug) {
      return redirectWithMessage(dashboardPath, "error", "Registration not found.");
    }

    if (registration.status !== "PENDING") {
      return redirectWithMessage(
        dashboardPath,
        "error",
        "Only pending registrations can be rejected.",
      );
    }

    await prisma.teamRegistration.update({
      where: { id: registration.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      rejectionErrorMessage = error.message;
    } else {
      throw error;
    }
  }

  if (rejectionErrorMessage) {
    return redirectWithMessage(dashboardPath, "error", rejectionErrorMessage);
  }

  revalidateTournamentPaths(parsed.data.tournamentSlug);

  return redirectWithMessage(dashboardPath, "success", "Registration rejected.");
}

export async function deleteOrRemoveTeamRegistrationAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = reviewTeamRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard", "error", "Impossibile completare l'operazione.");
  }

  const dashboardPath = getDashboardTournamentPath(parsed.data.tournamentSlug);
  const blockedMatchesMessage =
    "Questa squadra ha partite collegate. Rimuovi o rigenera prima il calendario.";
  const brokenApprovedRegistrationMessage =
    "Registrazione approvata non collegata correttamente a una squadra. Controlla i dati prima di eliminarla.";

  let successMessage: string | null = null;
  let documentFilePathsToDelete: string[] = [];

  try {
    successMessage = await prisma.$transaction(async (transaction) => {
      const registration = await transaction.teamRegistration.findUnique({
        where: { id: parsed.data.registrationId },
        select: {
          id: true,
          tournamentId: true,
          teamId: true,
          gdprDocumentFilePath: true,
          status: true,
          tournament: {
            select: {
              slug: true,
            },
          },
          players: {
            select: {
              documentFilePath: true,
            },
          },
        },
      });

      if (!registration || registration.tournament.slug !== parsed.data.tournamentSlug) {
        throw new Error("Impossibile completare l'operazione.");
      }

      documentFilePathsToDelete = registration.players
        .map((player) => player.documentFilePath)
        .filter((documentFilePath): documentFilePath is string => Boolean(documentFilePath));

      if (registration.gdprDocumentFilePath) {
        documentFilePathsToDelete.push(registration.gdprDocumentFilePath);
      }

      if (registration.status === "PENDING" || registration.status === "REJECTED") {
        await transaction.teamRegistration.delete({
          where: { id: registration.id },
        });

        return "Registrazione eliminata.";
      }

      if (!registration.teamId) {
        throw new Error(brokenApprovedRegistrationMessage);
      }

      const tournamentTeam = await transaction.tournamentTeam.findUnique({
        where: {
          tournamentId_teamId: {
            tournamentId: registration.tournamentId,
            teamId: registration.teamId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!tournamentTeam) {
        throw new Error(brokenApprovedRegistrationMessage);
      }

      const linkedMatch = await transaction.match.findFirst({
        where: {
          tournamentId: registration.tournamentId,
          OR: [
            { homeTeamId: registration.teamId },
            { awayTeamId: registration.teamId },
          ],
        },
        select: {
          id: true,
        },
      });

      if (linkedMatch) {
        throw new Error(blockedMatchesMessage);
      }

      await transaction.player.deleteMany({
        where: {
          teamId: registration.teamId,
        },
      });

      await transaction.tournamentTeam.delete({
        where: {
          tournamentId_teamId: {
            tournamentId: registration.tournamentId,
            teamId: registration.teamId,
          },
        },
      });

      await transaction.teamRegistration.delete({
        where: {
          id: registration.id,
        },
      });

      const remainingTournamentTeam = await transaction.tournamentTeam.findFirst({
        where: {
          teamId: registration.teamId,
        },
        select: {
          id: true,
        },
      });

      const remainingRegistrationLink = await transaction.teamRegistration.findFirst({
        where: {
          teamId: registration.teamId,
        },
        select: {
          id: true,
        },
      });

      if (!remainingTournamentTeam && !remainingRegistrationLink) {
        await transaction.team.delete({
          where: {
            id: registration.teamId,
          },
        });
      }

      return "Squadra rimossa dal torneo.";
    });
  } catch (error) {
    if (error instanceof Error) {
      const knownMessage =
        error.message === blockedMatchesMessage ||
        error.message === brokenApprovedRegistrationMessage ||
        error.message === "Impossibile completare l'operazione.";

      return redirectWithMessage(
        dashboardPath,
        "error",
        knownMessage ? error.message : "Impossibile completare l'operazione.",
      );
    }

    return redirectWithMessage(dashboardPath, "error", "Impossibile completare l'operazione.");
  }

  await deleteTeamRegistrationDocuments(documentFilePathsToDelete);
  revalidateTournamentPaths(parsed.data.tournamentSlug);

  return redirectWithMessage(
    dashboardPath,
    "success",
    successMessage ?? "Impossibile completare l'operazione.",
  );
}
