/**
 * The signal spine — one bidirectional layer every surface reads.
 *
 * WHY THIS EXISTS. Weather, betting markets, inactive reports, vacated usage and
 * the airwave (podcasts, beat writers, the founder's own notes) were all real
 * information that lived in PDFs and chat messages. Nothing consumed them. The
 * DFS optimizer, the weekly rankings, the waiver board, the trade calculator and
 * the props engine each solved their own problem blind to the same facts, so the
 * only thing connecting them was a human remembering to care at the right moment.
 *
 * This module is that connection. It turns facts into SIGNED effects and hands
 * the same read to every surface, so "Nico Collins is out" moves the DFS build,
 * the waiver board, the trade value and the prop line in one consistent direction
 * instead of four inconsistent ones.
 *
 * BIDIRECTIONAL BY DESIGN. Effects carry a signed weight. Negative suppresses,
 * positive boosts. A 30 mph crosswind costs a quarterback points; the target
 * share a ruled-out WR1 leaves behind pays his replacement. Both are real, both
 * are measurable before lock, and a layer that could only subtract could express
 * exactly half of what we know.
 *
 * This is deliberately NOT the rule used by `lib/conviction/gate-contract.ts`.
 * That gate may only withhold, because it sits in front of PUBLISHED PICKS where
 * MODEL_VERSION is frozen and the track record is a promise. Nothing here feeds
 * a published probability. Selection tools — which lineup, which waiver claim,
 * which prop — are a different problem with a different safe direction. Anything
 * that would alter a published pick's probability stays out of this module and
 * needs a MODEL_VERSION bump and a calibration pass. See `prediction-advisory.ts`.
 *
 * THE ONE RULE THAT SURVIVED. Low ownership, low ADP and low roster rate are only
 * edge in a clean environment. When a visible public suppressor is active, the
 * market's low pricing is an assessment rather than an oversight. `confidence`
 * below carries that: a read built on a thin sample or contradicted by the
 * environment shrinks toward zero rather than swinging hard in either direction.
 *
 * ABSENT DATA IS NOT EVIDENCE. Every environment field is nullable and null means
 * "not measured", never "average" and never "calm". A player with no facts about
 * him gets a zero read, not a guess. Nothing here may estimate or impute.
 *
 * EVERY EFFECT CARRIES ITS REASON AND ITS OWN SOURCE. Weather, markets and
 * inactive reports are three different sources; a wind reading does not evidence
 * a quarterback change.
 */

import { TIER_WEIGHT, type Tier } from "@/lib/news/impact";

/* ------------------------------------------------------------------ *
 * Effects                                                             *
 * ------------------------------------------------------------------ */

export type EffectKey =
  /** Sustained wind or gusts above the threshold where passing and kicking degrade. */
  | "wind"
  /** Heavy precipitation. Real, but far smaller than wind. */
  | "precipitation"
  /** Team implied total is bottom-of-slate. Role cannot pay in an offense that does not score. */
  | "low_team_total"
  /** Team implied total is top-of-slate. The rising tide. */
  | "high_team_total"
  /** Large underdog: negative script for the run game and the defense. */
  | "blowout_dog"
  /** Large favourite: positive script for the run game and the defense. */
  | "blowout_favourite"
  /** A backup is starting at quarterback. */
  | "backup_qb"
  /** Usage vacated by a team-mate who is out — the single most reliable boost there is. */
  | "vacated_usage"
  /** Opponent is missing a starter at the position that covers this player. */
  | "coverage_downgrade"
  /** The read rests on a one-game sample. Shrinks confidence, never a direct weight. */
  | "thin_sample"
  /** Independent analyst / podcast / founder-note consensus. Signed both ways. */
  | "airwave";

/** One signed effect on a player, with its evidence. */
export type SignalEffect = {
  readonly key: EffectKey;
  /**
   * SIGNED per-game points. Negative suppresses, positive boosts. Expressed on a
   * DK-points scale; season-long surfaces rescale via `multiplierOf`.
   */
  readonly weight: number;
  /** 0..1. How much of the nominal weight this instance earns. */
  readonly severity: number;
  /** Plain-language reason, suitable to show a reader. */
  readonly reason: string;
  /** Where the fact came from. Never invented. */
  readonly source: string;
};

