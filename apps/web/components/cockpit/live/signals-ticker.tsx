/**
 * SignalsTicker — a Bloomberg-style horizontal ticker of the real Signals lane.
 *
 * Pure CSS marquee (gse-marquee): the track holds the signal items twice so the
 * -50% loop is seamless; hover pauses; reduced-motion stops it (global rule).
 * Server-safe — no client JS. Every item is a real Signals CommandCard; when the
 * lane is empty it shows an honest, static "no signals firing" strip instead of
 * scrolling fabricated content.
 */

import type { CommandLane, CardRisk } from "@/lib/cockpit/daily-command/types";

const RISK_DOT: Record<CardRisk, string> = {
  CRITICAL: "bg-rose-400",
  HIGH: "bg-amber-400",
  MEDIUM: "bg-sky-400",
  LOW: "bg-emerald-400",
  NONE: "bg-ink-500",
};

export function SignalsTicker({ lane }: { readonly lane: CommandLane | undefined }) {
  const cards = lane?.cards ?? [];

  if (cards.length === 0) {
    return (
      <div className="surface-card flex items-center gap-2 px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-500" aria-hidden />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          No signals firing — the Signals lane is quiet or telemetry is unreachable. Nothing fabricated.
        </p>
      </div>
    );
  }

  // Duplicate the items so the -50% translate loops seamlessly.
  const items = [...cards, ...cards];

  return (
    <div
      className="gse-marquee surface-card px-0 py-2.5"
      aria-label="Live signals ticker"
    >
      <div className="gse-marquee-track">
        {items.map((card, i) => (
          <span
            key={`${card.id}-${i}`}
            className="mx-5 inline-flex items-center gap-2 font-mono text-[11px] tracking-wide text-ink-300"
            aria-hidden={i >= cards.length}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${RISK_DOT[card.risk]}`} />
            <span className="font-semibold text-white">{card.title}</span>
            <span className="text-ink-600">·</span>
            <span className="text-ink-500">{card.agentOwner}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
