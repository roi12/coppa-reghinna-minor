import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function getTrackedFiles() {
  try {
    return execSync("git ls-files", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const trackedFiles = getTrackedFiles();

const forbiddenTrackedEnvFiles = [".env", ".env.local", ".env.production", ".env.staging"];
for (const file of forbiddenTrackedEnvFiles) {
  if (trackedFiles.includes(file)) {
    fail(`${file} is tracked by git. Real environment files must never be committed.`);
  }
}

if (!forbiddenTrackedEnvFiles.some((file) => trackedFiles.includes(file))) {
  pass("No real env files are tracked.");
}

const allowedExampleFiles = [".env.example"];
for (const file of allowedExampleFiles) {
  if (!existsSync(file)) continue;

  const content = readFileSync(file, "utf8");

  const suspiciousPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY=["'][^"']{20,}["']/,
    /RESEND_API_KEY=["'][^"']{20,}["']/,
    /SMTP_PASSWORD=["'][^"']{8,}["']/,
    /PRODUCTION_ADMIN_PASSWORD=["'][^"']{8,}["']/,
    /PRODUCTION_OWNER_PASSWORD=["'][^"']{8,}["']/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      fail(`${file} appears to contain a real secret.`);
    }
  }
}

pass(".env.example does not appear to contain real secrets.");

const loginPage = "src/features/auth/components/login-page.tsx";
if (existsSync(loginPage)) {
  const content = readFileSync(loginPage, "utf8");

  const hasDevCredentials =
    content.includes("owner@sports-platform.local") ||
    content.includes("admin@sports-platform.local") ||
    content.includes("owner-demo-pass");

  const hasGuard =
    content.includes("showDevLoginHints") ||
    content.includes("shouldShowDevLoginHints");

  if (hasDevCredentials && !hasGuard) {
    fail("Login page contains local credentials without an obvious dev-only guard.");
  } else {
    pass("Login page local credentials are guarded or absent.");
  }
}

const devHints = "src/features/auth/utils/dev-login-hints.ts";
if (existsSync(devHints)) {
  const content = readFileSync(devHints, "utf8");

  if (
    content.includes('APP_ENV === "local"') ||
    content.includes("APP_ENV === 'local'") ||
    content.includes('APP_ENV === "test"') ||
    content.includes("APP_ENV === 'test'")
  ) {
    pass("Dev login hints are restricted by APP_ENV.");
  } else {
    fail("Dev login hints do not appear to be restricted by APP_ENV local/test.");
  }
}

if (process.exitCode) {
  console.error("\nProduction safety check failed.");
  process.exit(process.exitCode);
}

console.log("\nProduction safety check passed.");
