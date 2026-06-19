"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface TrajectoryPoint {
  bet: number;
  bankroll: number;
}

interface DrawdownSummary {
  meanMaxDrawdownPct: number;
  medianMaxDrawdownPct: number;
  p95MaxDrawdownPct: number;
}

interface BankrollOutput {
  bankroll: number;
  winProbability: number;
  winProbabilityDerived: boolean;
  americanOdds: number;
  decimalOdds: number;
  kellyMultiplier: number;
  numBets: number;
  fullKellyFraction: number;
  appliedKellyFraction: number;
  recommendedStake: number;
  edgePct: number;
  expectedLogGrowthPerBet: number;
  medianEndingBankroll: number;
  riskOfRuin: number;
  ruinThresholdPct: number;
  drawdownSummary: DrawdownSummary;
  trajectory: TrajectoryPoint[];
  disclaimer: string;
}

interface FormState {
  bankroll: string;
  winProbability: string;
  americanOdds: string;
  kellyMultiplier: string;
  numBets: string;
}

const INITIAL: FormState = {
  bankroll: "1000",
  winProbability: "0.55",
  americanOdds: "-110",
  kellyMultiplier: "0.5",
  numBets: "200",
};

function pct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

function signedPct(p: number, digits = 2): string {
  return `${p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
}

function americanLabel(m: number): string {
  return m > 0 ? `+${m}` : `${m}`;
}

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";

export function BankrollOptimizerTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<BankrollOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        bankroll: Number(form.bankroll),
        winProbability:
          form.winProbability.trim() === ""
            ? null
            : Number(form.winProbability),
        americanOdds: Number(form.americanOdds),
        kellyMultiplier: Number(form.kellyMultiplier),
        numBets: Number(form.numBets),
      };
      const res = await fetch("/api/lab/optimize-bankroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { success: boolean; data?: BankrollOutput; error?: string } =
        await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Optimization failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the optimizer. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const maxBar =
    result && result.trajectory.length > 0
      ? Math.max(...result.trajectory.map((t) => t.bankroll))
      : 0;
  const noEdge = result !== null && result.fullKellyFraction <= 0;

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Bankroll inputs
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["bankroll", "Bankroll (units/$)"],
                ["americanOdds", "Bet price (American)"],
                ["winProbability", "Win prob 0–1 (blank = no edge)"],
                ["kellyMultiplier", "Kelly mult (0–1)"],
                ["numBets", "Bets to simulate (≤5000)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className={FIELD_LABEL}>{label}</span>
                <input
                  className={INPUT_CLASS}
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className={cn(
              "mt-5 w-full rounded-md px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] transition-opacity disabled:opacity-50",
            )}
            style={{
              background: BRAND_COLORS.orbitalCyan,
              color: BRAND_COLORS.obsidianBlack,
            }}
          >
            {loading ? "Optimizing…" : "Optimize"}
          </button>
          {error ? (
            <p
              className="mt-3 font-mono text-[11px]"
              style={{ color: BRAND_COLORS.ionMagenta }}
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* ── Results ────────────────────────────────────────── */}
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Kelly sizing
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Recommended stake"
                  value={
                    noEdge
                      ? "0 (no edge)"
                      : `${result.recommendedStake.toLocaleString()}`
                  }
                  accent={
                    noEdge ? BRAND_COLORS.ionMagenta : BRAND_COLORS.orbitalCyan
                  }
                />
                <Stat
                  label="Edge"
                  value={signedPct(result.edgePct)}
                  accent={
                    result.edgePct >= 0
                      ? BRAND_COLORS.orbitalCyan
                      : BRAND_COLORS.ionMagenta
                  }
                />
                <Stat
                  label="Full Kelly"
                  value={pct(result.fullKellyFraction, 2)}
                />
                <Stat
                  label={`Applied (${result.kellyMultiplier}×)`}
                  value={pct(result.appliedKellyFraction, 2)}
                />
                <Stat
                  label="Exp. log-growth / bet"
                  value={result.expectedLogGrowthPerBet.toFixed(5)}
                />
                <Stat
                  label="Risk of ruin"
                  value={pct(result.riskOfRuin)}
                  accent={
                    result.riskOfRuin > 0.05
                      ? BRAND_COLORS.ionMagenta
                      : undefined
                  }
                />
                <Stat
                  label={`Median end (${result.numBets} bets)`}
                  value={`${result.medianEndingBankroll.toLocaleString()}`}
                />
                <Stat
                  label="Median max drawdown"
                  value={pct(result.drawdownSummary.medianMaxDrawdownPct)}
                />
              </div>

              {noEdge ? (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}40`,
                    background: `${BRAND_COLORS.ionMagenta}10`,
                  }}
                >
                  <p className={FIELD_LABEL}>No positive edge</p>
                  <p className="mt-1 font-numerals text-sm text-white">
                    At {pct(result.winProbability)} vs. a break-even of{" "}
                    {americanLabel(result.americanOdds)}, this is a non-positive
                    edge. Kelly recommends staking nothing — never bet a -EV
                    spot.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                    background: `${BRAND_COLORS.orbitalCyan}08`,
                  }}
                >
                  <p className={FIELD_LABEL}>Win prob vs. price</p>
                  <p className="mt-1 font-numerals text-sm text-white">
                    {result.winProbabilityDerived
                      ? "Using the zero-edge break-even probability"
                      : "Your win probability"}{" "}
                    {pct(result.winProbability)} at{" "}
                    {americanLabel(result.americanOdds)} (decimal{" "}
                    {result.decimalOdds.toFixed(2)}).
                  </p>
                </div>
              )}

              {/* Median bankroll trajectory bars */}
              <div>
                <p className={FIELD_LABEL}>
                  Median bankroll trajectory ({result.numBets} bets · ruin ≤{" "}
                  {pct(result.ruinThresholdPct, 0)} of start)
                </p>
                <div className="mt-2 flex h-24 items-end gap-px">
                  {result.trajectory.map((t) => (
                    <div
                      key={t.bet}
                      title={`Bet ${t.bet}: ${t.bankroll.toLocaleString()}`}
                      className="flex-1"
                      style={{
                        height: `${maxBar > 0 ? (t.bankroll / maxBar) * 100 : 0}%`,
                        background:
                          t.bankroll >= result.bankroll
                            ? BRAND_COLORS.orbitalCyan
                            : BRAND_COLORS.softUltraviolet,
                        minHeight: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              <p className="font-mono text-[10px] leading-relaxed text-ink-500">
                {result.disclaimer}
              </p>
            </div>
          ) : (
            <div
              className="mt-4 rounded-lg border px-4 py-8 text-center"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
                Enter a bankroll, price and edge, then optimize
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Every figure is a Monte Carlo result of your inputs — a bankroll
                model explorer, not a published pick. Gambling involves risk.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): JSX.Element {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <dt className={FIELD_LABEL}>{label}</dt>
      <dd
        className="mt-1 font-numerals text-lg font-semibold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </dd>
    </div>
  );
}
