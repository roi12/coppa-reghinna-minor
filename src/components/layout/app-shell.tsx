import type { ReactNode } from "react";
import Link from "next/link";

import { signOutAction } from "@/features/auth/server/auth-actions";
import type { AuthUser } from "@/features/auth/types/auth.types";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  user?: AuthUser;
};

export function AppShell({ children, title, subtitle, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-8">
        <header className="border-b border-slate-300 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                Sports Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <nav className="flex flex-wrap gap-2">
              {user ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-950">{user.name}</span>
                  <span className="text-slate-500">{user.role.toLowerCase()}</span>
                </div>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/tournaments/new"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
              >
                New tournament
              </Link>
              {user ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
            </nav>
          </div>
        </header>
        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
