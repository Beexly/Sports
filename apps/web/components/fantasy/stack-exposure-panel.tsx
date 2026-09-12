"use client";

/**
 * StackExposurePanel — what the generated portfolio is actually betting on.
 *
 * Closes the wave4 gap (repos/nuke-dfs-hub portfolio combo-exposure analytics):
 * we generated k-best lineups and showed them without ever stating the
 * portfolio's structural bets. This panel reports stack rate, bring-back rate,
 * and per-player exposure as counts with visible denominators.
 *
 * Rates render as an em-dash with the reason when the denominator is zero —
 * "no data" is never dressed up as "0%".
 */

import { useMemo } from "react";
import { playerExposure, stackReport } from "@/lib/fantasy/stack-exposure";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

const pct = (v: number | null): string => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);
const num = (v: number | null): string => (v === null ? "—" : v.toFixed(2));

export function StackExposurePanel({
  lineups,
}: {
  lineups: readonly (readonly DfsPlayer[])[];
}) {
  const report = useMemo(() => stackReport(lineups), [lineups]);
  const exposure = useMemo(() => playerExposure(lineups), [lineups]);
  const top = exposure.slice(0, 8);
  const most = exposure[0] ?? null;
  const concentrated = most !== null && (most.pct ?? 0) >= 0.75 && exposure.length > 1;

  return (
    <div className="surface-card overflow-hidden" data-testid="stack-exposure">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ion-3">
          Portfolio shape
        </span>
        <span className="ml-auto font-mono text-[11px] text-ion-3">
          {report.lineups} lineups · {report.withQb} with a QB
        </span>
      </div>

      <div className="mt-3 grid gap-3 px-4 sm:grid-cols-4">
        {(
          [
            ["QB stack rate", pct(report.stackRate), "lineups with a same-team pass-catcher"],
            ["Bring-back rate", pct(report.bringBackRate), "lineups with an opposing skill player"],
            ["Mean stack", num(report.meanStack), "catchers per QB lineup"],
            ["Max same game", num(report.maxSameGame), "most players sharing one game"],
          ] as const
        ).map(([label, value, sub]) => (
          <div
            key={label}
            data-testid="stack-exposure-stat"
            className="rounded-lg border border-ion-1/20 bg-ion-1/5 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-ion-3">{label}</p>
            <p className="mt-0.5 font-mono text-xl text-ion-white">{value}</p>
            <p className="text-[10px] leading-tight text-ion-3">{sub}</p>
          </div>
        ))}
      </div>

      {concentrated && most && (
        <p
          data-testid="stack-exposure-concentration"
          className="mx-4 mt-3 rounded-lg border border-caution/30 bg-caution/10 px-3 py-2 text-xs text-ion-2"
        >
          {most.name} appears in {(most.pct! * 100).toFixed(0)}% of these lineups across{" "}
          {report.lineups} entries — this portfolio is largely one bet, repeated.
        </p>
      )}

      <div className="mt-4 px-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ion-3">Player exposure</p>
        {top.length === 0 ? (
          <p className="py-4 text-sm text-ion-2">
            No lineups to measure — exposure is undefined, not zero.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5 pb-4">
            {top.map((e) => (
              <li key={e.playerId} className="flex items-center gap-3 text-sm">
                <span className="min-w-[8rem] flex-1 truncate text-ion-white">{e.name}</span>
                <span className="w-10 text-xs text-ion-3">{e.pos}</span>
                <span className="w-10 text-xs text-ion-3">{e.team}</span>
                <span className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-ion-1/20 sm:block">
                  <span
                    className="block h-full rounded-full bg-orbital-cyan"
                    style={{ width: `${(e.pct ?? 0) * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right font-mono text-xs text-ion-1">
                  {pct(e.pct)}
                </span>
                <span className="w-10 text-right font-mono text-xs text-ion-3">
                  {e.count}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-ion-1/10 px-4 py-3 text-[11px] text-ion-3">{report.note}</p>
    </div>
  );
}

export default StackExposurePanel;
