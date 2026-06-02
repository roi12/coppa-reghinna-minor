import { randomBytes, scryptSync } from "node:crypto";

import { MatchStatus, TournamentFormat, TournamentStatus, UserRole } from "@prisma/client";
import prismaClientModule from "../src/lib/prisma-client.mjs";

const { prisma } = prismaClientModule;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${passwordHash}`;
}

async function main() {
  const organizationSlug = "coppa-reghinna-minor";
  const legacyOrganizationSlug = "harbor-city-league";
  const tournamentSlug = "coppa-reghinna-minor-2026";
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

  await prisma.session.deleteMany();

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

  const organizationsToReplace = await prisma.organization.findMany({
    where: {
      slug: {
        in: [organizationSlug, legacyOrganizationSlug],
      },
    },
    select: { id: true },
  });

  for (const existingOrganization of organizationsToReplace) {
    await prisma.match.deleteMany({
      where: {
        tournament: {
          organizationId: existingOrganization.id,
        },
      },
    });

    await prisma.player.deleteMany({
      where: { organizationId: existingOrganization.id },
    });

    await prisma.tournamentTeam.deleteMany({
      where: {
        tournament: {
          organizationId: existingOrganization.id,
        },
      },
    });

    await prisma.team.deleteMany({
      where: { organizationId: existingOrganization.id },
    });

    await prisma.tournament.deleteMany({
      where: { organizationId: existingOrganization.id },
    });

    await prisma.organization.delete({
      where: { id: existingOrganization.id },
    });
  }

  const organization = await prisma.organization.create({
    data: {
      name: "Coppa Reghinna Minor",
      slug: organizationSlug,
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: organization.id,
      name: "Coppa Reghinna Minor 2026",
      slug: tournamentSlug,
      sport: "Futsal",
      seasonLabel: "Estate 2026",
      format: TournamentFormat.ROUND_ROBIN,
      locationLabel: "Maiori",
      status: TournamentStatus.PUBLISHED,
      startsAt: new Date("2026-07-01T18:00:00.000Z"),
      endsAt: new Date("2026-07-31T22:00:00.000Z"),
      publishedAt: new Date("2026-06-15T10:00:00.000Z"),
    },
  });

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
        status: MatchStatus.FINAL,
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
        status: MatchStatus.FINAL,
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

  const seededCredentials = seededUsers
    .map((user) => `${user.role.toLowerCase()}: ${user.email} / ${user.password}`)
    .join(" | ");

  console.log(`Seeded organization ${organization.slug} and tournament ${tournament.slug}.`);
  console.log(`Seeded auth users: ${seededCredentials}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
