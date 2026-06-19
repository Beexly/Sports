"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

// ── Result types (mirror the engine's WeatherImpactOutput shape) ───────────────

type WeatherSport = "nfl" | "ncaaf" | "mlb";
type StadiumType = "outdoor" | "dome" | "retractable";
type ImpactLevel = "none" | "low" | "moderate" | "high" | "severe";
type WindDirection =
  | "left-to-right"
  | "right-to-left"
  | "in"
  | "out"
  | "crosswind";

interface WeatherComponent {
  level: ImpactLevel;
  score: number;
  description: string;
}

interface FootballDetail {
  passingImpactScore: number;
  severity: "none" | "minimal" | "moderate" | "significant" | "severe";
  passingImpact: number;
  rushingImpact: number;
  kickingImpact: number;
  scoringImpactPct: number;
  beaufort: { force: number; description: string };
  notes: string[];
}

interface BaseballDetail {
  windDirection: WindDirection;
  headwindMph: number;
  crosswindMph: number;
  windEdge: "over" | "under" | "neutral";
  hrBoostPct: number;
  runBoostPct: number;
  beaufort: { force: number; description: string };
}

interface WeatherImpactOutput {
  sport: WeatherSport;
  stadiumType: StadiumType;
  indoor: boolean;
  level: ImpactLevel;
  score: number;
  favorsBetting: "under" | "over" | "neither";
  highImpact: boolean;
  wind: WeatherComponent;
  temperature: WeatherComponent;
  precipitation: WeatherComponent;
  effectiveTempF: number;
  apparentTempF: number;
  dewPointF: number;
  footing: {
    fieldConditions: "normal" | "poor" | "very_poor";
    multiplier: number;
  };
  precipSeverity: "none" | "light" | "moderate" | "heavy";
  total: { baseline: number; adjusted: number; delta: number };
  summaryLine: string;
  factorNotes: string[];
  football: FootballDetail | null;
  baseball: BaseballDetail | null;
  disclaimer: string;
}

// ── Form state ──────────────────────────────────────────────────────────────

interface FormState {
  sport: WeatherSport;
  tempF: string;
  windSpeedMph: string;
  windDirectionDeg: string;
  precipitationInch: string;
  snowInch: string;
  humidity: string;
  stadiumType: StadiumType;
  ballparkOrientationDeg: string;
}

const SPORTS: readonly { value: WeatherSport; label: string }[] = [
  { value: "nfl", label: "NFL" },
  { value: "ncaaf", label: "NCAAF" },
  { value: "mlb", label: "MLB" },
];

const STADIUMS: readonly { value: StadiumType; label: string }[] = [
  { value: "outdoor", label: "Outdoor" },
  { value: "dome", label: "Dome (closed)" },
  { value: "retractable", label: "Retractable (closed)" },
];

/** Sport-appropriate defaults so the form is informative on first paint. */
const SPORT_DEFAULTS: Record<WeatherSport, FormState> = {
  nfl: {
    sport: "nfl",
    tempF: "28",
    windSpeedMph: "22",
    windDirectionDeg: "270",
    precipitationInch: "0",
    snowInch: "0",
    humidity: "60",
    stadiumType: "outdoor",
    ballparkOrientationDeg: "0",
  },
  ncaaf: {
    sport: "ncaaf",
    tempF: "45",
    windSpeedMph: "12",
    windDirectionDeg: "180",
    precipitationInch: "0.1",
    snowInch: "0",
    humidity: "70",
    stadiumType: "outdoor",
    ballparkOrientationDeg: "0",
  },
  mlb: {
    sport: "mlb",
    tempF: "78",
    windSpeedMph: "16",
    windDirectionDeg: "0",
    precipitationInch: "0",
    snowInch: "0",
    humidity: "55",
    stadiumType: "outdoor",
    ballparkOrientationDeg: "180",
  },
};

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";
const BORDER_STYLE = { borderColor: "rgba(255,255,255,0.12)" };

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const LEVEL_COLOR: Record<ImpactLevel, string> = {
  none: "rgba(255,255,255,0.7)",
  low: BRAND_COLORS.orbitalCyan,
  moderate: BRAND_COLORS.softUltravioletText,
  high: BRAND_COLORS.ionMagenta,
  severe: BRAND_COLORS.ionMagenta,
};

