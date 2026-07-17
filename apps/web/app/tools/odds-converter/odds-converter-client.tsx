"use client";

import { useMemo, useState } from "react";
import {
  decimalToAmerican,
  decimalToImpliedProbability,
  parseOddsInputToDecimal,
  type OddsFormat,
} from "@/lib/tools/betting-math";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { OddsFormatToggle } from "@/components/tools/odds-format-toggle";

const INPUT_CLASS =
  "w-full rounded-lg border border-mineral bg-carbon/60 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-orbital-cyan";

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

function fmtAmerican(a: number): string {
  return a > 0 ? `+${a}` : `${a}`;
}

/**
 * Odds Converter — tiny, pure-presentational client component. All math
 * comes from @/lib/tools/betting-math; this component only owns the single
 * input field's state and formatting.
 */
export function OddsConverterClient(): JSX.Element {
  const [format, setFormat] = useState<OddsFormat>("american");
  const [raw, setRaw] = useState("-110");

  const decimal = useMemo(() => parseOddsInputToDecimal(raw, format), [raw, format]);
  const american = useMemo(() => (decimal === null ? null : decimalToAmerican(decimal)), [decimal]);
  const impliedProbability = useMemo(() => (decimal === null ? null : decimalToImpliedProbability(decimal)), [decimal]);

  function handleFormatChange(next: OddsFormat): void {
    // Carry the current value across formats, converted, rather than resetting the field.
    if (decimal !== null) {
      setRaw(next === "american" ? String(decimalToAmerican(decimal) ?? "") : decimal.toFixed(4));
    }
    setFormat(next);
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-ion-1">Enter a price</span>
        <OddsFormatToggle format={format} onChange={handleFormatChange} />
      </div>

      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className={`${INPUT_CLASS} mt-3`}
        aria-label={`Price, ${format} format`}
        placeholder={format === "american" ? "-110" : "1.91"}
      />

      <div className="mt-8 border-t border-mineral pt-6">
        {decimal !== null && american !== null && impliedProbability !== null ? (
          <>
            <div data-testid="odds-converter-result" className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="text-xs text-ink-300">American</span>
                <p className="font-display text-2xl text-white">{fmtAmerican(american)}</p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="text-xs text-ink-300">Decimal</span>
                <p className="font-display text-2xl text-white">{decimal.toFixed(4)}</p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="text-xs text-ink-300">Implied probability</span>
                <p className="font-display text-2xl text-white">{fmtPct(impliedProbability)}</p>
              </div>
            </div>

            <FormulaPlaque
              className="mt-5"
              formula={
                "decimal = 1 + A/100  (A > 0)\ndecimal = 1 + 100/|A|  (A < 0)\nimplied probability = 1 / decimal"
              }
            />
          </>
        ) : (
          <p className="text-sm text-ink-300">
            Enter a valid price — American odds need magnitude 100 or more
            (e.g. -110, +150); decimal odds need to be greater than 1 (e.g. 1.91).
          </p>
        )}
      </div>
    </div>
  );
}
