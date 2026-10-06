"use client";

/**
 * PickemRanker — ranked pick'em table (Beexly/Sports#799).
 *
 * Ranks the active pick'em slate by edge desc via rankPickem() (vig-stripped
 * edge e = p − q; priced edges first, then unpriced conviction). Advisory
 * only: we read third-party pick'em lines, we do not operate a pick'em
 * product. Source label flips fictional ↔ live via isLivePickem().
 */

import { useMemo } from "react";
import { rankPickem } from "@/lib/fantasy/pickem-optimizer";
import { isLivePickem } from "@/lib/integrations/pickem";
import type { Prop } from "@/lib/fantasy/props";

export function PickemRanker({
  lines,
  live,
}: {
  lines?: readonly Prop[];
  live?: boolean;
}) {
  const ranked = useMemo(() => rankPickem(lines), [lines]);
  const isLive = live ?? isLivePickem();

  return (
    <div className="surface-card overflow-hidden" data-testid="pickem-ranker">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ion-3">
          Pick&apos;em ranker
        </span>
        <span
          data-testid="pickem-ranker-source"
          className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
            isLive
              ? "bg-orbital-cyan/20 text-orbital-cyan"
              : "bg-caution/20 text-caution"
          }`}
        >
          {isLive ? "Source: live" : "Source: fictional (illustrative)"}
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ion-2">
          No pick&apos;em lines are connected right now.
        </p>
      ) : (
        <div className="overflow-x-auto px-4 pb-4 pt-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-ion-3">
                <th scope="col" className="py-2 pr-3 font-semibold">#</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Player</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Market</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Side</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Edge pts</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Best alt EV</th>
                <th scope="col" className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ rank, read }) => (
                <tr
                  key={read.prop.id}
                  data-testid={`pickem-ranker-row-${read.prop.id}`}
                  className="border-t text-ion-1"
                  style={{ borderColor: "var(--line)" }}
                >
                  <td className="py-2 pr-3 font-mono tabular-nums text-ion-3">{rank}</td>
                  <td className="py-2 pr-3 font-semibold">{read.prop.player}</td>
                  <td className="py-2 pr-3 text-ion-2">{read.prop.market}</td>
                  <td
                    className="py-2 pr-3 font-semibold uppercase"
                    style={{
                      color:
                        read.side === "over"
                          ? "var(--orbital-cyan)"
                          : "var(--plasma)",
                    }}
                  >
                    {read.side}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {read.priced ? `${(read.edge * 100).toFixed(1)} pts` : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-ion-2">
                    {read.bestAlt
                      ? `${read.bestAlt.ev >= 0 ? "+" : ""}${read.bestAlt.ev.toFixed(2)} @ ${read.bestAlt.line} (${read.bestAlt.mult}×)`
                      : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        read.priced
                          ? "bg-orbital-cyan/20 text-orbital-cyan"
                          : "text-ion-2"
                      }`}
                    >
                      {read.priced ? "Priced" : "Unpriced"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
