"use client";

/**
 * CostOfNoiseCalculator — interactive decision-quality education.
 *
 * The user describes their weekly habits; the calculator reflects back a
 * directional read: how much of their decision flow is exposed to avoidable
 * noise, how strong their no-bet discipline is, and which Galaxy modules
 * tighten the weakest habit. Everything is computed client-side from the
 * stated heuristics below.
 *
 * HONESTY CONTRACT: outputs are framed as decision-quality education — share
 * of decisions exposed to noise and stake riding on them. Never a profit,
 * win-rate, or loss projection. No habit is shamed; every output points at a
 * concrete workflow. Native inputs only — fully keyboard operable.
 */

import { useMemo, useState } from "react";
import Link from "next/link";

type Tri = 0 | 1 | 2;

const TRI_OPTIONS: Record<
  "parlay" | "shopping" | "narrative" | "noBet",
  { legend: string; labels: [string, string, string] }
> = {
  parlay: { legend: "How often do you play parlays?", labels: ["Rarely", "Some weeks", "Most weeks"] },
  shopping: { legend: "Do you compare prices across books before betting?", labels: ["Always", "Sometimes", "Never"] },
  narrative: { legend: "How often does a hot take or thread start your bet?", labels: ["Rarely", "Sometimes", "Often"] },
  noBet: { legend: "Can you pass on a slate that offers nothing?", labels: ["Comfortably", "It's hard", "Never pass"] },
};

/** Each habit contributes 0 / 0.15 / 0.30 to the avoidable-noise share. */
const WEIGHT: readonly number[] = [0, 0.15, 0.3];

