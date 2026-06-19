"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LeagueCode = "NFL" | "NBA" | "NCAAB" | "NHL";

interface RestAnalysis {
  daysSinceLastGame: number | null;
  isShortWeek: boolean;
  isLongRest: boolean;
  hasByeWeekPrior: boolean;
}

interface RestFrame {
  daysRest: number;
  backToBack: boolean;
  analysis: RestAnalysis;
  paceTier: "slow" | "moderate" | "fast" | "very-fast" | null;
}

interface PaceScheduleOutput {
  league: LeagueCode;
  homeName: string;
  awayName: string;
  home: RestFrame;
  away: RestFrame;
  restEdgeDays: number;
  expectedMarginShift: number;
  marginShiftInterval: [number, number];
  homeAdvantageProbability: number;
  leans: "home" | "away" | "neutral";
  notes: string[];
  disclaimer: string;
}

interface FormState {
  league: LeagueCode;
  homeName: string;
  awayName: string;
  homeDaysRest: string;
  awayDaysRest: string;
  homeBackToBack: boolean;
  awayBackToBack: boolean;
  homeTempo: string;
  awayTempo: string;
}

const INITIAL: FormState = {
  league: "NBA",
  homeName: "Home",
  awayName: "Away",
  homeDaysRest: "2",
  awayDaysRest: "1",
  homeBackToBack: false,
  awayBackToBack: true,
  homeTempo: "",
  awayTempo: "",
};

const LEAGUES: readonly LeagueCode[] = ["NFL", "NBA", "NCAAB", "NHL"];

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";

export function PaceScheduleTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<PaceScheduleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        league: form.league,
        homeName: form.homeName,
        awayName: form.awayName,
        homeDaysRest: Number(form.homeDaysRest),
        awayDaysRest: Number(form.awayDaysRest),
        homeBackToBack: form.homeBackToBack,
        awayBackToBack: form.awayBackToBack,
        homeTempo: form.homeTempo.trim() === "" ? null : Number(form.homeTempo),
        awayTempo: form.awayTempo.trim() === "" ? null : Number(form.awayTempo),
      };
      const res = await fetch("/api/lab/optimize-pace-schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: {
        success: boolean;
        data?: PaceScheduleOutput;
        error?: string;
      } = await res.json();
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

  const leanColor =
    result === null
      ? "#fff"
      : result.leans === "home"
        ? BRAND_COLORS.orbitalCyan
        : result.leans === "away"
          ? BRAND_COLORS.softUltravioletText
          : "rgba(255,255,255,0.7)";

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
            Schedule inputs
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className={FIELD_LABEL}>League</span>
              <select
                className={INPUT_CLASS}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                value={form.league}
                onChange={(e) =>
                  update("league", e.target.value as LeagueCode)
                }
              >
                {LEAGUES.map((l) => (
                  <option
                    key={l}
                    value={l}
                    style={{ color: BRAND_COLORS.obsidianBlack }}
                  >
                    {l}
                  </option>
                ))}
              </select>
            </label>
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
                ["homeDaysRest", "Home days rest"],
                ["awayDaysRest", "Away days rest"],
                ["homeTempo", "Home tempo (poss/g, opt.)"],
                ["awayTempo", "Away tempo (poss/g, opt.)"],
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.homeBackToBack}
                onChange={(e) => update("homeBackToBack", e.target.checked)}
              />
              <span className={FIELD_LABEL}>Home back-to-back</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.awayBackToBack}
                onChange={(e) => update("awayBackToBack", e.target.checked)}
              />
              <span className={FIELD_LABEL}>Away back-to-back</span>
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
            {loading ? "Computing…" : "Compute rest edge"}
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
            Rest &amp; pace frame
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Expected margin shift"
                  value={`${signed(result.expectedMarginShift)} pts`}
                  accent={leanColor}
                />
                <Stat
                  label="Schedule leans"
                  value={
                    result.leans === "home"
                      ? result.homeName
                      : result.leans === "away"
                        ? result.awayName
                        : "Neutral"
                  }
                  accent={leanColor}
                />
                <Stat
                  label="Home carries edge"
                  value={pct(result.homeAdvantageProbability)}
                />
                <Stat
                  label="Rest edge (days)"
                  value={signed(result.restEdgeDays)}
                />
                <Stat
                  label={`${result.homeName} rest`}
                  value={`${result.home.daysRest}d${result.home.backToBack ? " · B2B" : ""}`}
                />
                <Stat
                  label={`${result.awayName} rest`}
                  value={`${result.away.daysRest}d${result.away.backToBack ? " · B2B" : ""}`}
                />
              </div>

              <div
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  background: `${BRAND_COLORS.orbitalCyan}08`,
                }}
              >
                <p className={FIELD_LABEL}>80% confidence interval (margin shift)</p>
                <p className="mt-1 font-numerals text-sm text-white">
                  {signed(result.marginShiftInterval[0])} to{" "}
                  {signed(result.marginShiftInterval[1])} pts
                </p>
              </div>

              {result.notes.length > 0 ? (
                <ul className="space-y-1.5">
                  {result.notes.map((n, i) => (
                    <li
                      key={i}
                      className="font-mono text-[11px] leading-relaxed text-ink-300"
                    >
                      • {n}
                    </li>
                  ))}
                </ul>
              ) : null}

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
                Enter the rest situation and compute
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Every figure isolates the rest/pace signal of your inputs — a
                model explorer, not a published pick. No injury data included.
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
