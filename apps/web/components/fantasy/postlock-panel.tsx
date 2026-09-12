"use client";

/**
 * PostLockPanel — pre-lock lineup vs lateSwap readout (Beexly/Sports#798).
 *
 * Client component. Pure readout over postLockReadout: which locked players
 * were kept, who swapped out/in (names), and proj/ceiling/salary deltas.
 */

import { useMemo } from "react";
import { postLockReadout } from "@/lib/fantasy/postlock";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

const delta = (n: number, digits = 1): string =>
  `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;

export function PostLockPanel({
  pre,
  post,
  lockedIds,
}: {
  pre: readonly DfsPlayer[];
  post: readonly DfsPlayer[];
  lockedIds: ReadonlySet<string>;
}) {
  const report = useMemo(() => postLockReadout(pre, post, lockedIds), [pre, post, lockedIds]);

  return (
    <section aria-label="Post-lock readout" className="surface-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ion-white">Post-lock readout</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
            report.lockedKept ? "bg-verify/20 text-verify" : "bg-caution/20 text-caution"
          }`}
        >
          {report.lockedKept ? "locked kept" : "locked changed"}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Proj Δ", delta(report.projDelta), `${report.preProj.toFixed(1)} → ${report.postProj.toFixed(1)}`],
          ["Ceil Δ", delta(report.ceilDelta), `${report.preCeil.toFixed(1)} → ${report.postCeil.toFixed(1)}`],
          ["Salary Δ", delta(report.salaryDelta, 0), `$${report.preSalary} → $${report.postSalary}`],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-xl border border-mineral px-3 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">{label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums text-ion-white">{value}</dd>
            <dd className="text-[11px] tabular-nums text-ion-1">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Swapped out ({report.swappedOut.length})
          </h3>
          {report.swappedOut.length === 0 ? (
            <p className="text-sm text-ion-1">None — lineup unchanged.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm text-ion-1">
              {report.swappedOut.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Swapped in ({report.swappedIn.length})
          </h3>
          {report.swappedIn.length === 0 ? (
            <p className="text-sm text-ion-1">None — lineup unchanged.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm text-ion-1">
              {report.swappedIn.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
