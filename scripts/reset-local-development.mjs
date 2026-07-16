import "../src/lib/load-env.mjs";
import { execFileSync } from "node:child_process";

function parseRequiredDatabaseUrl(value, label) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  const url = new URL(value.trim());
  const databaseName = url.pathname.replace(/^\//, "");

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(`${label} must point to localhost or 127.0.0.1.`);
  }

  if (databaseName !== "reghinna_local") {
    throw new Error(`${label} must point to the reghinna_local database.`);
  }

  if (/supabase/i.test(url.hostname) || /supabase/i.test(value)) {
    throw new Error(`${label} must not point to Supabase or another remote host.`);
  }

  return {
    url,
    databaseName,
  };
}

function assertSafeLocalResetEnvironment() {
  const appEnv = process.env.APP_ENV?.trim();

  if (appEnv !== "local") {
    throw new Error("APP_ENV must be local before resetting the development database.");
  }

  if (process.env.VERCEL) {
    throw new Error("VERCEL must not be set when resetting the development database.");
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("VERCEL_ENV cannot be production when resetting the development database.");
  }

  const database = parseRequiredDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
  const direct = parseRequiredDatabaseUrl(
    process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    "DIRECT_URL",
  );

  if (
    database.url.hostname !== direct.url.hostname ||
    database.url.port !== direct.url.port ||
    database.databaseName !== direct.databaseName
  ) {
    throw new Error("DATABASE_URL and DIRECT_URL must point to the same local development database.");
  }

  return {
    host: database.url.hostname,
    port: database.url.port || "5432",
    databaseName: database.databaseName,
  };
}

function runPrismaReset() {
  execFileSync(
    "npx",
    ["prisma", "migrate", "reset", "--force"],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
}

function main() {
  const target = assertSafeLocalResetEnvironment();

  console.log(
    `Resetting clean local development database at ${target.host}:${target.port}/${target.databaseName}`,
  );

  runPrismaReset();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
