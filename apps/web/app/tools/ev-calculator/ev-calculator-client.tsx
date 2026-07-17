"use client";

import { useMemo, useState } from "react";
import {
  decimalToImpliedProbability,
  expectedValuePerDollar,
  parseOddsInputToDecimal,
  type OddsFormat,
} from "@/lib/tools/betting-math";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { OddsFormatToggle } from "@/components/tools/odds-format-toggle";

const INPUT_CLASS =
  "w-full rounded-lg border border-mineral bg-carbon/60 px-3 py-2 text-sm text-white outline-none focus:border-orbital-cyan";

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(n).toFixed(3)}`;
}

/**
 * EV Calculator — tiny, pure-presentational client component. All math
 * comes from @/lib/tools/betting-math; this component only owns form state
 * and formatting.
 */
export function EvCalculatorClient(): JSX.Element {
  const [probabilityInput, setProbabilityInput] = useState("55");
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>("american");
  const [oddsInput, setOddsInput] = useState("-110");

  const probability = useMemo(() => {
    const n = Number(probabilityInput.trim());
    return Number.isFinite(n) ? n / 100 : NaN;
  }, [probabilityInput]);

  const decimalPrice = useMemo(() => parseOddsInputToDecimal(oddsInput, oddsFormat), [oddsInput, oddsFormat]);

  const ev = useMemo(() => {
    if (!Number.isFinite(probability)) return null;
    return expectedValuePerDollar(probability, decimalPrice ?? NaN);
  }, [probability, decimalPrice]);

  const breakeven = useMemo(() => (decimalPrice === null ? null : decimalToImpliedProbability(decimalPrice)), [decimalPrice]);

  const valid = ev !== null;

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-ion-1">Your win probability</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={probabilityInput}
              onChange={(e) => setProbabilityInput(e.target.value)}
              className={INPUT_CLASS}
              aria-label="Your win probability, in percent"
              min={0}
              max={100}
              step="0.1"
            />
            <span className="text-sm text-ink-300">%</span>
          </div>
        </label>

        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-ion-1">Price offered</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={oddsInput}
              onChange={(e) => setOddsInput(e.target.value)}
              className={INPUT_CLASS}
              aria-label={`Price offered, ${oddsFormat} format`}
              placeholder={oddsFormat === "american" ? "-110" : "1.91"}
            />
            <OddsFormatToggle format={oddsFormat} onChange={setOddsFormat} />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-mineral pt-6">
        {valid ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-ion-1">Expected value</p>
            <p
              data-testid="ev-result"
              className="mt-2 font-display text-3xl sm:text-4xl"
              style={{ color: ev! >= 0 ? "#00E5FF" : "#FF38C7" }}
            >
              {fmtUsd(ev!)} <span className="text-base font-normal text-ink-300">per $1 staked</span>
            </p>
            <p className="mt-1 text-sm text-ink-300">
              {fmtUsd(ev! * 100)} per $100 staked. Breakeven probability at this price is{" "}
              {breakeven !== null ? fmtPct(breakeven) : "—"}.
            </p>

            <FormulaPlaque
              className="mt-5"
              formula={`EV = p × decimal − 1\nEV = ${probability.toFixed(4)} × ${decimalPrice!.toFixed(4)} − 1 = ${ev!.toFixed(4)}`}
            />
          </>
        ) : (
          <p className="text-sm text-ink-300">Enter a win probability (0-100) and a valid price to see the expected value.</p>
        )}
      </div>
    </div>
  );
}