/** The spine's verdict on one player. */
export type SignalRead = {
  /** Signed per-game points. The number DFS and weekly surfaces add to a projection. */
  readonly delta: number;
  /** Proportional form for season-long surfaces. 1.0 = neutral. Clamped to [0.55, 1.45]. */
  readonly multiplier: number;
  /** 0..1. Shrinks toward 0 when the read rests on thin evidence. */
  readonly confidence: number;
  readonly effects: readonly SignalEffect[];
};

export const NEUTRAL_READ: SignalRead = { delta: 0, multiplier: 1, confidence: 1, effects: [] };

/* ------------------------------------------------------------------ *
 * Inputs                                                              *
 * ------------------------------------------------------------------ */

export type Roof = "open" | "closed" | "dome" | "unknown";
export type SignalPos = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

/** Measured conditions for one game. Every field nullable; null = not measured. */
export type GameEnvironment = {
  /** Canonical key: the two team codes sorted and joined. */
  readonly gameKey: string;
  readonly roof: Roof;
  readonly windMph: number | null;
  readonly gustMph: number | null;
  /** 0..1 chance of measurable precipitation. */
  readonly precipChance: number | null;
  readonly total: number | null;
  /** Team code -> implied team total. */
  readonly impliedTotals: Readonly<Record<string, number>>;
  readonly spread: number | null;
  readonly favourite: string | null;
  readonly backupQbTeams: readonly string[];
  /** Provenance. Specific fields override `source` where set. */
  readonly source: string;
  readonly marketSource?: string;
  readonly rosterSource?: string;
};

/**
 * Usage vacated by a player who will not play.
 *
 * This is the highest-quality boost available before kickoff because it is
 * arithmetic rather than opinion: targets that existed last week and belong to
 * nobody this week go somewhere, and the depth chart says where.
 */
export type VacatedUsage = {
  readonly team: string;
  /** Who is out. */
  readonly absent: string;
  /** 0..1 share of team targets or carries now unclaimed. */
  readonly share: number;
  /** Players expected to absorb it, in order. First named absorbs the most. */
  readonly beneficiaries: readonly string[];
  readonly source: string;
};

/** An opponent starter missing at the position that would have covered this player. */
export type CoverageDowngrade = {
  /** The OFFENSIVE team that benefits. */
  readonly team: string;
  readonly absentDefender: string;
  /** Positions that benefit. */
  readonly benefits: readonly SignalPos[];
  readonly source: string;
};

/** One read from the airwave: a show, a beat writer, or the founder's own notes. */
export type AirwaveNote = {
  readonly player: string;
  readonly verdict: "START" | "FADE";
  /** Source quality, reusing the existing wire tiering. */
  readonly tier: Tier;
  /** Count of INDEPENDENT sources saying it. One voice is an opinion. */
  readonly sources: number;
  readonly note: string;
};

export type SignalContext = {
  readonly environments: readonly GameEnvironment[];
  readonly airwave: readonly AirwaveNote[];
  readonly vacated: readonly VacatedUsage[];
  readonly coverage: readonly CoverageDowngrade[];
  /** Players whose case rests on a one-game sample. Shrinks confidence. */
  readonly thinSample: readonly string[];
};

export const EMPTY_CONTEXT: SignalContext = {
  environments: [],
  airwave: [],
  vacated: [],
  coverage: [],
  thinSample: [],
};

/** A player as the spine needs to see him. Every surface can produce this shape. */
export type SignalSubject = {
  readonly name: string;
  readonly pos: SignalPos;
  readonly team: string;
  /** Opponent team code. Omit for season-long surfaces with no fixed opponent. */
  readonly opp?: string;
};

/* ------------------------------------------------------------------ *
 * Thresholds and magnitudes                                           *
 * ------------------------------------------------------------------ */

