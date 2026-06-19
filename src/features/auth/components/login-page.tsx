import Link from "next/link";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { signInAction, signOutAction } from "@/features/auth/server/auth-actions";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { getLoginPagePresentation } from "@/features/auth/utils/dev-login-hints";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";

type LoginPageProps = {
  currentUser: AuthUser | null;
  feedback: DashboardFeedback | null;
};

export function LoginPage({ currentUser, feedback }: LoginPageProps) {
  const presentation = getLoginPagePresentation();
  const showDevLoginHints = presentation.showDevLoginHints;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10 text-slate-950 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-300 bg-white/92 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Accesso organizzazione
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Accedi al dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            L&apos;accesso al dashboard è riservato agli account owner e admin. Gli account viewer
            possono entrare, ma restano limitati alle pagine pubbliche del torneo.
          </p>

          {showDevLoginHints ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">Account locali di esempio</p>
              <div className="mt-3 space-y-2">
                <p>
                  <span className="font-medium">Owner:</span>{" "}
                  <code className="rounded bg-slate-200 px-1 py-0.5">owner@sports-platform.local</code>{" "}
                  / <code className="rounded bg-slate-200 px-1 py-0.5">owner-demo-pass</code>
                </p>
                <p>
                  <span className="font-medium">Admin:</span>{" "}
                  <code className="rounded bg-slate-200 px-1 py-0.5">admin@sports-platform.local</code>{" "}
                  / <code className="rounded bg-slate-200 px-1 py-0.5">admin-demo-pass</code>
                </p>
                <p>
                  <span className="font-medium">Viewer:</span>{" "}
                  <code className="rounded bg-slate-200 px-1 py-0.5">viewer@sports-platform.local</code>{" "}
                  / <code className="rounded bg-slate-200 px-1 py-0.5">viewer-demo-pass</code>
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/tournaments"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
            >
              Vai ai tornei
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-300 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
          <p className="mt-2 text-sm text-slate-600">
            {presentation.helperText}
          </p>

          <div className="mt-6">
            <FeedbackBanner feedback={feedback} />
          </div>

          {currentUser ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Accesso effettuato come</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{currentUser.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {currentUser.email} · {currentUser.role.toLowerCase()}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {currentUser.role === "OWNER" || currentUser.role === "ADMIN" ? (
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                  >
                    Apri dashboard
                  </Link>
                ) : (
                  <Link
                    href="/tournaments"
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                  >
                    Apri tornei pubblici
                  </Link>
                )}

                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
                  >
                    Esci
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <form action={signInAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder={presentation.emailPlaceholder}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder={presentation.passwordPlaceholder}
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              >
                Accedi
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
