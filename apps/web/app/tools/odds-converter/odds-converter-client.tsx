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
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-lg font-semibold text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

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
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">Enter a price</span>
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

      <div className="mt-8 border-t border-mineral pt-6" aria-live="polite">
        {decimal !== null && american !== null && impliedProbability !== null ? (
          <>
            <div data-testid="odds-converter-result" className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">American</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{fmtAmerican(american)}</p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">Decimal</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{decimal.toFixed(4)}</p>
              </div>
              <div className="rounded-lg border border-mineral bg-carbon/40 px-4 py-3">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ion-2">Implied probability</span>
                <p className={`mt-1 text-2xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}>{fmtPct(impliedProbability)}</p>
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
          <p className="text-sm text-ion-1">
            Enter a valid price — American odds need magnitude 100 or more
            (e.g. -110, +150); decimal odds need to be greater than 1 (e.g. 1.91).
          </p>
        )}
      </div>
    </div>
  );
}
