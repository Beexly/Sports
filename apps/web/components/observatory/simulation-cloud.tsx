"use client";

import { useMemo, useState } from "react";
import { scoreDistribution } from "@/lib/sim/score-distribution";

/**
 * Simulation Cloud — "distribution, not fake certainty" (analyst dump).
 *
 * An ILLUSTRATIVE teaching tool: pick two expected scoring-event rates and
 * watch the full margin distribution appear. The point is felt, not told — an
 * outcome is
 * a cloud of possibilities, and a single "who wins %" hides how wide it is.
 * Transparent Poisson math, user-chosen inputs, no live game data, no pick
 * output (same posture as Parlay MRI). Fully keyboard-operable; the readouts
 * carry the meaning so nothing depends on the chart alone.
 */

// Expected scoring EVENTS (goals / scoring drives) — the domain where Poisson
// is the right model. Low counts, not raw football points.
const PRESETS: ReadonlyArray<{ label: string; home: number; away: number }> = [
  { label: "Coin flip", home: 2.4, away: 2.4 },
  { label: "Slight home edge", home: 2.8, away: 2.1 },
  { label: "Clear favourite", home: 3.4, away: 1.6 },
  { label: "Shootout", home: 3.8, away: 3.5 },
];

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function SimulationCloud() {
  const [home, setHome] = useState(2.8);
  const [away, setAway] = useState(2.1);

  const dist = useMemo(() => scoreDistribution(home, away), [home, away]);
  const maxP = Math.max(...dist.bars.map((b) => b.probability), 0.0001);
  // Show a readable window of margins around 0.
  const shown = dist.bars.filter((b) => b.margin >= -10 && b.margin <= 10);

  return (
    <section
      data-testid="simulation-cloud"
      className="overflow-hidden rounded-2xl border border-white/[0.10] bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="border-b border-white/[0.10] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400">
          Simulation cloud — the shape of an outcome
        </h2>
        <p className="mt-1 text-[11px] text-ink-400">
          A win probability is one number. The real outcome is a cloud. Set two
          expected scoring-event rates (goals / scoring drives) and watch the distribution of final margins.
          Illustrative — transparent Poisson math, not a game projection.
        </p>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
        {/* The cloud */}
        <div>
          <div
            className="flex h-40 items-end gap-px"
            role="img"
            aria-label={`Margin distribution. Home win ${pct(dist.homeWinProb)}, tie ${pct(
              dist.tieProb,
            )}, away win ${pct(dist.awayWinProb)}. Most likely margin ${dist.modalMargin}.`}
          >
            {shown.map((b) => {
              const inBand = b.margin >= dist.p80Low && b.margin <= dist.p80High;
              const tone =
                b.margin > 0 ? "bg-orbital-cyan" : b.margin < 0 ? "bg-plasma" : "bg-ion-white";
              return (
                <div
                  key={b.margin}
                  className={`flex-1 rounded-t-sm ${tone} ${inBand ? "opacity-100" : "opacity-40"}`}
                  style={{ height: `${Math.max(2, (b.probability / maxP) * 100)}%` }}
                  title={`Margin ${b.margin > 0 ? "+" : ""}${b.margin}: ${pct(b.probability)}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-numerals text-[10px] tabular-nums text-ink-500">
            <span>away +10</span>
            <span>pick&apos;em</span>
            <span>home +10</span>
          </div>
          <p className="mt-3 text-[11px] text-ink-400">
            Lit bars = the narrowest band holding 80% of outcomes (margin{" "}
            <span className="font-numerals tabular-nums text-ink-300">
              {dist.p80Low > 0 ? "+" : ""}
              {dist.p80Low}
            </span>{" "}
            to{" "}
            <span className="font-numerals tabular-nums text-ink-300">
              {dist.p80High > 0 ? "+" : ""}
              {dist.p80High}
            </span>
            ). Even a clear favourite lives inside a wide cloud.
          </p>
        </div>

        {/* Controls + readouts */}
        <div className="flex flex-col gap-4">
          <RateInput label="Home scoring events" value={home} onChange={setHome} />
          <RateInput label="Away scoring events" value={away} onChange={setAway} />

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={home === p.home && away === p.away}
                onClick={() => {
                  setHome(p.home);
                  setAway(p.away);
                }}
                className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 transition hover:border-white/[0.08]-hi hover:text-ink-300"
              >
                {p.label}
              </button>
            ))}
          </div>

          <dl className="grid grid-cols-3 gap-2 border-t border-white/[0.10] pt-4 text-center font-numerals tabular-nums">
            <Readout label="Home win" value={pct(dist.homeWinProb)} tone="text-orbital-cyan" />
            <Readout label="Tie" value={pct(dist.tieProb)} tone="text-ink-400" />
            <Readout label="Away win" value={pct(dist.awayWinProb)} tone="text-plasma" />
          </dl>
        </div>
      </div>

      <div className="border-t border-white/[0.10] px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ink-400">
          Illustrative model on transparent Poisson math. It teaches variance —
          it is not a pick, projection, or live game read.
        </p>
      </div>
    </section>
  );
}

function RateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-400">
      {label}
      <input
        type="number"
        min={0}
        max={8}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus-visible:border-orbital-cyan"
      />
    </label>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}
