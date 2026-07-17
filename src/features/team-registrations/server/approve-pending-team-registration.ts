import type { Prisma } from "@prisma/client";

type ApprovedRegistrationRosterPlayer = {
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  role: string | null;
  sortOrder: number;
};

export type TeamRegistrationApprovalEmailPayload = {
  captainEmail: string;
  captainFirstName: string;
  teamName: string;
};

type ApprovePendingTeamRegistrationInput = {
  registrationId: string;
  tournamentSlug: string;
  reviewedByUserId: string;
};

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

function buildPlayerDisplayName(player: Pick<ApprovedRegistrationRosterPlayer, "firstName" | "lastName">) {
  return `${player.firstName} ${player.lastName}`.trim();
}

function buildPlayerNameKey(player: Pick<ApprovedRegistrationRosterPlayer, "firstName" | "lastName">) {
  return normalizeText(`${player.firstName} ${player.lastName}`);
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

export async function syncApprovedTeamPlayers(
  transaction: Prisma.TransactionClient,
  args: {
    organizationId: string;
    teamId: string;
    players: ApprovedRegistrationRosterPlayer[];
  },
) {
  const existingPlayers = await transaction.player.findMany({
    where: {
      teamId: args.teamId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jerseyNumber: true,
    },
  });
  const unmatchedPlayers = [...existingPlayers];

  function takeMatchingPlayer(
    predicate: (player: (typeof existingPlayers)[number]) => boolean,
  ) {
    const index = unmatchedPlayers.findIndex(predicate);

    if (index < 0) {
      return null;
    }

    return unmatchedPlayers.splice(index, 1)[0] ?? null;
  }

  for (const player of args.players) {
    const nameKey = buildPlayerNameKey(player);
    const matchedByName = takeMatchingPlayer(
      (existingPlayer) => buildPlayerNameKey(existingPlayer) === nameKey,
    );
    const matchedByJersey =
      matchedByName ??
      (player.jerseyNumber
        ? takeMatchingPlayer(
            (existingPlayer) =>
              normalizeText(existingPlayer.jerseyNumber ?? "") === normalizeText(player.jerseyNumber),
          )
        : null);

    const matchedPlayer = matchedByJersey;
    const playerData = {
      organizationId: args.organizationId,
      teamId: args.teamId,
      firstName: player.firstName,
      lastName: player.lastName,
      displayName: buildPlayerDisplayName(player),
      jerseyNumber: player.jerseyNumber,
      role: player.role,
    };

    if (matchedPlayer) {
      await transaction.player.update({
        where: {
          id: matchedPlayer.id,
        },
        data: playerData,
      });
      continue;
    }

    await transaction.player.create({
      data: playerData,
    });
  }
}

export async function approvePendingTeamRegistrationRecord(
  transaction: Prisma.TransactionClient,
  input: ApprovePendingTeamRegistrationInput,
): Promise<TeamRegistrationApprovalEmailPayload> {
  const registration = await transaction.teamRegistration.findUnique({
    where: { id: input.registrationId },
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

  if (!registration || registration.tournament.slug !== input.tournamentSlug) {
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

  await syncApprovedTeamPlayers(transaction, {
    organizationId: registration.tournament.organizationId,
    teamId: team.id,
    players: registration.players.map((player) => ({
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber,
      role: player.role,
      sortOrder: player.sortOrder,
    })),
  });

  await transaction.teamRegistration.update({
    where: { id: registration.id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedByUserId: input.reviewedByUserId,
      teamId: team.id,
    },
  });

  return {
    captainEmail: registration.captainEmail,
    captainFirstName: registration.captainFirstName,
    teamName: registration.teamName,
  };
}
