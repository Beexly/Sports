"use client";

/**
 * ProofExplorer — the interactive head of the Proof Room.
 *
 * Turns the top of the Proof Room from a link hub into a live, explorable
 * calibration panel built on the REAL public calibration report: count-ups for
 * the settled sample, Brier score, and discrimination spread, plus a confidence-
 * band scrubber that lets a reader walk the reliability curve bucket by bucket
 * and read observed-vs-expected for each band. Honest by construction: when the
 * settled sample is too small to back a number, it shows the building state
 * instead of inventing one. No fabricated stats.
 */

import { useState } from "react";
import { CalibrationCurve } from "@/components/home/calibration-curve";
import { CountUp } from "@/components/ui/count-up";

export interface ProofBucket {
  readonly label: string;
  readonly expectedWinRate: number;
  readonly observedWinRate: number;
  readonly sampleSize: number;
  readonly delta: number;
  /** True once the band clears the publish floor (30+ settled picks); below it,
   * its observed win rate is withheld (a 2-pick "100%" is not a claim we publish). */
  readonly sufficientSample: boolean;
}

export interface ProofExplorerProps {
  readonly buckets: readonly ProofBucket[];
  readonly sampleSize: number;
  readonly brierScore: number | null;
  readonly discriminationSpread: number | null;
  readonly discriminationTrend: string;
  readonly isCollecting: boolean;
  readonly publicMessage: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ProofExplorer({
  buckets,
  sampleSize,
  brierScore,
  discriminationSpread,
  discriminationTrend,
  isCollecting,
  publicMessage,
}: ProofExplorerProps): JSX.Element {
  const populated = buckets.filter((b) => b.sampleSize > 0);
  const [selected, setSelected] = useState<string | null>(populated[0]?.label ?? null);
  const active = buckets.find((b) => b.label === selected) ?? null;

  return (
    <section
      aria-label="Live calibration"
      className="relative overflow-hidden rounded-ds-lg border border-mineral bg-eclipse/40 p-5 sm:p-6"
      data-testid="proof-explorer"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-signal-fade" />
      <div className="flex items-center gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">Live calibration</p>
        <span aria-hidden className="h-px flex-1" style={{ backgroundImage: "var(--signal-fade)", opacity: 0.4 }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          {isCollecting ? "Building" : "Settled sample"}
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Reliability curve */}
        <div className="rounded-ds-md border border-mineral bg-carbon/50 p-4">
          <CalibrationCurve
            points={buckets.map((b) => ({
              label: b.label,
              expectedWinRate: b.expectedWinRate,
              observedWinRate: b.observedWinRate,
              sampleSize: b.sampleSize,
              sufficientSample: b.sufficientSample,
            }))}
            sampleSize={sampleSize}
          />
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
            predicted vs observed · the diagonal is perfect calibration
          </p>
        </div>

        {/* Count-ups + band scrubber */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-ds-md border border-mineral bg-mineral">
            <Stat label="Settled" value={<CountUp value={sampleSize} group className="tabular-nums" />} />
            <Stat
              label="Brier"
              value={brierScore === null ? "n/a" : <CountUp value={brierScore} decimals={3} className="tabular-nums" />}
            />
            <Stat
              label="Disc. spread"
              value={
                discriminationSpread === null ? (
                  "n/a"
                ) : (
                  <CountUp value={Math.round(discriminationSpread * 100)} suffix="%" className="tabular-nums" />
                )
              }
            />
          </div>
          <p className="text-xs leading-5 text-ion-1">{publicMessage}</p>

          {/* Band scrubber */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Scrub the confidence bands</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {buckets.map((b) => {
                const on = b.label === selected;
                const has = b.sampleSize > 0;
                return (
                  <button
                    key={b.label}
                    type="button"
                    disabled={!has}
                    aria-pressed={on}
                    onClick={() => setSelected(b.label)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tabular-nums transition-colors ${
                      on
                        ? "border-orbital-cyan/60 bg-orbital-cyan/[0.08] text-ion-white"
                        : has
                          ? "border-mineral text-ion-1 hover:border-orbital-cyan/40 hover:text-ion-white"
                          : "border-mineral/50 text-ion-3"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            <div role="status" aria-live="polite">
            {active && active.sufficientSample ? (
              <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-ds-md border border-mineral bg-mineral">
                <Stat label="Observed" value={pct(active.observedWinRate)} tone="text-orbital-cyan" />
                <Stat label="Expected" value={pct(active.expectedWinRate)} tone="text-ultraviolet" />
                <Stat
                  label="Delta"
                  value={`${active.delta >= 0 ? "+" : ""}${Math.round(active.delta * 100)}%`}
                  tone={active.delta >= 0 ? "text-verify" : "text-plasma"}
                />
              </div>
            ) : active && active.sampleSize > 0 ? (
              <p className="mt-3 rounded-ds-md border border-mineral bg-carbon/50 px-3 py-3 text-xs text-ion-2">
                {active.sampleSize}/30 settled in this band — building a publishable rate. We don&apos;t
                show a win rate until a band clears 30 settled picks.
              </p>
            ) : (
              <p className="mt-3 rounded-ds-md border border-mineral bg-carbon/50 px-3 py-3 text-xs text-ion-2">
                No settled picks in this band yet. Bands populate as the record grows.
              </p>
            )}
            {active && active.sampleSize > 0 && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-3">
                {active.sampleSize} settled in this band · trend {discriminationTrend}
              </p>
            )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone = "text-ion-white" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-obsidian px-3 py-3 text-center">
      <p className={`font-numerals text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">{label}</p>
    </div>
  );
}
