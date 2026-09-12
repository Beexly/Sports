"use client";

/**
 * ExpertBoard — illustrative Airwave pundit leaderboard (fictional demo only).
 *
 * Renders grade.leaderboard() over the fictional DEMO pundits/claims behind
 * the GATE_NOTE banner. Real pundit records stay founder-gated; hit rates
 * publish only at/above the decided-call floor, otherwise counts show.
 */

import { leaderboard } from "@/lib/airwave/grade";
import { DEMO_PUNDITS, DEMO_CLAIMS } from "@/lib/airwave/demo-ledger";
import {
  GATE_NOTE,
  MIN_DECIDED_FOR_PUBLISHED_RATE,
} from "@/lib/airwave/expert-ingestion";

const board = leaderboard(DEMO_PUNDITS, DEMO_CLAIMS);

function rateCell(hits: number, misses: number, hitRate: number | null): string {
  if (hitRate === null) {
    const decided = hits + misses;
    return `${hits}–${misses} (${decided} decided)`;
  }
  return `${Math.round(hitRate * 100)}% (${hits}–${misses})`;
}

export function ExpertBoard() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-titanium bg-void/60 px-4 py-3 sm:px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">
          Illustrative ledger · fictional personas
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ion-1">{GATE_NOTE}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-titanium font-mono text-[11px] uppercase tracking-wider text-ion-2">
              <th scope="col" className="px-4 py-3 font-medium">Pundit</th>
              <th scope="col" className="px-4 py-3 font-medium">Show</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Index</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Hit rate</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Graded</th>
            </tr>
          </thead>
          <tbody>
            {board.map((card) => (
              <tr
                key={card.punditId}
                className="border-b border-titanium/60 last:border-0"
              >
                <td className="px-4 py-3 font-semibold text-ion-white">{card.name}</td>
                <td className="px-4 py-3 text-ion-2">{card.show}</td>
                <td className="px-4 py-3 text-right font-display tabular-nums text-ion-white">
                  {card.accountabilityIndex}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ion-1">
                  {rateCell(card.hits, card.misses, card.hitRate)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ion-2">
                  {card.graded}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-titanium bg-void/60 px-4 py-3 sm:px-5">
        <p className="text-xs leading-relaxed text-ion-2">
          Hit rates publish only at {MIN_DECIDED_FOR_PUBLISHED_RATE}+ decided
          calls; below that, counts show instead of a percentage. Personas and
          matchups are fictional — nothing here describes a living person.
        </p>
      </div>
    </div>
  );
}
