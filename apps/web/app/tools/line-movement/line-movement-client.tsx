"use client";

import { useMemo, useState } from "react";
import { analyzeLineMovement } from "@/lib/tools/betting-math";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

export function LineMovementClient(): JSX.Element {
  const [openOdds, setOpenOdds] = useState("-110");
  const [closeOdds, setCloseOdds] = useState("-120");

  const result = useMemo(() => {
    const o = Number(openOdds.trim());
    const c = Number(closeOdds.trim());
    if (!Number.isFinite(o) || !Number.isFinite(c)) return null;
    return analyzeLineMovement({ openOdds: o, closeOdds: c, marketType: "moneyline" });
  }, [openOdds, closeOdds]);

  const ml = result?.moneyline;

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Open American odds
          </span>
          <input
            className={`${INPUT_CLASS} mt-2`}
            value={openOdds}
            onChange={(e) => setOpenOdds(e.target.value)}
            inputMode="decimal"
            aria-label="Open American odds"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Current / close American odds
          </span>
          <input
            className={`${INPUT_CLASS} mt-2`}
            value={closeOdds}
            onChange={(e) => setCloseOdds(e.target.value)}
            inputMode="decimal"
            aria-label="Close American odds"
          />
        </label>
      </div>
      <div className="mt-8 border-t border-mineral pt-6">
        {ml ? (
          <dl className="grid gap-3 sm:grid-cols-2 font-mono text-sm">
            <div>
              <dt className="text-ion-3">Open implied</dt>
              <dd className="text-ion-white">{(ml.openImpliedProb * 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt className="text-ion-3">Close implied</dt>
              <dd className="text-ion-white">{(ml.closeImpliedProb * 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt className="text-ion-3">Prob shift</dt>
              <dd className="text-orbital-cyan">
                {(ml.probShift * 100).toFixed(2)} pp · {ml.direction}
              </dd>
            </div>
            <div>
              <dt className="text-ion-3">Moved toward</dt>
              <dd className="text-ion-1">{ml.movedToward}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ion-2">Enter valid American odds (magnitude ≥ 100) on both sides.</p>
        )}
      </div>
    </div>
  );
}
