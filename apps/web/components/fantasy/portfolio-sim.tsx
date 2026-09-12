"use client";

/**
 * PortfolioSim — portfolio ROI vs a simulated DFS field (Beexly/Sports#795).
 *
 * Client component. Takes the kBest lineups (each lineup's total projection
 * as its portfolio score) and ranks them against a deterministic simulated
 * field via simulatePortfolio. Flat vs top-heavy pay-table toggle.
 * Sample-data label is always shown: illustrative projections, not predictions.
 */

import { useMemo, useState } from "react";
import {
  flatPayoutTable,
  topHeavyPayoutTable,
  simulateFieldScores,
  simulatePortfolio,
} from "@/lib/fantasy/payout-sim";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

type TableKind = "flat" | "topheavy";

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;
const roi = (n: number): string => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

export function PortfolioSim({
  lineups,
  fieldSize = 100,
  fieldMean = 145,
  fieldSd = 18,
  entryFee = 10,
  paidSpots = 20,
  sampleLabel = "Sample projections — illustrative, not predictions.",
}: {
  lineups: readonly (readonly DfsPlayer[])[];
  fieldSize?: number;
  fieldMean?: number;
  fieldSd?: number;
  entryFee?: number;
  paidSpots?: number;
  sampleLabel?: string;
}) {
  const [table, setTable] = useState<TableKind>("flat");

  const result = useMemo(() => {
    const payTable =
      table === "flat"
        ? flatPayoutTable(paidSpots, 2)
        : topHeavyPayoutTable(10, 100, 2, 1.5);
    const scores = lineups.map((lu) => lu.reduce((s, p) => s + p.proj, 0));
    const field = simulateFieldScores(fieldSize, fieldMean, fieldSd, 42);
    return simulatePortfolio(scores, field, payTable, entryFee);
  }, [lineups, table, fieldSize, fieldMean, fieldSd, entryFee, paidSpots]);

  return (
    <section aria-label="Portfolio simulation" className="surface-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ion-white">Portfolio simulation</h2>
        <div className="flex rounded-full border border-mineral p-0.5" role="group" aria-label="Pay table">
          {(["flat", "topheavy"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTable(k)}
              aria-pressed={table === k}
              className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                table === k ? "bg-orbital-cyan text-obsidian" : "text-ion-1 hover:text-ion-white"
              }`}
            >
              {k === "flat" ? "Flat" : "Top-heavy"}
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-caution">{sampleLabel}</p>

      {lineups.length === 0 ? (
        <p className="text-sm text-ion-1">No lineups yet — generate kBest lineups first.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["ROI (mean)", roi(result.roiDist.mean)],
              ["ROI p50", roi(result.roiDist.p50)],
              ["ROI p90", roi(result.roiDist.p90)],
              ["ITM rate", pct(result.itmRate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-mineral px-3 py-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">{label}</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums text-ion-white">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ion-1">
            {result.perLineup.length} lineups × ${entryFee} vs simulated field of {fieldSize} ·{" "}
            {table === "flat" ? `flat top-${paidSpots} ×2` : "top-heavy GPP"} · invested $
            {result.invested.toFixed(0)}, returned ${result.returned.toFixed(1)}.
          </p>
        </>
      )}
    </section>
  );
}
