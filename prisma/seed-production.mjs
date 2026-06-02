import { randomBytes, scryptSync } from "node:crypto";

import { TournamentFormat, TournamentStatus, UserRole } from "@prisma/client";
import prismaClientModule from "../src/lib/prisma-client.mjs";

const { prisma } = prismaClientModule;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${passwordHash}`;
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const organizationSlug = "coppa-reghinna-minor";
  const tournamentSlug = "coppa-reghinna-minor-2026";
  const ownerEmail = readRequiredEnv("PRODUCTION_OWNER_EMAIL");
  const ownerPassword = readRequiredEnv("PRODUCTION_OWNER_PASSWORD");
  const adminEmail = readRequiredEnv("PRODUCTION_ADMIN_EMAIL");
  const adminPassword = readRequiredEnv("PRODUCTION_ADMIN_PASSWORD");
  const ownerName = process.env.PRODUCTION_OWNER_NAME?.trim() || "Owner Coppa Reghinna Minor";
  const adminName = process.env.PRODUCTION_ADMIN_NAME?.trim() || "Admin Coppa Reghinna Minor";

  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { email: ownerEmail },
      update: {
        name: ownerName,
        role: UserRole.OWNER,
        passwordHash: hashPassword(ownerPassword),
      },
      create: {
        email: ownerEmail,
        name: ownerName,
        role: UserRole.OWNER,
        passwordHash: hashPassword(ownerPassword),
      },
    });

    await transaction.user.upsert({
      where: { email: adminEmail },
      update: {
        name: adminName,
        role: UserRole.ADMIN,
        passwordHash: hashPassword(adminPassword),
      },
      create: {
        email: adminEmail,
        name: adminName,
        role: UserRole.ADMIN,
        passwordHash: hashPassword(adminPassword),
      },
    });

    const organization = await transaction.organization.upsert({
      where: { slug: organizationSlug },
      update: {
        name: "Coppa Reghinna Minor",
      },
      create: {
        name: "Coppa Reghinna Minor",
        slug: organizationSlug,
      },
      select: { id: true },
    });

    await transaction.match.deleteMany({
      where: {
        tournament: {
          organizationId: organization.id,
        },
      },
    });

    await transaction.teamRegistration.deleteMany({
      where: {
        tournament: {
          organizationId: organization.id,
        },
      },
    });

    await transaction.tournamentGroup.deleteMany({
      where: {
        tournament: {
          organizationId: organization.id,
        },
      },
    });

    await transaction.tournamentTeam.deleteMany({
      where: {
        tournament: {
          organizationId: organization.id,
        },
      },
    });

    await transaction.player.deleteMany({
      where: {
        organizationId: organization.id,
      },
    });

    await transaction.team.deleteMany({
      where: {
        organizationId: organization.id,
      },
    });

    await transaction.tournament.deleteMany({
      where: {
        organizationId: organization.id,
      },
    });

    await transaction.tournament.create({
      data: {
        organizationId: organization.id,
        name: "Coppa Reghinna Minor 2026",
        slug: tournamentSlug,
        sport: "Futsal",
        seasonLabel: "Estate 2026",
        locationLabel: "Maiori",
        format: TournamentFormat.GROUPS_PLUS_KNOCKOUT,
        status: TournamentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  });

  console.log(`Seed di produzione completato per ${tournamentSlug}.`);
  console.log(`Owner: ${ownerEmail}`);
  console.log(`Admin: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
