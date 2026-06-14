import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";
import { getSiteUrl } from "@/lib/site-url";

const CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME = "team_registration_manage_link";
const DASHBOARD_CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME =
  "dashboard_team_registration_manage_link";
const CAPTAIN_MANAGE_LINK_FLASH_MAX_AGE_SECONDS = 60 * 10;

function getCaptainManageLinkFlashCookieOptions(path: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path,
    priority: "high" as const,
    maxAge: CAPTAIN_MANAGE_LINK_FLASH_MAX_AGE_SECONDS,
  };
}

function getCaptainManageLinkFlashCookiePath(tournamentSlug: string) {
  return `/tournaments/${tournamentSlug}/register-team`;
}

function getDashboardCaptainManageLinkFlashCookiePath(tournamentSlug: string) {
  return `/dashboard/tournaments/${tournamentSlug}`;
}

export function generateCaptainManageToken() {
  return randomBytes(32).toString("hex");
}

export function hashCaptainManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildCaptainManagePath(tournamentSlug: string, token: string) {
  return `/tournaments/${tournamentSlug}/register-team/manage/${token}`;
}

export function buildCaptainManageUrl(tournamentSlug: string, token: string) {
  return new URL(buildCaptainManagePath(tournamentSlug, token), getSiteUrl()).toString();
}

async function storeCaptainManageLinkFlashCookie(cookieName: string, path: string, token: string) {
  const cookieStore = await cookies();

  cookieStore.set(
    cookieName,
    token,
    getCaptainManageLinkFlashCookieOptions(path),
  );
}

async function readCaptainManageLinkFlashCookie(
  cookieName: string,
  tournamentSlug: string,
): Promise<TeamRegistrationManageLinkReveal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  return {
    managePath: buildCaptainManagePath(tournamentSlug, token),
    manageUrl: buildCaptainManageUrl(tournamentSlug, token),
  };
}

async function clearCaptainManageLinkFlashCookie(cookieName: string, path: string) {
  const cookieStore = await cookies();

  cookieStore.set(cookieName, "", {
    ...getCaptainManageLinkFlashCookieOptions(path),
    maxAge: 0,
  });
}

export async function storeCaptainManageLinkFlash(tournamentSlug: string, token: string) {
  return storeCaptainManageLinkFlashCookie(
    CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    getCaptainManageLinkFlashCookiePath(tournamentSlug),
    token,
  );
}

export async function readCaptainManageLinkFlash(
  tournamentSlug: string,
): Promise<TeamRegistrationManageLinkReveal | null> {
  return readCaptainManageLinkFlashCookie(CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME, tournamentSlug);
}

export async function clearCaptainManageLinkFlash(tournamentSlug: string) {
  return clearCaptainManageLinkFlashCookie(
    CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    getCaptainManageLinkFlashCookiePath(tournamentSlug),
  );
}

export async function storeDashboardCaptainManageLinkFlash(tournamentSlug: string, token: string) {
  return storeCaptainManageLinkFlashCookie(
    DASHBOARD_CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    getDashboardCaptainManageLinkFlashCookiePath(tournamentSlug),
    token,
  );
}

export async function readDashboardCaptainManageLinkFlash(
  tournamentSlug: string,
): Promise<TeamRegistrationManageLinkReveal | null> {
  return readCaptainManageLinkFlashCookie(
    DASHBOARD_CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    tournamentSlug,
  );
}

export async function clearDashboardCaptainManageLinkFlash(tournamentSlug: string) {
  return clearCaptainManageLinkFlashCookie(
    DASHBOARD_CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    getDashboardCaptainManageLinkFlashCookiePath(tournamentSlug),
  );
}
