"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface LegOutput {
  label: string;
  americanOdds: number;
  decimalOdds: number;
  impliedWinProbability: number;
  trueWinProbability: number;
}

interface RiskOfRuinOutput {
  numBets: number;
  perBetWinProbability: number;
  startingBankrollUnits: number;
  ruinProbability: number;
  expectedEndingBankrollUnits: number;
  trials: number;
}

interface ParlayOutput {
  legCount: number;
  legs: LegOutput[];
  payoutMultiplier: number;
  combinedAmericanOdds: number;
  independentWinProbability: number;
  correlatedWinProbability: number;
  stakeUnits: number;
  profitOnWin: number;
  totalReturnOnWin: number;
  expectedValueUnits: number;
  expectedValuePct: number;
  breakevenWinProbability: number;
  edgePoints: number;
  riskOfRuin: RiskOfRuinOutput;
  disclaimer: string;
}

interface LegForm {
  label: string;
  americanOdds: string;
  winProbability: string;
}

interface SettingsForm {
  stakeUnits: string;
  correlation: string;
  numBetsForRuin: string;
}

const INITIAL_LEGS: LegForm[] = [
  { label: "Leg 1", americanOdds: "-110", winProbability: "" },
  { label: "Leg 2", americanOdds: "-110", winProbability: "" },
];

const INITIAL_SETTINGS: SettingsForm = {
  stakeUnits: "1",
  correlation: "0",
  numBetsForRuin: "200",
};

const MAX_LEGS = 15;

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function moneyline(m: number): string {
  return m > 0 ? `+${m}` : `${m}`;
}

function units(n: number): string {
  return `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)}u`;
}

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";