export const THRESHOLDS = {
  /** Deep passing and field-goal accuracy degrade measurably above ~15 mph. */
  windSustainedFloor: 15,
  windSustainedFull: 25,
  gustFloor: 25,
  gustFull: 35,
  precipFloor: 0.6,
  precipFull: 1.0,
  /** Bottom-of-slate scoring environments. */
  teamTotalLowFloor: 20,
  teamTotalLowFull: 15,
  /** Top-of-slate scoring environments. */
  teamTotalHighFloor: 25,
  teamTotalHighFull: 30,
  dogSpreadFloor: 9.5,
  dogSpreadFull: 16,
  favSpreadFloor: 9.5,
  favSpreadFull: 16,
} as const;

/** Linear ramp from `floor` (0) to `full` (1), clamped. Works in either direction. */
export function ramp(value: number, floor: number, full: number): number {
  if (full === floor) return value >= full ? 1 : 0;
  return Math.min(1, Math.max(0, (value - floor) / (full - floor)));
}

/**
 * SIGNED nominal weight in per-game points, by effect and position.
 *
 * Negative suppresses, positive boosts. Read the `wind` row against the
 * `high_team_total` row: the same layer that takes 4.5 points off a quarterback
 * in a gale gives 2.6 back to one in a 30-point team total. That symmetry is the
 * point — half a picture is what produced the failures in docs/dfs/LESSONS.md.
 */
const WEIGHT: Record<EffectKey, Record<SignalPos, number>> = {
  wind: { QB: -4.5, RB: 0, WR: -3.5, TE: -2.5, DST: 0, K: -3.5 },
  precipitation: { QB: -1.2, RB: 0, WR: -1.0, TE: -0.8, DST: 0, K: -1.0 },
  low_team_total: { QB: -4.0, RB: -2.5, WR: -4.0, TE: -3.0, DST: 0, K: -2.5 },
  high_team_total: { QB: 2.6, RB: 1.8, WR: 2.4, TE: 1.8, DST: 0, K: 1.6 },
  blowout_dog: { QB: 0, RB: -3.0, WR: 0, TE: 0, DST: -2.5, K: -1.0 },
  blowout_favourite: { QB: -0.8, RB: 2.2, WR: -0.6, TE: 0, DST: 3.0, K: 0.8 },
  backup_qb: { QB: 0, RB: 0, WR: -2.0, TE: -2.0, DST: 0, K: -0.8 },
  vacated_usage: { QB: 0, RB: 4.5, WR: 5.5, TE: 5.0, DST: 0, K: 0 },
  coverage_downgrade: { QB: 1.2, RB: 0, WR: 2.2, TE: 1.6, DST: 0, K: 0 },
  thin_sample: { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 },
  airwave: { QB: 2.0, RB: 2.0, WR: 2.0, TE: 2.0, DST: 1.5, K: 1.0 },
} as const;

export const gameKeyOf = (a: string, b: string): string => [a, b].sort().join("@");

/**
 * How much a unit of usage is worth in this team's scoring environment.
 *
 * Returns 1.0 at a league-average implied total, falling toward 0.35 in a
 * bottom-of-slate offense and rising to 1.3 in a top one. Usage-derived BOOSTS
 * are multiplied by this; suppressions are not, because a bad environment does
 * not become less bad when a team-mate gets hurt.
 *
 * Absent an implied total this returns 1.0 — unknown is neutral, never a
 * discount, per "absent data is not evidence".
 */
export function environmentScalar(env: GameEnvironment | undefined, team: string): number {
  const implied = env?.impliedTotals[team];
  if (implied === undefined) return 1;
  // 15 -> 0.35, 22 -> 1.0, 30 -> 1.3
  if (implied <= 22) return Math.max(0.35, 0.35 + ((implied - 15) / 7) * 0.65);
  return Math.min(1.3, 1 + ((implied - 22) / 8) * 0.3);
}

/* ------------------------------------------------------------------ *
 * Evaluation                                                          *
 * ------------------------------------------------------------------ */

const envFor = (ctx: SignalContext, s: SignalSubject): GameEnvironment | undefined =>
  s.opp === undefined ? undefined : ctx.environments.find((e) => e.gameKey === gameKeyOf(s.team, s.opp!));

