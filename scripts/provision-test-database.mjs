import "../src/lib/load-env.mjs";
import { Client } from "pg";

function parseDatabaseUrl(value, label) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  const url = new URL(value.trim());

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(`${label} must point to localhost.`);
  }

  if (url.pathname.replace(/^\//, "") !== "reghinna_test") {
    throw new Error(`${label} must point to the reghinna_test database.`);
  }

  if (/supabase/i.test(url.hostname) || /supabase/i.test(value)) {
    throw new Error(`${label} must not point to Supabase.`);
  }

  return url;
}

function assertSafeEnvironment() {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv !== "test" && appEnv !== "local") {
    throw new Error("APP_ENV must be test or local before provisioning the test database.");
  }

  if (process.env.VERCEL) {
    throw new Error("VERCEL must not be set when provisioning the test database.");
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("VERCEL_ENV cannot be production when provisioning the test database.");
  }

  const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
  const directUrl = parseDatabaseUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL, "DIRECT_URL");

  if (databaseUrl.hostname !== directUrl.hostname || databaseUrl.port !== directUrl.port) {
    throw new Error("DATABASE_URL and DIRECT_URL must resolve to the same local host and port.");
  }

  return {
    databaseUrl,
    directUrl,
  };
}

async function ensureDatabaseExists(targetUrl) {
  const adminUrl = new URL(targetUrl.toString());
  adminUrl.pathname = "/postgres";

  const client = new Client({
    connectionString: adminUrl.toString(),
  });

  await client.connect();

  try {
    const exists = await client.query("select 1 from pg_database where datname = $1", ["reghinna_test"]);

    if (exists.rowCount === 0) {
      await client.query(`create database "reghinna_test"`);
      console.log("Created local test database: localhost:5432/reghinna_test");
    } else {
      console.log("Local test database already exists: localhost:5432/reghinna_test");
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const { databaseUrl } = assertSafeEnvironment();
  await ensureDatabaseExists(databaseUrl);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
