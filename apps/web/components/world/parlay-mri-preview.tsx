"use client";

/**
 * ParlayMriPreview — stacked risk made visible.
 *
 * Four generic legs, each "feels safe" alone. Toggling the scan reveals what
 * the slip hides: survival probability compounding down and correlation
 * binding legs into one shared failure. The math shown is plain multiplication
 * on stated illustrative probabilities — education, not an odds claim.
 *
 * Keyboard-first (one toggle button), reduced-motion safe (width transition
 * collapses to instant via the global guard).
 */

import { useState } from "react";
import Link from "next/link";

const LEGS = [
  { id: "A", label: "Leg A: a favorite to win", p: 0.72, correlated: false },
  { id: "B", label: "Leg B: same game, its star scores", p: 0.6, correlated: true },
  { id: "C", label: "Leg C: same game, the total goes over", p: 0.55, correlated: true },
  { id: "D", label: "Leg D: a late-night underdog prop", p: 0.5, correlated: false },
] as const;

const SURVIVAL = LEGS.reduce((acc, leg) => acc * leg.p, 1);

export function ParlayMriPreview(): JSX.Element {
  const [scanned, setScanned] = useState(false);

  let running = 1;
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-ds-lg border border-mineral bg-eclipse p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">
            Illustrative four-leg slip · stated probabilities, plain math
          </p>
          <button
            type="button"
            onClick={() => setScanned((s) => !s)}
            aria-pressed={scanned}
            className="btn-secondary min-h-11"
          >
            {scanned ? "Hide the scan" : "Run the MRI"}
          </button>
        </div>

        <ul className="mt-5 space-y-3">
          {LEGS.map((leg) => {
            running *= leg.p;
            const pct = Math.round(running * 100);
            const bound = scanned && leg.correlated;
            return (
              <li
                key={leg.id}
                className={`rounded-ds-md border p-4 ${bound ? "border-plasma/50" : "border-mineral"} bg-carbon`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-ion-white">{leg.label}</p>
                  <p className="font-numerals text-sm tabular-nums text-ion-1">
                    ~{Math.round(leg.p * 100)}% alone
                  </p>
                </div>
                {scanned ? (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mineral/50">
                      <div
                        className="gw-mirage-layer h-full rounded-full bg-orbital-cyan"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
                      <span className={bound ? "text-plasma" : "text-ion-2"}>
                        {bound ? "correlated · shares failure with its game" : "independent leg"}
                      </span>
                      <span className="text-ion-1">slip survival ≈ {pct}%</span>
                    </p>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>

        {scanned ? (
          <div className="mt-5 border-t border-mineral pt-4">
            <p className="text-sm leading-6 text-ion">
              Four legs that each feel safe compound to{" "}
              <span className="font-numerals font-semibold text-ion-white">
                ≈{Math.round(SURVIVAL * 100)}%
              </span>{" "}
              survival before correlation. Legs B and C live in the same game:
              one bad quarter can break both at once. The slip is more fragile
              than any leg admits.
            </p>
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-ion-1">
            Each leg looks comfortable on its own. Run the scan to see what the
            slip looks like from the inside.
          </p>
        )}
      </div>

      <div>
        <p className="font-display text-2xl font-semibold leading-snug text-ion-white sm:text-3xl">
          A parlay is one decision wearing four jerseys.
        </p>
        <p className="mt-4 max-w-md text-sm leading-7 text-ion-1">
          Correlation, leg dependency, and stacked volatility hide inside the
          slip where the payout number can&apos;t show them. The Parlay MRI
          makes the hidden structure visible before money does.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ion">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-plasma" />
            Correlation clusters: legs that fail together
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-caution" />
            Volatility stack: variance multiplies, it never averages
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-orbital-cyan" />
            Survival curve: the honest number under the payout
          </li>
        </ul>
        <Link
          href="/parlay-mri"
          className="mt-6 inline-block text-sm font-semibold text-orbital-cyan hover:text-ion-white"
        >
          Put a full slip through the MRI ▸
        </Link>
      </div>
    </div>
  );
}
