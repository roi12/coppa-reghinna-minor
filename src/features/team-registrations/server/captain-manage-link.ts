import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import type { TeamRegistrationManageLinkReveal } from "@/features/team-registrations/types/team-registration.types";

const CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME = "team_registration_manage_link";
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

export function generateCaptainManageToken() {
  return randomBytes(32).toString("hex");
}

export function hashCaptainManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildCaptainManagePath(tournamentSlug: string, token: string) {
  return `/tournaments/${tournamentSlug}/register-team/manage/${token}`;
}

export async function storeCaptainManageLinkFlash(tournamentSlug: string, token: string) {
  const cookieStore = await cookies();

  cookieStore.set(
    CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME,
    token,
    getCaptainManageLinkFlashCookieOptions(getCaptainManageLinkFlashCookiePath(tournamentSlug)),
  );
}

export async function readCaptainManageLinkFlash(
  tournamentSlug: string,
): Promise<TeamRegistrationManageLinkReveal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  return {
    managePath: buildCaptainManagePath(tournamentSlug, token),
    manageUrl: buildCaptainManagePath(tournamentSlug, token),
  };
}

export async function clearCaptainManageLinkFlash(tournamentSlug: string) {
  const cookieStore = await cookies();
  const path = getCaptainManageLinkFlashCookiePath(tournamentSlug);

  cookieStore.set(CAPTAIN_MANAGE_LINK_FLASH_COOKIE_NAME, "", {
    ...getCaptainManageLinkFlashCookieOptions(path),
    maxAge: 0,
  });
}