export function ParlayAnalyzerTool(): JSX.Element {
  const [legs, setLegs] = useState<LegForm[]>(INITIAL_LEGS);
  const [settings, setSettings] = useState<SettingsForm>(INITIAL_SETTINGS);
  const [result, setResult] = useState<ParlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateLeg<K extends keyof LegForm>(
    index: number,
    key: K,
    value: string,
  ): void {
    setLegs((prev) =>
      prev.map((leg, i) => (i === index ? { ...leg, [key]: value } : leg)),
    );
  }

  function updateSetting<K extends keyof SettingsForm>(
    key: K,
    value: string,
  ): void {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function addLeg(): void {
    setLegs((prev) =>
      prev.length >= MAX_LEGS
        ? prev
        : [
            ...prev,
            {
              label: `Leg ${prev.length + 1}`,
              americanOdds: "-110",
              winProbability: "",
            },
          ],
    );
  }

  function removeLeg(index: number): void {
    setLegs((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        legs: legs.map((leg) => ({
          label: leg.label,
          americanOdds:
            leg.americanOdds.trim() === "" ? null : Number(leg.americanOdds),
          winProbability:
            leg.winProbability.trim() === ""
              ? null
              : Number(leg.winProbability),
        })),
        stakeUnits: Number(settings.stakeUnits),
        correlation: Number(settings.correlation),
        numBetsForRuin: Number(settings.numBetsForRuin),
      };
      const res = await fetch("/api/lab/analyze-parlay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { success: boolean; data?: ParlayOutput; error?: string } =
        await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Analysis failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the analyzer. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

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
            Parlay legs
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            Enter American odds and/or your own win-probability estimate
            (0–1) per leg. Probability, when given, drives the “true” math;
            odds alone fall back to the vigged implied price.
          </p>

          <div className="mt-4 space-y-3">
            {legs.map((leg, i) => (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={FIELD_LABEL}>Leg {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeLeg(i)}
                    disabled={legs.length <= 1}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 transition-opacity hover:text-white disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="col-span-3 block">
                    <span className={FIELD_LABEL}>Label</span>
                    <input
                      className={INPUT_CLASS}
                      style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      value={leg.label}
                      onChange={(e) => updateLeg(i, "label", e.target.value)}
                    />
                  </label>
                  <label className="col-span-2 block">
                    <span className={FIELD_LABEL}>American odds</span>
                    <input
                      className={INPUT_CLASS}
                      style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      inputMode="numeric"
                      placeholder="-110"
                      value={leg.americanOdds}
                      onChange={(e) =>
                        updateLeg(i, "americanOdds", e.target.value)
                      }
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL}>Win prob</span>
                    <input
                      className={INPUT_CLASS}
                      style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      inputMode="decimal"
                      placeholder="opt"
                      value={leg.winProbability}
                      onChange={(e) =>
                        updateLeg(i, "winProbability", e.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLeg}
            disabled={legs.length >= MAX_LEGS}
            className="mt-3 w-full rounded-md border px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-300 transition-opacity hover:text-white disabled:opacity-40"
            style={{ borderColor: "rgba(255,255,255,0.14)" }}
          >
            {legs.length >= MAX_LEGS ? "Max 15 legs" : "+ Add leg"}
          </button>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <label className="block">
              <span className={FIELD_LABEL}>Stake (units)</span>
              <input
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                inputMode="decimal"
                value={settings.stakeUnits}
                onChange={(e) => updateSetting("stakeUnits", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Correlation (-1..1)</span>
              <input
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                inputMode="decimal"
                value={settings.correlation}
                onChange={(e) => updateSetting("correlation", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Ruin bets</span>
              <input
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                inputMode="numeric"
                value={settings.numBetsForRuin}
                onChange={(e) =>
                  updateSetting("numBetsForRuin", e.target.value)
                }
              />
            </label>
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
            {loading ? "Analyzing…" : "Analyze parlay"}
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
            Stress test
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Combined win prob"
                  value={pct(result.correlatedWinProbability)}
                  accent={BRAND_COLORS.orbitalCyan}
                />
                <Stat
                  label="Independent prob"
                  value={pct(result.independentWinProbability)}
                />
                <Stat
                  label="Payout"
                  value={`${result.payoutMultiplier}×`}
                />
                <Stat
                  label="Combined odds"
                  value={moneyline(result.combinedAmericanOdds)}
                />
                <Stat
                  label="Profit on win"
                  value={units(result.profitOnWin)}
                  accent={BRAND_COLORS.orbitalCyan}
                />
                <Stat
                  label="Breakeven win-rate"
                  value={pct(result.breakevenWinProbability)}
                />
                <Stat
                  label="Expected value"
                  value={`${units(result.expectedValueUnits)} (${result.expectedValuePct >= 0 ? "+" : ""}${result.expectedValuePct}%)`}
                  accent={
                    result.expectedValueUnits >= 0
                      ? BRAND_COLORS.orbitalCyan
                      : BRAND_COLORS.ionMagenta
                  }
                />
                <Stat
                  label="Edge vs breakeven"
                  value={`${result.edgePoints >= 0 ? "+" : ""}${result.edgePoints} pts`}
                  accent={
                    result.edgePoints >= 0
                      ? BRAND_COLORS.orbitalCyan
                      : BRAND_COLORS.ionMagenta
                  }
                />
              </div>

              {/* Risk of ruin */}
              <div
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: `${BRAND_COLORS.ionMagenta}30`,
                  background: `${BRAND_COLORS.ionMagenta}08`,
                }}
              >
                <p className={FIELD_LABEL}>
                  Risk of ruin ({result.riskOfRuin.numBets} flat bets ·{" "}
                  {result.riskOfRuin.trials} sims)
                </p>
                <p className="mt-1 font-numerals text-sm text-white">
                  <span
                    style={{ color: BRAND_COLORS.ionMagenta }}
                    className="font-semibold"
                  >
                    {pct(result.riskOfRuin.ruinProbability)}
                  </span>{" "}
                  chance the{" "}
                  {result.riskOfRuin.startingBankrollUnits}u bankroll busts ·
                  avg ending{" "}
                  {result.riskOfRuin.expectedEndingBankrollUnits}u
                </p>
              </div>

              {/* Per-leg breakdown */}
              <div>
                <p className={FIELD_LABEL}>Per-leg breakdown</p>
                <div className="mt-2 space-y-1.5">
                  {result.legs.map((leg, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border px-2.5 py-1.5"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span className="font-mono text-[11px] text-ink-300">
                        {leg.label}
                      </span>
                      <span className="font-numerals text-[11px] tabular-nums text-ink-400">
                        {moneyline(leg.americanOdds)} · implied{" "}
                        {pct(leg.impliedWinProbability)} · true{" "}
                        <span className="text-white">
                          {pct(leg.trueWinProbability)}
                        </span>
                      </span>
                    </div>
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
                Add legs and analyze your parlay
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Every figure models your own legs, odds, and correlation
                assumption — a stress-test tool, not a published pick.
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