export function WeatherImpactTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(SPORT_DEFAULTS.nfl);
  const [result, setResult] = useState<WeatherImpactOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFootball = form.sport === "nfl" || form.sport === "ncaaf";
  const isBaseball = form.sport === "mlb";
  const indoorChosen = form.stadiumType !== "outdoor";

  function setSport(sport: WeatherSport): void {
    setForm(SPORT_DEFAULTS[sport]);
    setResult(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        sport: form.sport,
        tempF: Number(form.tempF),
        windSpeedMph: Number(form.windSpeedMph),
        windDirectionDeg: Number(form.windDirectionDeg),
        precipitationInch: Number(form.precipitationInch),
        snowInch: Number(form.snowInch),
        humidity: Number(form.humidity),
        stadiumType: form.stadiumType,
        ballparkOrientationDeg: Number(form.ballparkOrientationDeg),
      };
      const res = await fetch("/api/lab/weather-impact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: {
        success: boolean;
        data?: WeatherImpactOutput;
        error?: string;
      } = await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Modeling failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the weather model. Try again.");
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
            Game conditions
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={FIELD_LABEL}>Sport</span>
              <select
                className={INPUT_CLASS}
                style={BORDER_STYLE}
                value={form.sport}
                onChange={(e) => setSport(e.target.value as WeatherSport)}
              >
                {SPORTS.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    style={{ color: BRAND_COLORS.obsidianBlack }}
                  >
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={FIELD_LABEL}>Stadium</span>
              <select
                className={INPUT_CLASS}
                style={BORDER_STYLE}
                value={form.stadiumType}
                onChange={(e) => {
                  update("stadiumType", e.target.value as StadiumType);
                  setResult(null);
                }}
              >
                {STADIUMS.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    style={{ color: BRAND_COLORS.obsidianBlack }}
                  >
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <NumberField
              label="Temperature (°F)"
              value={form.tempF}
              onChange={(v) => update("tempF", v)}
            />
            <NumberField
              label="Humidity (0–100)"
              value={form.humidity}
              onChange={(v) => update("humidity", v)}
            />
            <NumberField
              label="Wind speed (mph)"
              value={form.windSpeedMph}
              onChange={(v) => update("windSpeedMph", v)}
            />
            <NumberField
              label="Wind direction (°)"
              value={form.windDirectionDeg}
              onChange={(v) => update("windDirectionDeg", v)}
            />
            <NumberField
              label="Precip (in/hr)"
              value={form.precipitationInch}
              onChange={(v) => update("precipitationInch", v)}
            />
            <NumberField
              label="Snow (in)"
              value={form.snowInch}
              onChange={(v) => update("snowInch", v)}
            />

            {isBaseball ? (
              <NumberField
                label="Ballpark orient. (°)"
                value={form.ballparkOrientationDeg}
                onChange={(v) => update("ballparkOrientationDeg", v)}
              />
            ) : null}
          </div>

          {indoorChosen ? (
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-500">
              Closed venue selected — the model neutralizes weather, so the
              result shows no scoring effect.
            </p>
          ) : isBaseball ? (
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-500">
              Wind direction and ballpark orientation together decide whether the
              wind blows in or out toward the outfield.
            </p>
          ) : (
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-500">
              Wind and cold drive the football model; wind direction is recorded
              but the football impact uses wind speed.
            </p>
          )}

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
            {loading ? "Modeling…" : "Model the weather"}
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
            Modeled impact
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Overall impact"
                  value={`${result.level} · ${result.score}/100`}
                  accent={LEVEL_COLOR[result.level]}
                />
                <Stat
                  label="Totals lean"
                  value={
                    result.favorsBetting === "under"
                      ? "Under"
                      : result.favorsBetting === "over"
                        ? "Over"
                        : "Neither"
                  }
                />
                <Stat label="Effective temp" value={`${result.effectiveTempF}°F`} />
                <Stat label="Dew point" value={`${result.dewPointF}°F`} />
              </div>

              <div
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  background: `${BRAND_COLORS.orbitalCyan}08`,
                }}
              >
                <p className={FIELD_LABEL}>
                  Total adjustment (reference {result.total.baseline})
                </p>
                <p className="mt-1 font-numerals text-sm text-white">
                  {result.total.adjusted}{" "}
                  <span className="text-ink-400">
                    ({signed(result.total.delta)} pts)
                  </span>
                </p>
              </div>

              {/* Component breakdown */}
              <div className="space-y-2">
                <ComponentRow label="Wind" c={result.wind} />
                <ComponentRow label="Temp" c={result.temperature} />
                <ComponentRow label="Precip" c={result.precipitation} />
              </div>

              {result.football ? (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: "rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p className={FIELD_LABEL}>Football model</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-numerals text-[11px] tabular-nums text-white">
                    <span className="text-ink-300">Passing impact</span>
                    <span className="text-right">
                      {result.football.passingImpactScore}/100
                    </span>
                    <span className="text-ink-300">Severity</span>
                    <span className="text-right">{result.football.severity}</span>
                    <span className="text-ink-300">Scoring impact</span>
                    <span className="text-right">
                      {signed(result.football.scoringImpactPct)}%
                    </span>
                    <span className="text-ink-300">Wind (Beaufort)</span>
                    <span className="text-right">
                      F{result.football.beaufort.force} ·{" "}
                      {result.football.beaufort.description}
                    </span>
                  </div>
                </div>
              ) : null}

              {result.baseball ? (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: "rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p className={FIELD_LABEL}>Ballpark wind</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-numerals text-[11px] tabular-nums text-white">
                    <span className="text-ink-300">Direction</span>
                    <span className="text-right">
                      {result.baseball.windDirection}
                    </span>
                    <span className="text-ink-300">Wind edge</span>
                    <span className="text-right">{result.baseball.windEdge}</span>
                    <span className="text-ink-300">HR boost</span>
                    <span className="text-right">
                      {signed(result.baseball.hrBoostPct)}%
                    </span>
                    <span className="text-ink-300">Run boost</span>
                    <span className="text-right">
                      {signed(result.baseball.runBoostPct)}%
                    </span>
                  </div>
                </div>
              ) : null}

              <div
                className="rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <p className={FIELD_LABEL}>Conditions</p>
                <p className="mt-1 font-numerals text-[12px] text-white">
                  {result.summaryLine}
                </p>
              </div>

              {result.factorNotes.length > 0 ? (
                <ul className="space-y-1.5">
                  {result.factorNotes.map((n, i) => (
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
                Enter game conditions to model the weather
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {isFootball
                  ? "The model reads wind and cold for football — see the passing-game and scoring impact from the conditions you enter."
                  : "The model reads the wind relative to the ballpark for baseball — see whether it blows in or out and the home-run effect."}{" "}
                A model explorer of your inputs, not a published pick.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <input
        className={INPUT_CLASS}
        style={BORDER_STYLE}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ComponentRow({
  label,
  c,
}: {
  label: string;
  c: WeatherComponent;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={FIELD_LABEL}>{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-numerals text-[11px] tabular-nums text-ink-300">
          {c.description}
        </span>
        <span
          className="font-numerals text-[11px] tabular-nums"
          style={{ color: LEVEL_COLOR[c.level] }}
        >
          {c.score}
        </span>
      </span>
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
        className="mt-1 font-numerals text-base font-semibold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </dd>
    </div>
  );
}
