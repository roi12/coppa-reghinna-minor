import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/run-with-local-env.mjs <command> [...args]");
  process.exit(1);
}

const env = {
  ...process.env,
  APP_ENV: process.env.APP_ENV?.trim() || "local",
  NODE_ENV: process.env.NODE_ENV?.trim() || "development",
};

delete env.VERCEL;
delete env.VERCEL_ENV;
delete env.VERCEL_TARGET_ENV;
delete env.VERCEL_URL;
delete env.VERCEL_OIDC_TOKEN;

const result = spawnSync(command, args, {
  stdio: "inherit",
  env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
