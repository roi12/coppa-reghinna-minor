import "../src/lib/load-env.mjs";

import { TeamRegistrationStatus } from "@prisma/client";

import prismaClientModule from "../src/lib/prisma-client.mjs";
import { createPendingTeamRegistration } from "../src/features/team-registrations/server/create-pending-team-registration.mjs";

const { createPrismaClient } = prismaClientModule;

const TOURNAMENT_SLUG = "coppa-reghinna-minor-2026";
const TEST_MARKER = "BETA_TEST_DATA_2026";
const TEST_CONFIRMATION_ENV = "TEST_REGISTRATION_SEED_CONFIRM";
const TEST_CONFIRMATION_VALUE = "LOCAL_ONLY";
const CLEANUP_ONLY_FLAG = "--cleanup-only";

const LOCAL_ALLOWED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "host.docker.internal",
  "postgres",
  "db",
]);

const TEAM_NAMES = [
  "TEST – Minori United",
  "TEST – Amalfi Lions",
  "TEST – Ravello Stars",
  "TEST – Maiori Athletic",
  "TEST – Atrani Five",
  "TEST – Scala Warriors",
  "TEST – Tramonti Eagles",
  "TEST – Vietri Sharks",
  "TEST – Cetara Blue",
  "TEST – Praiano Five",
  "TEST – Positano Crew",
  "TEST – Conca Falcons",
  "TEST – Furore Titans",
  "TEST – Agerola Storm",
  "TEST – Coast Athletic",
  "TEST – Reghinna Academy",
];

const PLAYER_DEFINITIONS = [
  { firstName: "Beta", lastNameSuffix: "Portiere", jerseyNumber: "1", role: "Portiere" },
  { firstName: "Beta", lastNameSuffix: "Centrale", jerseyNumber: "4", role: "Centrale" },
  { firstName: "Beta", lastNameSuffix: "Laterale", jerseyNumber: "7", role: "Laterale" },
  { firstName: "Beta", lastNameSuffix: "Pivot", jerseyNumber: "9", role: "Pivot" },
  { firstName: "Beta", lastNameSuffix: "Universale", jerseyNumber: "10", role: "Universale" },
];

