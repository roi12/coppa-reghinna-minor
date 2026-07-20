type MatchLiveIndicatorProps = {
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
};

export function MatchLiveIndicator({ status }: MatchLiveIndicatorProps) {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">
        <span className="relative flex h-2 w-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        Live
      </span>
    );
  }

  if (status === "FINISHED") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
        Finale
      </span>
    );
  }

  if (status === "POSTPONED") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
        Rinviata
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
        Annullata
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800">
      Programmata
    </span>
  );
}
