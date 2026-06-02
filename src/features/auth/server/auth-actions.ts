"use server";

import { redirect } from "next/navigation";

import { signInSchema } from "@/features/auth/schemas/sign-in.schema";
import { createUserSession, clearUserSession } from "@/features/auth/server/session";
import { verifyPassword } from "@/features/auth/server/password";
import { prisma } from "@/lib/prisma";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/login", "error", "Enter a valid email and password.");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return redirectWithMessage("/login", "error", "Incorrect email or password.");
  }

  await createUserSession(user.id);

  if (user.role === "VIEWER") {
    redirect("/tournaments");
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await clearUserSession();

  redirectWithMessage("/login", "success", "Signed out.");
}
