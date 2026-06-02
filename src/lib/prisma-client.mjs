import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it to a PostgreSQL connection string before starting the app or running Prisma commands.",
    );
  }

  return databaseUrl;
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__sportsPlatformPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__sportsPlatformPrisma = prisma;
}

const prismaClientModule = {
  createPrismaClient,
  getDatabaseUrl,
  prisma,
};

export default prismaClientModule;
