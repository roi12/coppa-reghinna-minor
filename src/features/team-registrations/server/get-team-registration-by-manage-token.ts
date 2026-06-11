import type { TeamRegistrationManageDetail } from "@/features/team-registrations/types/team-registration.types";
import { hashCaptainManageToken } from "@/features/team-registrations/server/captain-manage-link";
import { prisma } from "@/lib/prisma";

export async function getTeamRegistrationByManageToken(
  tournamentSlug: string,
  token: string,
): Promise<TeamRegistrationManageDetail | null> {
  const registration = await prisma.teamRegistration.findUnique({
    where: {
      captainManageTokenHash: hashCaptainManageToken(token),
    },
    select: {
      id: true,
      tournamentId: true,
      teamId: true,
      captainFirstName: true,
      captainLastName: true,
      captainEmail: true,
      captainPhone: true,
      teamName: true,
      notes: true,
      status: true,
      reviewedAt: true,
      reviewedByUserId: true,
      createdAt: true,
      updatedAt: true,
      captainManageTokenIssuedAt: true,
      captainManageTokenLastUsedAt: true,
      captainManageTokenRevokedAt: true,
      tournament: {
        select: {
          slug: true,
          name: true,
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
      players: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jerseyNumber: true,
          role: true,
          sortOrder: true,
          documentStatus: true,
          documentFilePath: true,
          documentFileName: true,
          documentMimeType: true,
          documentSizeBytes: true,
          documentUploadedAt: true,
          documentMarkedPaperAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (
    !registration ||
    registration.tournament.slug !== tournamentSlug ||
    registration.captainManageTokenRevokedAt
  ) {
    return null;
  }

  const lastUsedAt = new Date();

  await prisma.teamRegistration.update({
    where: { id: registration.id },
    data: {
      captainManageTokenLastUsedAt: lastUsedAt,
    },
  });

  return {
    approvedTeamRemovalState: "NOT_APPLICABLE",
    id: registration.id,
    tournamentId: registration.tournamentId,
    teamId: registration.teamId,
    captainFirstName: registration.captainFirstName,
    captainLastName: registration.captainLastName,
    captainEmail: registration.captainEmail,
    captainPhone: registration.captainPhone,
    teamName: registration.teamName,
    notes: registration.notes,
    status: registration.status,
    reviewedAt: registration.reviewedAt,
    reviewedByUserId: registration.reviewedByUserId,
    reviewedByName: registration.reviewedBy?.name ?? null,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt,
    players: registration.players,
    tournamentSlug: registration.tournament.slug,
    tournamentName: registration.tournament.name,
    captainManageTokenIssuedAt: registration.captainManageTokenIssuedAt,
    captainManageTokenLastUsedAt: lastUsedAt,
    captainManageTokenRevokedAt: registration.captainManageTokenRevokedAt,
  };
}
