"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

type MatchupLeague = "NBA" | "NFL" | "NHL" | "MLB";
type PowerTier = "elite" | "strong" | "average" | "weak" | "bottom";

interface RatedTeam {
  name: string;
  powerScore: number;
  normalizedRating: number;
  tier: PowerTier;
  tierLabel: string;
  pointDifferential: number;
}

interface MatchupCompareOutput {
  league: MatchupLeague;
  home: RatedTeam;
  away: RatedTeam;
  expectedMargin: number;
  marginInterval: [number, number];
  homeWinProbability: number;
  leans: "home" | "away" | "neutral";
  factorNotes: string[];
  disclaimer: string;
}

interface TeamForm {
  name: string;
  winPct: string;
  pointsForPerGame: string;
  pointsAgainstPerGame: string;
  strengthOfSchedule: string;
  recentForm: string;
}

interface FormState {
  league: MatchupLeague;
  home: TeamForm;
  away: TeamForm;
}

const LEAGUES: readonly MatchupLeague[] = ["NBA", "NFL", "NHL", "MLB"];

/** Sensible per-league defaults so the form is informative on first paint. */
const LEAGUE_DEFAULTS: Record<
  MatchupLeague,
  { home: TeamForm; away: TeamForm; scoreLabel: string }
> = {
  NBA: {
    scoreLabel: "points",
    home: t("Home", "0.62", "116", "110", "0.55", "0.60"),
    away: t("Away", "0.48", "111", "113", "0.52", "0.40"),
  },
  NFL: {
    scoreLabel: "points",
    home: t("Home", "0.65", "26", "20", "0.55", "0.60"),
    away: t("Away", "0.47", "21", "24", "0.50", "0.40"),
  },
  NHL: {
    scoreLabel: "goals",
    home: t("Home", "0.60", "3.4", "2.8", "0.52", "0.60"),
    away: t("Away", "0.48", "2.9", "3.1", "0.50", "0.40"),
  },
  MLB: {
    scoreLabel: "runs",
    home: t("Home", "0.58", "4.8", "4.1", "0.51", "0.55"),
    away: t("Away", "0.49", "4.3", "4.4", "0.50", "0.45"),
  },
};

function t(
  name: string,
  winPct: string,
  pf: string,
  pa: string,
  sos: string,
  form: string,
): TeamForm {
  return {
    name,
    winPct,
    pointsForPerGame: pf,
    pointsAgainstPerGame: pa,
    strengthOfSchedule: sos,
    recentForm: form,
  };
}

const INITIAL: FormState = {
  league: "NBA",
  home: LEAGUE_DEFAULTS.NBA.home,
  away: LEAGUE_DEFAULTS.NBA.away,
};

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";

export function MatchupCompareTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<MatchupCompareOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setLeague(league: MatchupLeague): void {
    // Repopulate the two stat blocks with league-appropriate defaults so the
    // visible fields always make sense for the chosen sport.
    const d = LEAGUE_DEFAULTS[league];
    setForm({ league, home: d.home, away: d.away });
    setResult(null);
  }

  function updateTeam<K extends keyof TeamForm>(
    side: "home" | "away",
    key: K,
    value: TeamForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [side]: { ...prev[side], [key]: value },
    }));
  }

  function payloadTeam(team: TeamForm): Record<string, unknown> {
    return {
      name: team.name,
      winPct: Number(team.winPct),
      pointsForPerGame: Number(team.pointsForPerGame),
      pointsAgainstPerGame: Number(team.pointsAgainstPerGame),
      strengthOfSchedule:
        team.strengthOfSchedule.trim() === ""
          ? undefined
          : Number(team.strengthOfSchedule),
      recentForm:
        team.recentForm.trim() === "" ? undefined : Number(team.recentForm),
    };
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        league: form.league,
        home: payloadTeam(form.home),
        away: payloadTeam(form.away),
      };
      const res = await fetch("/api/lab/compare-matchup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: {
        success: boolean;
        data?: MatchupCompareOutput;
        error?: string;
      } = await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Comparison failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the comparison engine. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const scoreLabel = LEAGUE_DEFAULTS[form.league].scoreLabel;

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
            Matchup inputs
          </h3>
          <label className="mt-4 block">
            <span className={FIELD_LABEL}>League</span>
            <select
              className={INPUT_CLASS}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
              value={form.league}
              onChange={(e) => setLeague(e.target.value as MatchupLeague)}
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

          <div className="mt-4 grid grid-cols-2 gap-x-3">
            <TeamColumn
              title="Home team"
              team={form.home}
              scoreLabel={scoreLabel}
              onChange={(k, v) => updateTeam("home", k, v)}
            />
            <TeamColumn
              title="Away team"
              team={form.away}
              scoreLabel={scoreLabel}
              onChange={(k, v) => updateTeam("away", k, v)}
            />
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
            {loading ? "Comparing…" : "Compare matchup"}
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
            Comparison frame
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Expected margin"
                  value={`${signed(result.expectedMargin)} pts`}
                  accent={leanColor}
                />
                <Stat
                  label="Leans"
                  value={
                    result.leans === "home"
                      ? result.home.name
                      : result.leans === "away"
                        ? result.away.name
                        : "Pick"
                  }
                  accent={leanColor}
                />
                <Stat
                  label={`${result.home.name} win prob`}
                  value={pct(result.homeWinProbability)}
                />
                <Stat
                  label={`${result.away.name} win prob`}
                  value={pct(1 - result.homeWinProbability)}
                />
                <Stat
                  label={`${result.home.name} power`}
                  value={`${result.home.normalizedRating} · ${result.home.tierLabel}`}
                />
                <Stat
                  label={`${result.away.name} power`}
                  value={`${result.away.normalizedRating} · ${result.away.tierLabel}`}
                />
              </div>

              <div
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  background: `${BRAND_COLORS.orbitalCyan}08`,
                }}
              >
                <p className={FIELD_LABEL}>80% interval (expected margin)</p>
                <p className="mt-1 font-numerals text-sm text-white">
                  {signed(result.marginInterval[0])} to{" "}
                  {signed(result.marginInterval[1])} pts
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
                Pick a league and enter both teams&apos; season stats
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Every figure compares the inputs you supply — a model explorer,
                not a published pick. The per-league ratings are transparent
                model parameters, not measured outcomes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  team,
  scoreLabel,
  onChange,
}: {
  title: string;
  team: TeamForm;
  scoreLabel: string;
  onChange: <K extends keyof TeamForm>(key: K, value: TeamForm[K]) => void;
}): JSX.Element {
  const fields: ReadonlyArray<[keyof TeamForm, string]> = [
    ["winPct", "Win pct (0–1)"],
    ["pointsForPerGame", `${scoreLabel}/game for`],
    ["pointsAgainstPerGame", `${scoreLabel}/game vs`],
    ["strengthOfSchedule", "Sched. strength (0–1)"],
    ["recentForm", "Recent form (0–1)"],
  ];
  return (
    <div className="mt-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
        {title}
      </p>
      <label className="block">
        <span className={FIELD_LABEL}>Name</span>
        <input
          className={INPUT_CLASS}
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
          value={team.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </label>
      {fields.map(([key, label]) => (
        <label key={key} className="mt-2 block">
          <span className={FIELD_LABEL}>{label}</span>
          <input
            className={INPUT_CLASS}
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
            inputMode="decimal"
            value={team[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </label>
      ))}
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
