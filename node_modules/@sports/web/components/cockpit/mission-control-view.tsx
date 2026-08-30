/**
 * MissionControlView — the prioritized briefing, rendered. Server component;
 * the lead card is featured, the rest form the grid. Each card deep-links to act.
 */

import Link from "next/link";
import type { BriefingCard } from "@/lib/cockpit/mission-control";

export function MissionControlView({ cards }: { cards: readonly BriefingCard[] }) {
  if (cards.length === 0) return null;
  const [lead, ...rest] = cards;

  return (
    <div className="space-y-5">
      {lead && <Card card={lead} featured />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((c) => <Card key={c.id} card={c} />)}
      </div>
    </div>
  );
}

function Card({ card, featured }: { card: BriefingCard; featured?: boolean }) {
  return (
    <Link
      href={card.href}
      className={`surface-card group relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${featured ? "p-7 sm:p-9" : "p-5"}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: card.accent }}>{card.eyebrow}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: card.accent }} />
          P{card.priority}
        </span>
      </div>
      <h3 className={`mt-3 font-semibold text-ion-white ${featured ? "font-display text-2xl sm:text-3xl" : "text-base"}`}>{card.headline}</h3>
      <p className={`mt-2 flex-1 leading-relaxed text-ink-300 ${featured ? "text-base" : "text-sm"}`}>{card.detail}</p>
      <span aria-hidden className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1" style={{ color: card.accent }}>
        {card.action} →
      </span>
    </Link>
  );
}
