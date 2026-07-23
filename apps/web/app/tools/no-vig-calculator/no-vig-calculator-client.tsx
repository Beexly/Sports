"use client";

import { useMemo, useState } from "react";
import {
  NO_VIG_METHOD_NOTE,
  noVigFairProbabilities,
  parseOddsInputToDecimal,
  vigPercentage,
  type OddsFormat,
} from "@/lib/tools/betting-math";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { OddsFormatToggle } from "@/components/tools/odds-format-toggle";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

const MAX_OUTCOMES = 4;
const MIN_OUTCOMES = 2;
const DEFAULT_OUTCOMES = ["-110", "-110"];

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

/**
 * No-Vig Calculator — tiny, pure-presentational client component. All math
 * comes from @/lib/tools/betting-math; this component only owns the list of
 * outcome inputs and formatting.
 */
export function NoVigCalculatorClient(): JSX.Element {
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>("american");
  const [outcomes, setOutcomes] = useState<string[]>(DEFAULT_OUTCOMES);

  const decimalOdds = useMemo(
    () => outcomes.map((raw) => parseOddsInputToDecimal(raw, oddsFormat)),
    [outcomes, oddsFormat],
  );

  const allValid = decimalOdds.every((d) => d !== null);
  const fairProbs = useMemo(
    () => (allValid ? noVigFairProbabilities(decimalOdds as number[]) : null),
    [allValid, decimalOdds],
  );
  const vig = useMemo(() => (allValid ? vigPercentage(decimalOdds as number[]) : null), [allValid, decimalOdds]);

  function updateOutcome(index: number, value: string): void {
    setOutcomes((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addOutcome(): void {
    setOutcomes((prev) => (prev.length >= MAX_OUTCOMES ? prev : [...prev, ""]));
  }

  function removeOutcome(index: number): void {
    setOutcomes((prev) => (prev.length <= MIN_OUTCOMES ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Market prices</span>
        <OddsFormatToggle format={oddsFormat} onChange={setOddsFormat} />
      </div>

      <div className="mt-4 space-y-3">
        {outcomes.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">{`Outcome ${index + 1} price`}</span>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => updateOutcome(index, e.target.value)}
                className={INPUT_CLASS}
                placeholder={oddsFormat === "american" ? "-110" : "1.91"}
                aria-label={`Outcome ${index + 1} price`}
              />
            </label>
            {outcomes.length > MIN_OUTCOMES ? (
              <button
                type="button"
                onClick={() => removeOutcome(index)}
                className="rounded-lg border border-mineral px-3 py-2 text-xs text-ion-1 transition-colors hover:border-mineral-hi hover:text-ion-white"
                aria-label={`Remove outcome ${index + 1}`}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {outcomes.length < MAX_OUTCOMES ? (
        <button type="button" onClick={addOutcome} className="btn-ghost mt-3 px-0">
          + Add another outcome (up to {MAX_OUTCOMES})
        </button>
      ) : null}

      <div className="mt-8 border-t border-mineral pt-6" aria-live="polite">
        {fairProbs && vig !== null ? (
          <>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Fair (no-vig) probabilities</p>
            <div data-testid="no-vig-result" className="mt-3 grid gap-2 sm:grid-cols-2">
              {fairProbs.map((p, i) => (
                <div key={i} className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">Outcome {i + 1}</span>
                  <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{fmtPct(p)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ion-1">
              Book hold on this market:{" "}
              <span className={`font-semibold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{vig.toFixed(2)}%</span>
            </p>

            <FormulaPlaque
              className="mt-5"
              formula={`fair_i = (1/odds_i) / Σ(1/odds_j)\nhold = (Σ(1/odds_j) − 1) × 100`}
            />
            <HonestyNote className="mt-4">{NO_VIG_METHOD_NOTE}</HonestyNote>
          </>
        ) : (
          <p className="text-sm text-ion-1">
            Enter a valid price for every outcome to see the fair, no-vig
            split. (The market&apos;s combined implied probability has to be
            over 100% — a real book always charges some vig; under 100% means
            the prices are crossed or stale.)
          </p>
        )}
      </div>
    </div>
  );
}
