"use client";

import { useMemo, useState } from "react";
import {
  combineParlayLegs,
  PARLAY_CORRELATION_CAVEAT,
  parseOddsInputToDecimal,
  type OddsFormat,
} from "@/lib/tools/betting-math";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { OddsFormatToggle } from "@/components/tools/odds-format-toggle";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

const MAX_LEGS = 8;
const MIN_LEGS = 2;
const DEFAULT_LEGS = ["-110", "-110"];

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

function fmtAmerican(a: number): string {
  return a > 0 ? `+${a}` : `${a}`;
}

/**
 * Parlay Calculator — tiny, pure-presentational client component. All math
 * comes from @/lib/tools/betting-math; this component only owns the list of
 * leg inputs and formatting.
 */
export function ParlayCalculatorClient(): JSX.Element {
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>("american");
  const [legs, setLegs] = useState<string[]>(DEFAULT_LEGS);

  const decimalLegs = useMemo(() => legs.map((raw) => parseOddsInputToDecimal(raw, oddsFormat)), [legs, oddsFormat]);
  const allValid = decimalLegs.every((d) => d !== null);
  const result = useMemo(() => (allValid ? combineParlayLegs(decimalLegs as number[]) : null), [allValid, decimalLegs]);

  function updateLeg(index: number, value: string): void {
    setLegs((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addLeg(): void {
    setLegs((prev) => (prev.length >= MAX_LEGS ? prev : [...prev, ""]));
  }

  function removeLeg(index: number): void {
    setLegs((prev) => (prev.length <= MIN_LEGS ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Parlay legs</span>
        <OddsFormatToggle format={oddsFormat} onChange={setOddsFormat} />
      </div>

      <div className="mt-4 space-y-3">
        {legs.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">{`Leg ${index + 1} price`}</span>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => updateLeg(index, e.target.value)}
                className={INPUT_CLASS}
                placeholder={oddsFormat === "american" ? "-110" : "1.91"}
                aria-label={`Leg ${index + 1} price`}
              />
            </label>
            {legs.length > MIN_LEGS ? (
              <button
                type="button"
                onClick={() => removeLeg(index)}
                className="rounded-lg border border-mineral px-3 py-2 text-xs text-ion-1 transition-colors hover:border-mineral-hi hover:text-ion-white"
                aria-label={`Remove leg ${index + 1}`}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {legs.length < MAX_LEGS ? (
        <button type="button" onClick={addLeg} className="btn-ghost mt-3 px-0">
          + Add another leg (up to {MAX_LEGS})
        </button>
      ) : null}

      <div className="mt-8 border-t border-mineral pt-6" aria-live="polite">
        {result ? (
          <>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Combined parlay price</p>
            <div data-testid="parlay-result" className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">Decimal</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{result.combinedDecimal.toFixed(3)}</p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">American</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>
                  {result.combinedAmerican !== null ? fmtAmerican(result.combinedAmerican) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">Implied probability</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{fmtPct(result.impliedProbability)}</p>
              </div>
            </div>

            <FormulaPlaque className="mt-5" formula={"combined = odds₁ × odds₂ × ... × oddsₙ\nimplied probability = 1 / combined"} />
            <HonestyNote className="mt-4">{PARLAY_CORRELATION_CAVEAT}</HonestyNote>
          </>
        ) : (
          <p className="text-sm text-ion-1">Enter a valid price for at least 2 legs to see the combined parlay price.</p>
        )}
      </div>
    </div>
  );
}