export function CostOfNoiseCalculator(): JSX.Element {
  const [betsPerWeek, setBetsPerWeek] = useState(7);
  const [unitSize, setUnitSize] = useState(25);
  const [parlay, setParlay] = useState<Tri>(1);
  const [shopping, setShopping] = useState<Tri>(1);
  const [narrative, setNarrative] = useState<Tri>(1);
  const [noBet, setNoBet] = useState<Tri>(1);

  const result = useMemo(() => {
    const habitNoise = WEIGHT[parlay]! + WEIGHT[shopping]! + WEIGHT[narrative]! + WEIGHT[noBet]!;
    const volumeNoise = betsPerWeek > 14 ? 0.08 : betsPerWeek > 7 ? 0.04 : 0;
    // Baseline 6%: no process is perfectly clean. Cap below certainty.
    const leakage = Math.min(0.85, 0.06 + habitNoise + volumeNoise);
    const weeklyTurnover = betsPerWeek * unitSize;
    const exposedStake = Math.round(weeklyTurnover * leakage);

    const discipline = Math.max(
      0,
      Math.min(100, 88 - WEIGHT[noBet]! * 160 - WEIGHT[narrative]! * 60 - (betsPerWeek > 14 ? 10 : 0))
    );

    const band =
      leakage < 0.28
        ? { label: "Measured", tone: "text-orbital-cyan", ring: "gw-ring-signal" }
        : leakage < 0.55
          ? { label: "Elevated", tone: "text-caution", ring: "gw-ring-caution" }
          : { label: "High exposure", tone: "text-alert", ring: "gw-ring-gate" };

    const workflow: { label: string; href: string; why: string }[] = [];
    if (parlay > 0)
      workflow.push({ label: "Parlay MRI", href: "/parlay-mri", why: "scan slips for correlation and stacked fragility before money moves" });
    if (narrative > 0)
      workflow.push({ label: "Airwave Ledger", href: "/airwave", why: "check what a take's author has actually been right about" });
    if (shopping > 0)
      workflow.push({ label: "Today's Board", href: "/board", why: "see line movement and price context before accepting a number" });
    if (noBet > 0)
      workflow.push({ label: "The Academy", href: "/academy", why: "train the pass — get graded on restraint, not action" });
    workflow.push({ label: "Calibration Report", href: "/performance", why: "judge any process, ours included, by its public receipts" });

    return { leakage, exposedStake, discipline, band, workflow, weeklyTurnover };
  }, [betsPerWeek, unitSize, parlay, shopping, narrative, noBet]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── inputs ────────────────────────────────────────────── */}
      <form className="rounded-ds-lg border border-white/[0.08] bg-white/[0.04] p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Bets per week</span>
            <span className="mt-1 block font-numerals text-2xl tabular-nums text-white">{betsPerWeek}</span>
            <input
              type="range"
              min={0}
              max={28}
              value={betsPerWeek}
              onChange={(e) => setBetsPerWeek(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--orbital-cyan)]"
              aria-label="Bets per week"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Average unit size</span>
            <span className="mt-1 block font-numerals text-2xl tabular-nums text-white">${unitSize}</span>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={unitSize}
              onChange={(e) => setUnitSize(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--orbital-cyan)]"
              aria-label="Average unit size in dollars"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {(
            [
              ["parlay", parlay, setParlay],
              ["shopping", shopping, setShopping],
              ["narrative", narrative, setNarrative],
              ["noBet", noBet, setNoBet],
            ] as const
          ).map(([key, value, setValue]) => {
            const opt = TRI_OPTIONS[key];
            return (
              <fieldset key={key}>
                <legend className="text-sm font-medium text-ion">{opt.legend}</legend>
                <div className="mt-2 flex gap-2" role="radiogroup">
                  {opt.labels.map((label, i) => (
                    <label
                      key={label}
                      className={`flex-1 cursor-pointer rounded-ds-sm border px-2 py-2 text-center text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orbital-cyan/80 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-eclipse ${
                        value === i
                          ? "border-orbital-cyan/60 bg-white/[0.03] text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-ink-300 hover:border-white/[0.08]-hi"
                      }`}
                    >
                      <input
                        type="radio"
                        name={key}
                        checked={value === i}
                        onChange={() => setValue(i as Tri)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      </form>

      {/* ── readout ───────────────────────────────────────────── */}
      <div className="flex flex-col rounded-ds-lg border border-white/[0.08] bg-void p-5 sm:p-6" aria-live="polite">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Decision risk band</p>
            <p className={`mt-1 font-display text-3xl font-semibold ${result.band.tone}`}>{result.band.label}</p>
          </div>
          <span aria-hidden className={`mt-1 h-3.5 w-3.5 rounded-full bg-white/[0.03] ${result.band.ring}`} />
        </div>

        <dl className="mt-6 space-y-4">
          <div>
            <dt className="flex justify-between text-sm text-ink-300">
              <span>Decisions exposed to avoidable noise</span>
              <span className="font-numerals tabular-nums text-white">~{Math.round(result.leakage * 100)}%</span>
            </dt>
            <dd className="mt-2 h-1.5 overflow-hidden rounded-full bg-mineral/50">
              <div
                className="gw-mirage-layer h-full rounded-full bg-gradient-to-r from-orbital-cyan via-caution to-alert"
                style={{ width: `${Math.round(result.leakage * 100)}%` }}
              />
            </dd>
          </div>
          <div>
            <dt className="flex justify-between text-sm text-ink-300">
              <span>No-bet discipline score</span>
              <span className="font-numerals tabular-nums text-white">{result.discipline}/100</span>
            </dt>
            <dd className="mt-2 h-1.5 overflow-hidden rounded-full bg-mineral/50">
              <div
                className="gw-mirage-layer h-full rounded-full bg-orbital-cyan"
                style={{ width: `${result.discipline}%` }}
              />
            </dd>
          </div>
          <div className="gw-receipt !border-white/[0.08]">
            <dt className="text-ink-400">Stake riding on noisy decisions</dt>
            <dd className="text-white">≈ ${result.exposedStake}/week of ${result.weeklyTurnover}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
            Suggested Galaxy workflow
          </p>
          <ul className="mt-2 space-y-2">
            {result.workflow.slice(0, 4).map((step) => (
              <li key={step.href} className="text-sm leading-6 text-ink-300">
                <Link href={step.href} className="font-semibold text-white underline-offset-4 hover:text-orbital-cyan hover:underline">
                  {step.label}
                </Link>{" "}
                — {step.why}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-auto pt-6 text-xs leading-5 text-ink-400">
          Directional education from your stated habits — not a financial
          projection, not a profit estimate, and not advice to bet more. The
          cheapest improvement in any process is a better pass.
        </p>
      </div>
    </div>
  );
}
