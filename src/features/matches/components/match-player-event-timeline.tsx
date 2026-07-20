import type { MatchPlayerEventTimelineItem } from "@/features/matches/types/match-player-events.types";

type MatchPlayerEventTimelineProps = {
  events: MatchPlayerEventTimelineItem[];
  emptyMessage?: string;
};

export function MatchPlayerEventTimeline({
  events,
  emptyMessage = "Nessun evento giocatore registrato al momento.",
}: MatchPlayerEventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {events.map((event) => (
        <article
          key={event.id}
          className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex min-w-[2.75rem] shrink-0 flex-col items-center rounded-[0.9rem] bg-slate-100 px-2 py-2 text-center">
              {typeof event.matchMinute === "number" ? (
                <span className="text-sm font-semibold leading-none text-slate-950">
                  {event.matchMinute}&apos;
                </span>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ev.
                </span>
              )}
              <span className="mt-1 text-[11px] text-slate-500">#{event.sequence}</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-slate-950">{event.label}</p>
              <p className="mt-1 text-sm text-slate-600">{event.teamName}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
