import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 sm:px-6">
      <div className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-slate-300 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Not found
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            The requested page could not be found.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The tournament may be unpublished, the link may be outdated, or the route may have
            been entered incorrectly.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Browse tournaments
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