function isLocalHostname(hostname) {
  return LOCAL_ALLOWED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

function parseUrlValue(name, value) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL before running this seed.`);
  }
}

function assertLocalUrl(name, value) {
  const parsedUrl = parseUrlValue(name, value);

  if (!isLocalHostname(parsedUrl.hostname)) {
    throw new Error(
      `${name} points to a non-local host (${parsedUrl.hostname}). Refusing to run the development registration seed.`,
    );
  }

  return parsedUrl;
}

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run test registration seed with NODE_ENV=production.");
  }

  if (process.env[TEST_CONFIRMATION_ENV] !== TEST_CONFIRMATION_VALUE) {
    throw new Error(
      `${TEST_CONFIRMATION_ENV} must be set to ${TEST_CONFIRMATION_VALUE} to confirm a local-only seed run.`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  assertLocalUrl("DATABASE_URL", databaseUrl);

  const directUrl = process.env.DIRECT_URL?.trim();

  if (directUrl) {
    assertLocalUrl("DIRECT_URL", directUrl);
  }

  const appUrl = process.env.APP_URL?.trim();

  if (appUrl) {
    assertLocalUrl("APP_URL", appUrl);
  }
}

function buildCaptainIdentity(index) {
  const nn = String(index + 1).padStart(2, "0");

  return {
    nn,
    captainFirstName: "Test",
    captainLastName: `Capitano${nn}`,
    captainEmail: `captain${nn}@example.test`,
    captainPhone: `+3900000000${nn}`,
    notes: `${TEST_MARKER} – Synthetic local registration. Safe to delete.`,
  };
}

function buildSeedRegistrations(tournamentId) {
  return TEAM_NAMES.map((teamName, index) => {
    const captain = buildCaptainIdentity(index);

    return {
      tournamentId,
      tournamentSlug: TOURNAMENT_SLUG,
      captainFirstName: captain.captainFirstName,
      captainLastName: captain.captainLastName,
      captainEmail: captain.captainEmail,
      captainPhone: captain.captainPhone,
      teamName,
      notes: captain.notes,
      players: PLAYER_DEFINITIONS.map((player, playerIndex) => ({
        firstName: player.firstName,
        lastName: `${captain.nn}${player.lastNameSuffix}`,
        jerseyNumber: player.jerseyNumber,
        role: player.role,
        sortOrder: playerIndex,
      })),
    };
  });
}

function buildSeedCaptainEmails() {
  return TEAM_NAMES.map((_, index) => buildCaptainIdentity(index).captainEmail);
}

async function loadTargetTournament(prisma) {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: TOURNAMENT_SLUG },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tournament) {
    throw new Error(`Tournament ${TOURNAMENT_SLUG} was not found. Seed the base tournament first.`);
  }

  return tournament;
}

async function listExistingSeedRegistrations(prisma, tournamentId) {
  return prisma.teamRegistration.findMany({
    where: {
      tournamentId,
      teamName: {
        in: TEAM_NAMES,
      },
      captainEmail: {
        in: buildSeedCaptainEmails(),
      },
      notes: {
        contains: TEST_MARKER,
      },
    },
    orderBy: [{ createdAt: "asc" }, { teamName: "asc" }],
    select: {
      id: true,
      teamId: true,
      status: true,
      teamName: true,
      players: {
        select: {
          id: true,
        },
      },
      team: {
        select: {
          tournaments: {
            where: {
              tournamentId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
          homeMatches: {
            where: {
              tournamentId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
          awayMatches: {
            where: {
              tournamentId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  });
}

function assertSeedRegistrationsRemovable(existingRegistrations) {
  for (const registration of existingRegistrations) {
    if (registration.status === TeamRegistrationStatus.APPROVED) {
      if (!registration.teamId || !registration.team || registration.team.tournaments.length === 0) {
        throw new Error(
          `Seed cleanup stopped: approved test registration "${registration.teamName}" is not linked to a removable tournament team.`,
        );
      }

      const hasLinkedMatches =
        registration.team.homeMatches.length > 0 || registration.team.awayMatches.length > 0;

      if (hasLinkedMatches) {
        throw new Error(
          `Seed cleanup stopped: approved test registration "${registration.teamName}" already has linked matches. Remove those matches first.`,
        );
      }
    } else if (registration.teamId) {
      throw new Error(
        `Seed cleanup stopped: non-approved test registration "${registration.teamName}" is unexpectedly linked to a team.`,
      );
    }
  }
}

async function cleanupExistingSeedRegistrations(prisma, tournamentId, existingRegistrations) {
  if (existingRegistrations.length === 0) {
    return 0;
  }

  assertSeedRegistrationsRemovable(existingRegistrations);

  await prisma.$transaction(async (transaction) => {
    for (const registration of existingRegistrations) {
      if (
        registration.status === TeamRegistrationStatus.PENDING ||
        registration.status === TeamRegistrationStatus.REJECTED
      ) {
        await transaction.teamRegistration.delete({
          where: {
            id: registration.id,
          },
        });

        continue;
      }

      if (!registration.teamId) {
        throw new Error(`Approved test registration "${registration.teamName}" is missing its team link.`);
      }

      await transaction.player.deleteMany({
        where: {
          teamId: registration.teamId,
        },
      });

      await transaction.tournamentTeam.delete({
        where: {
          tournamentId_teamId: {
            tournamentId,
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
    }
  });

  return existingRegistrations.length;
}

async function createSeedRegistrations(prisma, tournament) {
  const inputs = buildSeedRegistrations(tournament.id);

  return prisma.$transaction(async (transaction) => {
    const createdRegistrations = [];

    for (const input of inputs) {
      const createdRegistration = await createPendingTeamRegistration(input, {
        db: transaction,
      });

      createdRegistrations.push(createdRegistration);
    }

    return createdRegistrations;
  });
}

async function verifySeedRegistrations(prisma, tournament) {
  const matchingTournaments = await prisma.tournament.findMany({
    where: {
      slug: TOURNAMENT_SLUG,
    },
    select: {
      id: true,
    },
  });

  if (matchingTournaments.length !== 1) {
    throw new Error(`Expected exactly one tournament with slug ${TOURNAMENT_SLUG}. Found ${matchingTournaments.length}.`);
  }

  const registrations = await prisma.teamRegistration.findMany({
    where: {
      tournamentId: tournament.id,
      teamName: {
        in: TEAM_NAMES,
      },
      captainEmail: {
        in: buildSeedCaptainEmails(),
      },
      notes: {
        contains: TEST_MARKER,
      },
    },
    orderBy: [{ createdAt: "asc" }, { teamName: "asc" }],
    select: {
      id: true,
      teamId: true,
      status: true,
      teamName: true,
      captainManageTokenHash: true,
      players: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          jerseyNumber: true,
        },
      },
    },
  });

  if (registrations.length !== TEAM_NAMES.length) {
    throw new Error(`Expected ${TEAM_NAMES.length} test registrations. Found ${registrations.length}.`);
  }

  const uniqueTeamNames = new Set(registrations.map((registration) => registration.teamName));

  if (uniqueTeamNames.size !== TEAM_NAMES.length) {
    throw new Error("Duplicate test team names were found after seeding.");
  }

  let totalPlayers = 0;

  for (const registration of registrations) {
    if (registration.status !== TeamRegistrationStatus.PENDING) {
      throw new Error(`Registration "${registration.teamName}" is not PENDING.`);
    }

    if (registration.teamId) {
      throw new Error(`Registration "${registration.teamName}" is already linked to an approved team.`);
    }

    if (!registration.captainManageTokenHash) {
      throw new Error(`Registration "${registration.teamName}" is missing a captain manage token hash.`);
    }

    if (registration.players.length !== PLAYER_DEFINITIONS.length) {
      throw new Error(
        `Registration "${registration.teamName}" should have ${PLAYER_DEFINITIONS.length} players but has ${registration.players.length}.`,
      );
    }

    const uniqueJerseyNumbers = new Set(
      registration.players.map((player) => player.jerseyNumber.trim().toLowerCase()),
    );

    if (uniqueJerseyNumbers.size !== registration.players.length) {
      throw new Error(`Registration "${registration.teamName}" has duplicate jersey numbers.`);
    }

    totalPlayers += registration.players.length;
  }

  return {
    registrationCount: registrations.length,
    totalPlayers,
  };
}

function printManageLinks(createdRegistrations) {
  console.log("");
  console.log("Local test captain manage links:");

  for (const registration of createdRegistrations) {
    console.log(`- ${registration.teamName}: ${registration.captainManageUrl}`);
  }
}

async function main() {
  assertSafeEnvironment();

  const cleanupOnly = process.argv.includes(CLEANUP_ONLY_FLAG);
  const prisma = createPrismaClient();

  try {
    const tournament = await loadTargetTournament(prisma);
    const existingRegistrations = await listExistingSeedRegistrations(prisma, tournament.id);
    const removedCount = await cleanupExistingSeedRegistrations(
      prisma,
      tournament.id,
      existingRegistrations,
    );

    if (cleanupOnly) {
      console.log(`Removed: ${removedCount}`);
      console.log(`Tournament: ${tournament.name}`);
      return;
    }

    const createdRegistrations = await createSeedRegistrations(prisma, tournament);
    const verification = await verifySeedRegistrations(prisma, tournament);

    console.log(`Created: ${createdRegistrations.length}`);
    console.log("Existing/updated: 0");
    console.log("Failed: 0");
    console.log(`Players: ${verification.totalPlayers}`);
    console.log(`Status: ${TeamRegistrationStatus.PENDING}`);
    console.log(`Tournament: ${tournament.name}`);
    console.log(`Removed existing marked registrations: ${removedCount}`);

    printManageLinks(createdRegistrations);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
