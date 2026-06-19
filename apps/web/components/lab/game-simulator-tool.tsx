"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface MarginBucket {
  margin: number;
  probability: number;
}

interface SimOutput {
  homeName: string;
  awayName: string;
  iterations: number;
  homeWinProbability: number;
  awayWinProbability: number;
  tieProbability: number;
  avgHomeScore: number;
  avgAwayScore: number;
  avgTotalPoints: number;
  projectedMargin: number;
  homeFairMoneyline: number;
  awayFairMoneyline: number;
  coverProbability: number | null;
  overProbability: number | null;
  marketImpliedHomeWinProbability: number | null;
  edgeVsMarketPoints: number | null;
  marginHistogram: MarginBucket[];
  disclaimer: string;
}

interface FormState {
  homeName: string;
  awayName: string;
  homeOffense: string;
  homeDefense: string;
  awayOffense: string;
  awayDefense: string;
  homeFieldAdvantage: string;
  spread: string;
  total: string;
  iterations: string;
}

const INITIAL: FormState = {
  homeName: "Home",
  awayName: "Away",
  homeOffense: "24.5",
  homeDefense: "21.0",
  awayOffense: "22.0",
  awayDefense: "23.5",
  homeFieldAdvantage: "2.5",
  spread: "",
  total: "",
  iterations: "10000",
};

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function moneyline(m: number): string {
  return m > 0 ? `+${m}` : `${m}`;
}

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";

export function GameSimulatorTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<SimOutput | null>(null);
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
        homeName: form.homeName,
        awayName: form.awayName,
        homeOffense: Number(form.homeOffense),
        homeDefense: Number(form.homeDefense),
        awayOffense: Number(form.awayOffense),
        awayDefense: Number(form.awayDefense),
        homeFieldAdvantage: Number(form.homeFieldAdvantage),
        spread: form.spread.trim() === "" ? null : Number(form.spread),
        total: form.total.trim() === "" ? null : Number(form.total),
        iterations: Number(form.iterations),
      };
      const res = await fetch("/api/lab/simulate-game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { success: boolean; data?: SimOutput; error?: string } =
        await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Simulation failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the simulator. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const maxBucket =
    result && result.marginHistogram.length > 0
      ? Math.max(...result.marginHistogram.map((b) => b.probability))
      : 0;

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
            Matchup inputs
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={FIELD_LABEL}>Home name</span>
              <input
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                value={form.homeName}
                onChange={(e) => update("homeName", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Away name</span>
              <input
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                value={form.awayName}
                onChange={(e) => update("awayName", e.target.value)}
              />
            </label>
            {(
              [
                ["homeOffense", "Home off (pts/g)"],
                ["homeDefense", "Home def (pts allowed)"],
                ["awayOffense", "Away off (pts/g)"],
                ["awayDefense", "Away def (pts allowed)"],
                ["homeFieldAdvantage", "Home-field adv"],
                ["iterations", "Iterations (1k–50k)"],
                ["spread", "Home spread (optional)"],
                ["total", "Total O/U (optional)"],
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
            {loading ? "Simulating…" : "Run simulation"}
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
            Simulated outcome
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label={`${result.homeName} win`}
                  value={pct(result.homeWinProbability)}
                  accent={BRAND_COLORS.orbitalCyan}
                />
                <Stat
                  label={`${result.awayName} win`}
                  value={pct(result.awayWinProbability)}
                  accent={BRAND_COLORS.softUltravioletText}
                />
                <Stat
                  label="Proj. score"
                  value={`${result.avgHomeScore} – ${result.avgAwayScore}`}
                />
                <Stat
                  label="Proj. margin"
                  value={`${result.projectedMargin > 0 ? "+" : ""}${result.projectedMargin}`}
                />
                <Stat
                  label="Fair ML (home)"
                  value={moneyline(result.homeFairMoneyline)}
                />
                <Stat
                  label="Avg total"
                  value={`${result.avgTotalPoints}`}
                />
                {result.coverProbability !== null ? (
                  <Stat
                    label="Home covers"
                    value={pct(result.coverProbability)}
                  />
                ) : null}
                {result.overProbability !== null ? (
                  <Stat label="Over hits" value={pct(result.overProbability)} />
                ) : null}
              </div>

              {result.edgeVsMarketPoints !== null ? (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                    background: `${BRAND_COLORS.orbitalCyan}08`,
                  }}
                >
                  <p className={FIELD_LABEL}>Model vs. market</p>
                  <p className="mt-1 font-numerals text-sm text-white">
                    Sim home win {pct(result.homeWinProbability)} vs. line-implied{" "}
                    {result.marketImpliedHomeWinProbability !== null
                      ? pct(result.marketImpliedHomeWinProbability)
                      : "—"}{" "}
                    ·{" "}
                    <span
                      style={{
                        color:
                          result.edgeVsMarketPoints >= 0
                            ? BRAND_COLORS.orbitalCyan
                            : BRAND_COLORS.ionMagenta,
                      }}
                    >
                      {result.edgeVsMarketPoints >= 0 ? "+" : ""}
                      {result.edgeVsMarketPoints} pts
                    </span>
                  </p>
                </div>
              ) : null}

              {/* Margin distribution bars */}
              <div>
                <p className={FIELD_LABEL}>
                  Margin distribution ({result.iterations.toLocaleString()} sims)
                </p>
                <div className="mt-2 flex h-24 items-end gap-px">
                  {result.marginHistogram.map((b) => (
                    <div
                      key={b.margin}
                      title={`Margin ${b.margin}: ${pct(b.probability)}`}
                      className="flex-1"
                      style={{
                        height: `${maxBucket > 0 ? (b.probability / maxBucket) * 100 : 0}%`,
                        background:
                          b.margin > 0
                            ? BRAND_COLORS.orbitalCyan
                            : b.margin < 0
                              ? BRAND_COLORS.softUltraviolet
                              : "rgba(255,255,255,0.4)",
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
                Enter ratings and run a simulation
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Every figure is a Monte Carlo result of your inputs — a model
                explorer, not a published pick.
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