const push = (out: SignalEffect[], key: EffectKey, pos: SignalPos, severity: number, reason: string, source: string): void => {
  const nominal = WEIGHT[key][pos];
  if (nominal === 0 || severity <= 0) return;
  out.push({ key, weight: nominal * severity, severity, reason, source });
};

/** Every signed effect acting on a subject. `[]` when nothing is measured. */
export function effectsFor(s: SignalSubject, ctx: SignalContext): readonly SignalEffect[] {
  const out: SignalEffect[] = [];
  const env = envFor(ctx, s);

  if (env) {
    const sheltered = env.roof === "closed" || env.roof === "dome";
    const market = env.marketSource ?? env.source;

    if (!sheltered) {
      const bySustained = env.windMph === null ? 0 : ramp(env.windMph, THRESHOLDS.windSustainedFloor, THRESHOLDS.windSustainedFull);
      const byGust = env.gustMph === null ? 0 : ramp(env.gustMph, THRESHOLDS.gustFloor, THRESHOLDS.gustFull);
      const sev = Math.max(bySustained, byGust);
      if (sev > 0) {
        const parts: string[] = [];
        if (env.windMph !== null) parts.push(`${env.windMph} mph sustained`);
        if (env.gustMph !== null) parts.push(`gusts to ${env.gustMph} mph`);
        push(out, "wind", s.pos, sev, `Outdoor game with ${parts.join(", ")}. Passing and kicking degrade above ${THRESHOLDS.windSustainedFloor} mph.`, env.source);
      }
      if (env.precipChance !== null) {
        const sevP = ramp(env.precipChance, THRESHOLDS.precipFloor, THRESHOLDS.precipFull);
        push(out, "precipitation", s.pos, sevP, `${Math.round(env.precipChance * 100)}% chance of measurable precipitation, outdoors.`, env.source);
      }
    }

    const implied = env.impliedTotals[s.team];
    if (implied !== undefined) {
      const low = ramp(implied, THRESHOLDS.teamTotalLowFloor, THRESHOLDS.teamTotalLowFull);
      push(out, "low_team_total", s.pos, low, `${s.team} is implied for only ${implied} points. Role cannot pay in an offense that does not score.`, market);
      const high = ramp(implied, THRESHOLDS.teamTotalHighFloor, THRESHOLDS.teamTotalHighFull);
      push(out, "high_team_total", s.pos, high, `${s.team} is implied for ${implied} points, a top-of-slate scoring environment.`, market);
    }

    if (env.spread !== null && env.favourite !== null) {
      if (env.favourite !== s.team) {
        const sevD = ramp(env.spread, THRESHOLDS.dogSpreadFloor, THRESHOLDS.dogSpreadFull);
        push(out, "blowout_dog", s.pos, sevD, `${s.team} is a ${env.spread}-point underdog. Negative script for carries and for the defense.`, market);
      } else {
        const sevF = ramp(env.spread, THRESHOLDS.favSpreadFloor, THRESHOLDS.favSpreadFull);
        push(out, "blowout_favourite", s.pos, sevF, `${s.team} is a ${env.spread}-point favourite. Positive script for carries and for the defense.`, market);
      }
    }

    if (env.backupQbTeams.includes(s.team)) {
      push(out, "backup_qb", s.pos, 1, `${s.team} is starting a backup quarterback.`, env.rosterSource ?? env.source);
    }
  }

  // --- usage boosts, SCALED BY THE SCORING ENVIRONMENT ----------------
  //
  // This interaction is the whole lesson of 2026-09-20 expressed as arithmetic.
  // Usage is a SHARE OF A QUANTITY. A vacated 30% target share on a team implied
  // for 30 points and the same share on a team implied for 18 are not the same
  // opportunity, and a layer that simply ADDED a usage bonus to a team-total
  // penalty would let a role argument cancel a scoring-environment argument.
  // They do not cancel. They multiply.
  //
  // DK Metcalf is the specimen: Michael Pittman out made him the outright alpha,
  // which is real, and Pittsburgh was implied for 18.0, which is also real. The
  // second fact governs the first, and he scored 6.70.
  const usageScalar = environmentScalar(env, s.team);

  for (const v of ctx.vacated) {
    if (v.team !== s.team) continue;
    const idx = v.beneficiaries.indexOf(s.name);
    if (idx < 0) continue;
    // First named absorbs most; each subsequent beneficiary takes a decaying cut.
    const cut = 1 / Math.pow(2, idx);
    const sev = Math.min(1, v.share * cut * 2) * usageScalar;
    const scaled = usageScalar < 0.95 ? ` Scaled down: ${s.team}'s scoring environment limits what that share is worth.` : "";
    push(out, "vacated_usage", s.pos, sev, `${v.absent} is out, vacating ${Math.round(v.share * 100)}% of the team's usage. ${s.name} is beneficiary ${idx + 1}.${scaled}`, v.source);
  }

  // --- opposing coverage downgrade, scaled the same way ----------------
  for (const c of ctx.coverage) {
    if (c.team !== s.team || !c.benefits.includes(s.pos)) continue;
    push(out, "coverage_downgrade", s.pos, usageScalar, `Opponent is without ${c.absentDefender}.`, c.source);
  }

  // --- airwave, signed both ways ---------------------------------------
  const notes = ctx.airwave.filter((a) => a.player === s.name);
  for (const n of notes) {
    if (n.sources < 2) continue; // one voice is an opinion, not a consensus
    const breadth = Math.min(1, n.sources / 4);
    const sev = breadth * TIER_WEIGHT[n.tier];
    const dir = n.verdict === "FADE" ? -1 : 1;
    const nominal = WEIGHT.airwave[s.pos];
    if (nominal === 0 || sev <= 0) continue;
    out.push({
      key: "airwave",
      weight: nominal * sev * dir,
      severity: sev,
      reason: `${n.sources} independent ${n.tier}-tier sources ${n.verdict === "FADE" ? "fading" : "backing"} this player: ${n.note}`,
      source: `airwave (${n.tier})`,
    });
  }

  // --- thin sample: confidence only, never a direct weight -------------
  if (ctx.thinSample.includes(s.name)) {
    out.push({
      key: "thin_sample",
      weight: 0,
      severity: 1,
      reason: "The case rests on a one-game sample, which is statistically noise. The read is shrunk, not reversed.",
      source: "signal spine: thin-sample register",
    });
  }

  return out;
}

