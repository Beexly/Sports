"use client";

import { useMemo, useState } from "react";
import {
  computeClvBpsTool,
  parseOddsInputToDecimal,
  type OddsFormat,
} from "@/lib/tools/betting-math";
import { OddsFormatToggle } from "@/components/tools/odds-format-toggle";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const INPUT_CLASS = `w-full rounded-lg border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion transition-colors placeholder:text-ion-3 hover:border-mineral-hi focus:border-orbital-cyan ${NUMERIC_TEXT_CLASS}`;

export function ClvCalculatorClient(): JSX.Element {
  const [format, setFormat] = useState<OddsFormat>("american");
  const [decision, setDecision] = useState("+100");
  const [close, setClose] = useState("-110");

  const bps = useMemo(() => {
    const d = parseOddsInputToDecimal(decision, format);
    const c = parseOddsInputToDecimal(close, format);
    if (d === null || c === null) return null;
    return computeClvBpsTool(d, c);
  }, [decision, close, format]);

  return (
    <div className="surface-card p-6 sm:p-8">
      <OddsFormatToggle format={format} onChange={setFormat} />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Your decision price
          </span>
          <input
            className={`${INPUT_CLASS} mt-2`}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            inputMode="decimal"
            aria-label="Decision price"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Closing price
          </span>
          <input
            className={`${INPUT_CLASS} mt-2`}
            value={close}
            onChange={(e) => setClose(e.target.value)}
            inputMode="decimal"
            aria-label="Closing price"
          />
        </label>
      </div>
      <div className="mt-8 border-t border-mineral pt-6">
        {bps === null ? (
          <p className="text-sm text-ion-2">Enter two valid prices to compute CLV bps.</p>
        ) : (
          <p className="font-mono text-2xl text-orbital-cyan">
            {bps >= 0 ? "+" : ""}
            {bps.toFixed(2)} bps
            <span className="mt-2 block text-sm text-ion-2">
              Positive means your decision price was better than the close (you
              beat the close on price). Not a win/loss claim.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
