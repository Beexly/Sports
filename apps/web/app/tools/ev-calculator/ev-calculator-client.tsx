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
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

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
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Your win probability</span>
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
            <span className="text-sm text-ion-1">%</span>
          </div>
        </label>

        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Price offered</span>
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

      <div className="mt-8 border-t border-mineral pt-6" aria-live="polite">
        {valid ? (
          <>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Expected value</p>
            <p
              data-testid="ev-result"
              className={`mt-2 text-4xl font-bold sm:text-5xl ${NUMERIC_TEXT_CLASS} ${ev! >= 0 ? "text-verify" : "text-alert"}`}
            >
              {fmtUsd(ev!)} <span className="font-sans text-base font-normal text-ion-1">per $1 staked</span>
            </p>
            <p className="mt-2 text-sm text-ion-1">
              <span className={NUMERIC_TEXT_CLASS}>{fmtUsd(ev! * 100)}</span> per $100 staked. Breakeven
              probability at this price is{" "}
              <span className={NUMERIC_TEXT_CLASS}>{breakeven !== null ? fmtPct(breakeven) : "—"}</span>.
            </p>

            <FormulaPlaque
              className="mt-5"
              formula={`EV = p × decimal − 1\nEV = ${probability.toFixed(4)} × ${decimalPrice!.toFixed(4)} − 1 = ${ev!.toFixed(4)}`}
            />
          </>
        ) : (
          <p className="text-sm text-ion-1">Enter a win probability (0-100) and a valid price to see the expected value.</p>
        )}
      </div>
    </div>
  );
}