/** Proportional form of a signed delta, for season-long surfaces. */
export const multiplierOf = (delta: number, base = 14): number =>
  Math.min(1.45, Math.max(0.55, 1 + delta / base));

/**
 * The spine's read on a subject.
 *
 * `confidence` shrinks the whole read when it rests on a one-game sample. That is
 * the surviving half of the lesson that produced this module: a thin case does
 * not earn a big swing in EITHER direction.
 */
export function readSignals(s: SignalSubject, ctx: SignalContext): SignalRead {
  const effects = effectsFor(s, ctx);
  if (!effects.length) return NEUTRAL_READ;
  const thin = effects.some((e) => e.key === "thin_sample");
  const confidence = thin ? 0.5 : 1;
  const raw = effects.reduce((sum, e) => sum + e.weight, 0);
  const delta = raw * confidence;
  return { delta, multiplier: multiplierOf(delta), confidence, effects };
}

/* ------------------------------------------------------------------ *
 * Explainability                                                      *
 * ------------------------------------------------------------------ */

export type SignalReport = {
  readonly player: string;
  readonly pos: SignalPos;
  readonly team: string;
  readonly read: SignalRead;
};

/** Every moved player, biggest absolute move first — the "why" surface. */
export function explain(subjects: readonly SignalSubject[], ctx: SignalContext): readonly SignalReport[] {
  return subjects
    .map((s) => ({ player: s.name, pos: s.pos, team: s.team, read: readSignals(s, ctx) }))
    .filter((r) => r.read.effects.length > 0)
    .sort((a, b) => Math.abs(b.read.delta) - Math.abs(a.read.delta));
}
