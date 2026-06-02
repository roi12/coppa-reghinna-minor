"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-6">
      <div className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-slate-300 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Application error
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Something went wrong while loading the page.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Try the request again. If the problem continues, verify the database connection and
            required environment variables before retrying the deployment.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <Link
            href="/tournaments"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Open tournaments
          </Link>
        </div>
      </div>
    </main>
  );
}
