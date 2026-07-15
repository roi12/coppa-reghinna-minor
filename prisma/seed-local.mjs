import { randomBytes, scryptSync } from "node:crypto";

import { MatchStatus, TournamentFormat, TournamentStatus, UserRole } from "@prisma/client";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${passwordHash}`;
}

function parsePostgresUrl(value, label) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`Missing required environment variable: ${label}`);
  }

  const url = new URL(trimmedValue);

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(`${label} must point to a local PostgreSQL host.`);
  }

  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName !== "reghinna_local" && databaseName !== "reghinna_test") {
    throw new Error(`${label} must point to the reghinna_local or reghinna_test database.`);
  }

  if (/supabase/i.test(trimmedValue) || /supabase/i.test(url.hostname)) {
    throw new Error(`${label} must not point to Supabase.`);
  }

  return url;
}

export function assertSafeLocalSeedEnvironment() {
  const appEnv = process.env.APP_ENV?.trim();

  if (appEnv !== "local" && appEnv !== "test") {
    throw new Error("APP_ENV must be local or test before running local seeds.");
  }

  if (process.env.VERCEL) {
    throw new Error("VERCEL must not be set when running local seeds.");
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("VERCEL_ENV cannot be production when running local seeds.");
  }

  const databaseUrl = parsePostgresUrl(process.env.DATABASE_URL, "DATABASE_URL");
  const directUrl = parsePostgresUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL, "DIRECT_URL");

  if (databaseUrl.hostname !== directUrl.hostname || databaseUrl.port !== directUrl.port) {
    throw new Error("DATABASE_URL and DIRECT_URL must point to the same local PostgreSQL host and port.");
  }

  const databaseName = databaseUrl.pathname.replace(/^\//, "");
  const directDatabaseName = directUrl.pathname.replace(/^\//, "");

  if (databaseName !== directDatabaseName) {
    throw new Error("DATABASE_URL and DIRECT_URL must point to the same local PostgreSQL database.");
  }

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    const parsedAppUrl = new URL(appUrl);

    if (parsedAppUrl.hostname !== "localhost" && parsedAppUrl.hostname !== "127.0.0.1") {
      throw new Error("APP_URL must point to a local frontend URL when running local seeds.");
    }
  }

  return {
    databaseUrl,
    directUrl,
    databaseName,
  };
}

async function getPrismaClient() {
  assertSafeLocalSeedEnvironment();

  const prismaClientModule = await import("../src/lib/prisma-client.mjs");
  return prismaClientModule.default.prisma;
}

async function removeExistingSeededData(prisma) {
  const organizationSlugs = ["coppa-reghinna-minor", "harbor-city-league"];
  const organizations = await prisma.organization.findMany({
    where: {
      slug: {
        in: organizationSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  for (const organization of organizations) {
    await prisma.organization.delete({
      where: {
        id: organization.id,
      },
    });
  }
}

async function seedUsers(prisma) {
  const seededUsers = [
    {
      email: "owner@sports-platform.local",
      name: "Platform Owner",
      password: "owner-demo-pass",
      role: UserRole.OWNER,
    },
    {
      email: "admin@sports-platform.local",
      name: "Tournament Admin",
      password: "admin-demo-pass",
      role: UserRole.ADMIN,
    },
    {
      email: "viewer@sports-platform.local",
      name: "Public Viewer",
      password: "viewer-demo-pass",
      role: UserRole.VIEWER,
    },
  ];

  for (const seededUser of seededUsers) {
    await prisma.user.upsert({
      where: { email: seededUser.email },
      update: {
        name: seededUser.name,
        role: seededUser.role,
        passwordHash: hashPassword(seededUser.password),
      },
      create: {
        email: seededUser.email,
        name: seededUser.name,
        role: seededUser.role,
        passwordHash: hashPassword(seededUser.password),
      },
    });
  }

  return seededUsers;
}

async function createBaseTournament(prisma) {
  const organization = await prisma.organization.create({
    data: {
      name: "Coppa Reghinna Minor",
      slug: "coppa-reghinna-minor",
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: organization.id,
      name: "Coppa Reghinna Minor 2026",
      slug: "coppa-reghinna-minor-2026",
      sport: "Futsal",
      seasonLabel: "Estate 2026",
      format: TournamentFormat.ROUND_ROBIN,
      locationLabel: "Minori",
      status: TournamentStatus.PUBLISHED,
      startsAt: new Date("2026-07-01T18:00:00.000Z"),
      endsAt: new Date("2026-07-31T22:00:00.000Z"),
      publishedAt: new Date("2026-06-15T10:00:00.000Z"),
    },
  });

  return {
    organization,
    tournament,
  };
}

async function createDemoTeams(prisma, organization, tournament) {
  const teamDefinitions = [
    {
      name: "Northport Rovers",
      slug: "northport-rovers",
      players: [
        { firstName: "Luca", lastName: "Bianchi", jerseyNumber: "9" },
        { firstName: "Marco", lastName: "Rossi", jerseyNumber: "4" },
      ],
    },
    {
      name: "Dockside United",
      slug: "dockside-united",
      players: [
        { firstName: "Enzo", lastName: "Marini", jerseyNumber: "10" },
        { firstName: "Paolo", lastName: "Greco", jerseyNumber: "1" },
      ],
    },
    {
      name: "Old Town Athletic",
      slug: "old-town-athletic",
      players: [
        { firstName: "Matteo", lastName: "Fontana", jerseyNumber: "7" },
        { firstName: "Davide", lastName: "Romano", jerseyNumber: "5" },
      ],
    },
    {
      name: "Rivergate FC",
      slug: "rivergate-fc",
      players: [
        { firstName: "Simone", lastName: "Villa", jerseyNumber: "11" },
        { firstName: "Andrea", lastName: "Costa", jerseyNumber: "3" },
      ],
    },
  ];

  const teams = [];

  for (const [index, teamDefinition] of teamDefinitions.entries()) {
    const team = await prisma.team.create({
      data: {
        organizationId: organization.id,
        name: teamDefinition.name,
        slug: teamDefinition.slug,
      },
    });

    teams.push(team);

    await prisma.tournamentTeam.create({
      data: {
        tournamentId: tournament.id,
        teamId: team.id,
        seed: index + 1,
      },
    });

    for (const playerDefinition of teamDefinition.players) {
      await prisma.player.create({
        data: {
          organizationId: organization.id,
          teamId: team.id,
          firstName: playerDefinition.firstName,
          lastName: playerDefinition.lastName,
          displayName: `${playerDefinition.firstName} ${playerDefinition.lastName}`,
          jerseyNumber: playerDefinition.jerseyNumber,
        },
      });
    }
  }

  const teamBySlug = Object.fromEntries(teams.map((team) => [team.slug, team]));

  await prisma.match.createMany({
    data: [
      {
        tournamentId: tournament.id,
        homeTeamId: teamBySlug["northport-rovers"].id,
        awayTeamId: teamBySlug["dockside-united"].id,
        roundLabel: "Round 1",
        startsAt: new Date("2026-07-01T18:30:00.000Z"),
        locationLabel: "Palazzetto Comunale",
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 1,
      },
      {
        tournamentId: tournament.id,
        homeTeamId: teamBySlug["old-town-athletic"].id,
        awayTeamId: teamBySlug["rivergate-fc"].id,
        roundLabel: "Round 1",
        startsAt: new Date("2026-07-01T20:00:00.000Z"),
        locationLabel: "Palazzetto Comunale",
        status: MatchStatus.FINISHED,
        homeScore: 1,
        awayScore: 1,
      },
      {
        tournamentId: tournament.id,
        homeTeamId: teamBySlug["northport-rovers"].id,
        awayTeamId: teamBySlug["old-town-athletic"].id,
        roundLabel: "Round 2",
        startsAt: new Date("2026-07-08T18:30:00.000Z"),
        locationLabel: "Palazzetto Comunale",
        status: MatchStatus.SCHEDULED,
      },
      {
        tournamentId: tournament.id,
        homeTeamId: teamBySlug["dockside-united"].id,
        awayTeamId: teamBySlug["rivergate-fc"].id,
        roundLabel: "Round 2",
        startsAt: new Date("2026-07-08T20:00:00.000Z"),
        locationLabel: "Palazzetto Comunale",
        status: MatchStatus.SCHEDULED,
      },
    ],
  });

  return {
    teamCount: teams.length,
    playerCount: teamDefinitions.reduce((total, team) => total + team.players.length, 0),
    matchCount: 4,
  };
}

async function verifyBaseSeedState(prisma, organizationId, tournamentId) {
  const [teamCount, tournamentTeamCount, playerCount, matchCount, groupCount, stageCount, scheduleSlotCount] = await Promise.all([
    prisma.team.count({
      where: {
        organizationId,
      },
    }),
    prisma.tournamentTeam.count({
      where: {
        tournamentId,
      },
    }),
    prisma.player.count({
      where: {
        organizationId,
      },
    }),
    prisma.match.count({
      where: {
        tournamentId,
      },
    }),
    prisma.tournamentGroup.count({
      where: {
        tournamentId,
      },
    }),
    prisma.tournamentStage.count({
      where: {
        tournamentId,
      },
    }),
    prisma.tournamentScheduleSlot.count({
      where: {
        tournamentId,
      },
    }),
  ]);

  return {
    teamCount,
    tournamentTeamCount,
    playerCount,
    matchCount,
    groupCount,
    stageCount,
    scheduleSlotCount,
  };
}

export async function seedLocalTournament({ includeDemoData }) {
  const prisma = await getPrismaClient();

  try {
    await prisma.$transaction(async (transaction) => {
      await removeExistingSeededData(transaction);
      await seedUsers(transaction);

      const { organization, tournament } = await createBaseTournament(transaction);

      if (includeDemoData) {
        await createDemoTeams(transaction, organization, tournament);
      }
    });

    const organization = await prisma.organization.findUnique({
      where: {
        slug: "coppa-reghinna-minor",
      },
      select: {
        id: true,
      },
    });

    const tournament = await prisma.tournament.findUnique({
      where: {
        slug: "coppa-reghinna-minor-2026",
      },
      select: {
        id: true,
      },
    });

    if (!organization || !tournament) {
      throw new Error("Seeded organization or tournament could not be found after seeding.");
    }

    if (!includeDemoData) {
      const counts = await verifyBaseSeedState(prisma, organization.id, tournament.id);

      if (
        counts.teamCount !== 0 ||
        counts.tournamentTeamCount !== 0 ||
        counts.playerCount !== 0 ||
        counts.matchCount !== 0 ||
        counts.groupCount !== 0 ||
        counts.stageCount !== 0 ||
        counts.scheduleSlotCount !== 0
      ) {
        throw new Error(
          `Base seed verification failed: expected zero teams, tournament-team links, players, matches, groups, stages, and schedule slots but found teams=${counts.teamCount}, tournamentTeams=${counts.tournamentTeamCount}, players=${counts.playerCount}, matches=${counts.matchCount}, groups=${counts.groupCount}, stages=${counts.stageCount}, scheduleSlots=${counts.scheduleSlotCount}.`,
        );
      }

      console.log(
        `Base seed ready for ${organization.id}/${tournament.id} with zero teams, tournament-team links, players, matches, groups, stages, and schedule slots.`,
      );
      console.log(
        `Verification counts: teams=${counts.teamCount}, tournamentTeams=${counts.tournamentTeamCount}, players=${counts.playerCount}, matches=${counts.matchCount}, groups=${counts.groupCount}, stages=${counts.stageCount}, scheduleSlots=${counts.scheduleSlotCount}`,
      );
    } else {
      console.log(`Seeded organization coppa-reghinna-minor and tournament coppa-reghinna-minor-2026 with demo data.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
