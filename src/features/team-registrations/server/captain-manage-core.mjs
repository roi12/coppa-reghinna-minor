import { createHash, randomBytes } from "node:crypto";

const DEFAULT_APP_URL = "http://localhost:3000";

function getCaptainManageBaseUrl() {
  const rawUrl = process.env.APP_URL?.trim() || DEFAULT_APP_URL;

  try {
    return new URL(rawUrl);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
}

export function generateCaptainManageToken() {
  return randomBytes(32).toString("hex");
}

export function hashCaptainManageToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildCaptainManagePath(tournamentSlug, token) {
  return `/tournaments/${tournamentSlug}/register-team/manage/${token}`;
}

export function buildCaptainManageUrl(tournamentSlug, token) {
  return new URL(buildCaptainManagePath(tournamentSlug, token), getCaptainManageBaseUrl()).toString();
}
