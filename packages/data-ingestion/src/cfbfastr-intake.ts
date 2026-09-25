/**
 * D4 — cfbfastR college play-by-play intake.
 *
 * College football play-by-play data intake (cfbfastR-compatible schema).
 * As-of discipline, null-on-missing, env-gated, no-store, fail-closed.
 *
 * COMPOSES WITH: prediction-engine play-by-play consumers, holdout-discipline
 * (seal last season for evaluation).
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const CFBFASTR_INTAKE_ENABLED_ENV = "CFBFASTR_INTAKE_ENABLED";

export function cfbfastrIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, CFBFASTR_INTAKE_ENABLED_ENV);
}

export interface CollegePlay {
  readonly playId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly offenseTeam: string;
  /** EPA on the play. Null → missing, never imputed. */
  readonly epa: number | null;
  readonly success: boolean | null;
  readonly playType: string;
  readonly down: number | null;
  readonly distance: number | null;
  readonly yardsGained: number | null;
  readonly isPass: boolean;
  readonly isRush: boolean;
  readonly isScoring: boolean;
  readonly asOf: string;
  readonly source: string;
}

export interface CollegeGameMeta {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

export const CFBFASTR_REQUIRED_FIELDS = [
  "playId",
  "gameId",
  "season",
  "week",
  "homeTeam",
  "awayTeam",
  "offenseTeam",
  "playType",
  "asOf",
] as const;

/**
 * Validate a raw play row against the cfbfastR intake schema.
 * Missing required fields reject the row — never imputed.
 */
export function validatePlayRow(
  raw: Record<string, unknown>,
): IntakeResult<CollegePlay> {
  for (const f of CFBFASTR_REQUIRED_FIELDS) {
    const v = raw[f];
    if (v === undefined || v === null || (typeof v === "string" && v.trim().length === 0)) {
      return { ok: false, reason: `missing required field ${f}` };
    }
  }

  const asOfMs = Date.parse(String(raw.asOf));
  if (!Number.isFinite(asOfMs)) {
    return { ok: false, reason: "invalid asOf timestamp" };
  }

  const season = Number(raw.season);
  const week = Number(raw.week);
  if (!Number.isInteger(season) || season < 1900 || season > 2100) {
    return { ok: false, reason: "invalid season" };
  }
  if (!Number.isInteger(week) || week < 0 || week > 30) {
    return { ok: false, reason: "invalid week" };
  }

  const num = (v: unknown): number | null => {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bool = (v: unknown): boolean | null => {
    if (v === undefined || v === null) return null;
    return Boolean(v);
  };

  return {
    ok: true,
    data: {
      playId: String(raw.playId),
      gameId: String(raw.gameId),
      season,
      week,
      homeTeam: String(raw.homeTeam),
      awayTeam: String(raw.awayTeam),
      offenseTeam: String(raw.offenseTeam),
      epa: num(raw.epa),
      success: bool(raw.success),
      playType: String(raw.playType),
      down: num(raw.down),
      distance: num(raw.distance),
      yardsGained: num(raw.yardsGained),
      isPass: Boolean(raw.isPass),
      isRush: Boolean(raw.isRush),
      isScoring: Boolean(raw.isScoring),
      asOf: String(raw.asOf),
      source: String(raw.source ?? "cfbfastr"),
    },
  };
}

/**
 * Ingest a batch of raw play rows. Env-gated and fail-closed.
 * Rows with future asOf relative to `asOfTime` are excluded.
 */
export function ingestCollegePlays(
  rawRows: readonly Record<string, unknown>[],
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly CollegePlay[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
}> {
  if (!cfbfastrIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `cfbfastr intake disabled — set ${CFBFASTR_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!Array.isArray(rawRows)) {
    return { ok: false, reason: "rawRows must be an array" };
  }

  const accepted: CollegePlay[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]!;
    const v = validatePlayRow(raw);
    if (!v.ok) {
      rejected.push({ index: i, reason: v.reason });
      continue;
    }
    const asOf = Date.parse(v.data.asOf);
    if (asOf > t) {
      rejected.push({ index: i, reason: "asOf after cutoff — future play excluded" });
      continue;
    }
    accepted.push(v.data);
  }

  return { ok: true, data: { accepted, rejected } };
}

/**
 * Build game meta from a play list. Scores stay null when not provided —
 * never imputed.
 */
export function buildGameMeta(
  plays: readonly CollegePlay[],
  scores: { readonly homeScore: number | null; readonly awayScore: number | null } | null = null,
): CollegeGameMeta | null {
  if (plays.length === 0) return null;
  const first = plays[0]!;
  return {
    gameId: first.gameId,
    season: first.season,
    week: first.week,
    homeTeam: first.homeTeam,
    awayTeam: first.awayTeam,
    kickoff: first.asOf,
    homeScore: scores?.homeScore ?? null,
    awayScore: scores?.awayScore ?? null,
  };
}

/**
 * Plays for a single game, sorted by asOf. Nulls pass through — never imputed.
 */
export function playsForGame(
  plays: readonly CollegePlay[],
  gameId: string,
): readonly CollegePlay[] {
  return plays
    .filter((p) => p.gameId === gameId)
    .slice()
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
}

/**
 * Aggregate EPA by offense team. Plays with null EPA are excluded from the
 * sum and counted as missing — never imputed as zero.
 */
export function aggregateEpaByTeam(
  plays: readonly CollegePlay[],
): {
  readonly byTeam: Record<string, { readonly epa: number; readonly playsWithEpa: number; readonly playsMissingEpa: number }>;
} {
  const byTeam: Record<
    string,
    { epa: number; playsWithEpa: number; playsMissingEpa: number }
  > = {};

  for (const p of plays) {
    const entry = byTeam[p.offenseTeam] ?? {
      epa: 0,
      playsWithEpa: 0,
      playsMissingEpa: 0,
    };
    if (p.epa === null || !Number.isFinite(p.epa)) {
      entry.playsMissingEpa += 1;
    } else {
      entry.epa += p.epa;
      entry.playsWithEpa += 1;
    }
    byTeam[p.offenseTeam] = entry;
  }

  for (const k of Object.keys(byTeam)) {
    byTeam[k]!.epa = Number(byTeam[k]!.epa.toFixed(4));
  }
  return { byTeam };
}
