import { createHash, randomBytes } from "node:crypto";

import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthUser } from "@/features/auth/types/auth.types";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "sports_platform_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    priority: "high" as const,
    expires: expiresAt,
    maxAge: SESSION_DURATION_MS / 1000,
  };
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function canManageDashboard(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiryDate();

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function requireSignedInUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?type=error&message=Sign%20in%20to%20access%20the%20dashboard.");
  }

  return user;
}

export async function requireDashboardUser() {
  const user = await requireSignedInUser();

  if (!canManageDashboard(user.role)) {
    redirect("/tournaments");
  }

  return user;
}

export async function requireOwnerOrAdmin() {
  return requireDashboardUser();
}
