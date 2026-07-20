import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const prepareOnly = args.has("--prepare-only");
const showHelp = args.has("--help") || args.has("-h");
const postgresPort = process.env.POSTGRES_PORT?.trim() || "5432";

const testDatabaseUrl =
  `postgresql://reghinna:reghinna_local_password@localhost:${postgresPort}/reghinna_test?schema=public`;

function buildLocalEnv(overrides = {}) {
  const env = {
    ...process.env,
    APP_ENV: "local",
    ...overrides,
  };

  delete env.VERCEL;
  delete env.VERCEL_ENV;
  delete env.VERCEL_TARGET_ENV;
  delete env.VERCEL_URL;
  delete env.VERCEL_OIDC_TOKEN;

  return env;
}

function runStep(label, command, commandArgs, env = buildLocalEnv()) {
  console.log(`\n==> ${label}`);

  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (showHelp) {
  console.log(`Usage: npm run dev:local -- [--prepare-only]

Options:
  --prepare-only   Start Docker, push Prisma schema, ensure reghinna_test, then exit
  --help, -h       Show this help
`);
  process.exit(0);
}

runStep("Start local Postgres", "docker", ["compose", "up", "-d"]);
runStep("Push Prisma schema", "npm", ["run", "db:push"]);
runStep(
  "Ensure local test database",
  "npm",
  ["run", "db:test:ensure"],
  buildLocalEnv({
    DATABASE_URL: testDatabaseUrl,
    DIRECT_URL: testDatabaseUrl,
  }),
);

if (prepareOnly) {
  console.log("\nLocal database setup complete.");
  process.exit(0);
}

runStep("Start Next.js dev server", "npm", ["run", "dev"]);
