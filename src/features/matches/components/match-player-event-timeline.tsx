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
    <div className="grid gap-3">
      {events.map((event) => (
        <article
          key={event.id}
          className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{event.label}</p>
              <p className="mt-1 text-sm text-slate-600">{event.teamName}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-500">
              <p>#{event.sequence}</p>
              {typeof event.matchMinute === "number" ? <p>{event.matchMinute}&apos;</p> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
