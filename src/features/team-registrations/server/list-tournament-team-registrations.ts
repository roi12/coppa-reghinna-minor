import { cache } from "react";

import type { TeamRegistrationDetail } from "@/features/team-registrations/types/team-registration.types";
import { prisma } from "@/lib/prisma";

export const listTournamentTeamRegistrations = cache(
  async (tournamentId: string): Promise<TeamRegistrationDetail[]> => {
    const registrations = await prisma.teamRegistration.findMany({
      where: { tournamentId },
      orderBy: [{ createdAt: "desc" }, { teamName: "asc" }],
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
            createdAt: true,
          },
        },
      },
    });

    return registrations.map((registration) => ({
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
    }));
  },
);
