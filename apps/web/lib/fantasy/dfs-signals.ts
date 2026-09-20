/**
 * DFS signal layer — the world the optimizer was never told about.
 *
 * WHY THIS EXISTS. `dfs-optimizer.ts` has always accepted a penalty function:
 *
 *     optimizeOne(opts, pen, restarts, slate, nodeBudget)
 *
 * `pen` threads through `buildRandom`, `searchValue` and the branch-and-bound,
 * so it can shape every lineup the solver will ever build. Until this module,
 * every caller in the repo passed `() => 0`. The optimizer had no idea it was
 * raining. It had no idea a team was implied for 18 points. It had never heard
 * a word from the airwave. All of that lived in PDFs, podcasts and chat
 * messages — which is exactly why a vibe about ownership could overrule it.
 *
 * THE BUG THIS FIXES, stated precisely. `dfs-slate.ts` scores contrarian upside
 * as:
 *
 *     leverage(p) = p.ceiling / (p.own * 100 + 1.5)
 *
 * That expression cannot tell the difference between "the field has not noticed
 * this player" and "the field noticed something you did not." Both look like
 * low ownership. Both get the same credit. On 2026-09-20 that cost a real
 * lineup twice in one afternoon (see docs/dfs/LESSONS.md, L-1 and L-2), and
 * both times the field was right.
 *
 * So the rule this module enforces is not "fade chalk" or "chase leverage". It
 * is narrower and load-bearing:
 *
 *     LOW OWNERSHIP IS ONLY EDGE IN A CLEAN ENVIRONMENT.
 *
 * When a player carries a visible, public suppressor — 25 mph gusts, an 18-point
 * implied team total, a backup quarterback — the field's low ownership is
 * INFORMATION, not opportunity, and the leverage credit is cancelled outright.
 *
 * WHAT THIS MODULE MAY DO, and this is the load-bearing part.
 *
 *   It may only SUBTRACT. It returns a penalty, never a bonus. A signal that
 *   wants to make a player better is a projection change and belongs upstream
 *   in whatever produced `proj`/`ceiling`, where it can be calibrated against
 *   outcomes. Here, the worst failure of a noisy signal is that we skip a
 *   player we would have rostered — never that we roster one we would not have.
 *   That asymmetry is deliberate, it mirrors lib/conviction/gate-contract.ts,
 *   and it must survive every future edit.
 *
 *   Concretely: wind does not "boost running backs". It penalises quarterbacks
 *   and pass catchers and leaves running backs alone. The relative effect is
 *   identical; the failure mode is not.
 *
 * ABSENT DATA IS NOT EVIDENCE. Every field on `GameEnvironment` is nullable and
 * `null` means "not measured". A null wind reading is never treated as calm, a
 * null implied total is never treated as average, and a game with no
 * environment entry at all produces no penalty. An unwired signal is inert,
 * not wrong — the same contract the conviction gate uses. Nothing here may
 * estimate, impute or default a value it did not read from a real source.
 *
 * EVERY SUPPRESSOR CARRIES ITS REASON. A player the solver skipped has to be
 * able to say why, in plain language, with a source. A suppressed player is not
 * a blank; it is the finding.
 */

import type { DfsPlayer, DfsPos } from "./dfs-slate";
import { leverage } from "./dfs-slate";
import type { Mode } from "./dfs-optimizer";

/* ------------------------------------------------------------------ *
 * Suppressors                                                         *
 * ------------------------------------------------------------------ */

export type SuppressorKey =
  /** Sustained wind or gusts above the threshold where passing and kicking degrade. */
  | "wind"
  /** Heavy precipitation. Real but far smaller than wind — weighted accordingly. */
  | "precipitation"
  /** The player's own team is implied for a bottom-of-slate point total. */
  | "low_team_total"
  /** Large underdog: negative script for the run game and the defense. */
  | "blowout_dog"
  /** A backup is starting at quarterback. */
  | "backup_qb"
  /** The bull case rests on a one-game sample that is statistically noise. */
  | "thin_sample"
  /** Independent analyst/podcast consensus is explicitly fading this player. */
  | "airwave_fade";

/** One reason a player's environment is impaired, with its evidence. */
export type Suppressor = {
  readonly key: SuppressorKey;
  /** 0..1. Scales the penalty. 1 = the threshold is fully breached. */
  readonly severity: number;
  /** Plain-language reason, suitable to show a reader. */
  readonly reason: string;
  /** Where the fact came from. Never invented. */
  readonly source: string;
};

/* ------------------------------------------------------------------ *
 * Environment                                                         *
 * ------------------------------------------------------------------ */

export type Roof = "open" | "closed" | "dome" | "unknown";

/** Measured conditions for one game. Every field nullable; null = not measured. */
export type GameEnvironment = {
  /** Canonical key: the two team codes sorted and joined, e.g. "CHI@MIN". */
  readonly gameKey: string;
  readonly roof: Roof;
  /** Sustained wind, mph. */
  readonly windMph: number | null;
  /** Peak gust, mph. */
  readonly gustMph: number | null;
  /** 0..1 chance of measurable precipitation. */
  readonly precipChance: number | null;
  /** Vegas game total. */
  readonly total: number | null;
  /** Team code -> implied team total. */
  readonly impliedTotals: Readonly<Record<string, number>>;
  /** Absolute spread, points. Favourite is `favourite`. */
  readonly spread: number | null;
  readonly favourite: string | null;
  /** Team codes starting a backup quarterback. */
  readonly backupQbTeams: readonly string[];
  /**
   * Provenance. Weather, betting markets and inactive reports are three
   * different sources and a suppressor must cite the one it actually used —
   * a wind reading does not evidence a quarterback change. `source` is the
   * fallback; the two specific fields override it where they are set.
   */
  readonly source: string;
  readonly marketSource?: string;
  readonly rosterSource?: string;
};

/** Canonical game key, order-independent. */
export const gameKeyOf = (a: string, b: string): string => [a, b].sort().join("@");

/* ------------------------------------------------------------------ *
 * Airwave — the podcast / analyst consensus layer                      *
 * ------------------------------------------------------------------ */

export type AirwaveVerdict = "START" | "FADE";

/**
 * One consensus read from the airwave (shows, beat writers, analyst columns).
 *
 * Only FADE reads produce a penalty. A START read is recorded for provenance
 * and deliberately does nothing, because this module may only subtract — a
 * chorus of people liking a player is not a reason for the solver to like him
 * more, it is a reason his ownership will be high, which `leverage` already
 * prices.
 */
export type AirwaveRead = {
  readonly player: string;
  readonly verdict: AirwaveVerdict;
  /** Number of INDEPENDENT sources saying it. One show is an opinion. */
  readonly sources: number;
  readonly note: string;
};

/* ------------------------------------------------------------------ *
 * Context                                                             *
 * ------------------------------------------------------------------ */

/**
 * The shape of the contest, which decides what "good" means.
 *
 * L-3: a cash-mode solve maximises the mean. A contest paying one place out of
 * seventy-five is won in the right tail. Using the wrong objective is not a
 * small error — it was worth roughly half the win equity on 2026-09-20.
 */
export type ContestShape = {
  readonly fieldSize: number;
  readonly placesPaid: number;
  readonly singleEntry: boolean;
};

export type SignalContext = {
  readonly environments: readonly GameEnvironment[];
  readonly airwave: readonly AirwaveRead[];
  /** Players whose bull case rests on a one-game sample (L-5). */
  readonly thinSamplePlayers: readonly string[];
  readonly contest?: ContestShape;
};

export const EMPTY_CONTEXT: SignalContext = {
  environments: [],
  airwave: [],
  thinSamplePlayers: [],
};

/* ------------------------------------------------------------------ *
 * Thresholds                                                          *
 * ------------------------------------------------------------------ */

/**
 * Every threshold here is a published, checkable number, not a preference.
 * They are deliberately conservative: the penalty ramps from "no effect" at the
 * lower bound to "full effect" at the upper, so a borderline game is nudged
 * rather than banned.
 */
export const THRESHOLDS = {
  /** Deep passing and field-goal accuracy degrade measurably above ~15 mph. */
  windSustainedFloor: 15,
  windSustainedFull: 25,
  gustFloor: 25,
  gustFull: 35,
  /** Rain alone, without wind, is a much smaller DFS factor than wind. */
  precipFloor: 0.6,
  precipFull: 1.0,
  /** Bottom-of-slate scoring environments. PIT was implied 18.0 on 2026-09-20. */
  teamTotalFloor: 20,
  teamTotalFull: 15,
  /** Underdog spread at which run-game script turns actively negative. */
  dogSpreadFloor: 9.5,
  dogSpreadFull: 16,
} as const;

/** Linear ramp from `floor` (0) to `full` (1), clamped. Handles either direction. */
export function ramp(value: number, floor: number, full: number): number {
  if (full === floor) return value >= full ? 1 : 0;
  const t = (value - floor) / (full - floor);
  return Math.min(1, Math.max(0, t));
}

/**
 * Penalty in DK points at severity 1, by suppressor and position.
 *
 * Note every running-back row under `wind` and `precipitation` is 0, not a
 * negative number and never a bonus. Wind does not help a running back; it
 * hurts everyone he is competing with for the ball. Encoding it as "0 for RB,
 * negative for passers" produces the same ordering with a safe failure mode.
 */
const PENALTY: Record<SuppressorKey, Record<DfsPos, number>> = {
  wind: { QB: 4.5, RB: 0, WR: 3.5, TE: 2.5, DST: 0 },
  precipitation: { QB: 1.2, RB: 0, WR: 1.0, TE: 0.8, DST: 0 },
  low_team_total: { QB: 4.0, RB: 2.5, WR: 4.0, TE: 3.0, DST: 0 },
  blowout_dog: { QB: 0, RB: 3.0, WR: 0, TE: 0, DST: 2.5 },
  backup_qb: { QB: 0, RB: 0, WR: 2.0, TE: 2.0, DST: 0 },
  thin_sample: { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0 },
  airwave_fade: { QB: 1.5, RB: 1.5, WR: 1.5, TE: 1.5, DST: 1.5 },
} as const;

/* ------------------------------------------------------------------ *
 * Evaluation                                                          *
 * ------------------------------------------------------------------ */

const envFor = (ctx: SignalContext, p: DfsPlayer): GameEnvironment | undefined =>
  ctx.environments.find((e) => e.gameKey === gameKeyOf(p.team, p.opp));

/**
 * Every suppressor acting on a player, with reasons. Returns `[]` when nothing
 * is measured — absence of data is never a suppressor.
 */
export function suppressorsFor(p: DfsPlayer, ctx: SignalContext): readonly Suppressor[] {
  const out: Suppressor[] = [];
  const env = envFor(ctx, p);

  if (env) {
    const sheltered = env.roof === "closed" || env.roof === "dome";

    // --- wind (L-1) -------------------------------------------------
    if (!sheltered) {
      const bySustained = env.windMph === null ? 0 : ramp(env.windMph, THRESHOLDS.windSustainedFloor, THRESHOLDS.windSustainedFull);
      const byGust = env.gustMph === null ? 0 : ramp(env.gustMph, THRESHOLDS.gustFloor, THRESHOLDS.gustFull);
      const severity = Math.max(bySustained, byGust);
      if (severity > 0) {
        const parts: string[] = [];
        if (env.windMph !== null) parts.push(`${env.windMph} mph sustained`);
        if (env.gustMph !== null) parts.push(`gusts to ${env.gustMph} mph`);
        out.push({
          key: "wind",
          severity,
          reason: `Outdoor game with ${parts.join(", ")} — passing and kicking degrade above ${THRESHOLDS.windSustainedFloor} mph.`,
          source: env.source,
        });
      }

      // --- precipitation ---------------------------------------------
      if (env.precipChance !== null) {
        const severity2 = ramp(env.precipChance, THRESHOLDS.precipFloor, THRESHOLDS.precipFull);
        if (severity2 > 0) {
          out.push({
            key: "precipitation",
            severity: severity2,
            reason: `${Math.round(env.precipChance * 100)}% chance of measurable precipitation, outdoors.`,
            source: env.source,
          });
        }
      }
    }

    // --- low implied team total (L-2) --------------------------------
    const implied = env.impliedTotals[p.team];
    if (implied !== undefined && p.pos !== "DST") {
      const severity3 = ramp(implied, THRESHOLDS.teamTotalFloor, THRESHOLDS.teamTotalFull);
      if (severity3 > 0) {
        out.push({
          key: "low_team_total",
          severity: severity3,
          reason: `${p.team} is implied for only ${implied} points — target share cannot pay in an offense that does not score.`,
          source: env.marketSource ?? env.source,
        });
      }
    }

    // --- blowout underdog script -------------------------------------
    if (env.spread !== null && env.favourite !== null && env.favourite !== p.team) {
      const severity4 = ramp(env.spread, THRESHOLDS.dogSpreadFloor, THRESHOLDS.dogSpreadFull);
      if (severity4 > 0 && (p.pos === "RB" || p.pos === "DST")) {
        out.push({
          key: "blowout_dog",
          severity: severity4,
          reason: `${p.team} is a ${env.spread}-point underdog — negative script for carries and for the defense.`,
          source: env.source,
        });
      }
    }

    // --- backup quarterback -------------------------------------------
    if (env.backupQbTeams.includes(p.team) && (p.pos === "WR" || p.pos === "TE")) {
      out.push({
        key: "backup_qb",
        severity: 1,
        reason: `${p.team} is starting a backup quarterback.`,
        source: env.rosterSource ?? env.source,
      });
    }
  }

  // --- thin sample (L-5) ---------------------------------------------
  if (ctx.thinSamplePlayers.includes(p.name)) {
    out.push({
      key: "thin_sample",
      severity: 1,
      reason: "The bull case rests on a one-game sample, which is statistically noise — no contrarian credit is earned on it.",
      source: "dfs-signals: thin-sample register",
    });
  }

  // --- airwave fade ---------------------------------------------------
  const fade = ctx.airwave.find((a) => a.player === p.name && a.verdict === "FADE");
  if (fade && fade.sources >= 2) {
    out.push({
      key: "airwave_fade",
      severity: Math.min(1, fade.sources / 4),
      reason: `${fade.sources} independent analyst sources are fading this player: ${fade.note}`,
      source: "airwave consensus",
    });
  }

  return out;
}

/** The single worst severity acting on a player, 0 when clean. */
export const worstSeverity = (sups: readonly Suppressor[]): number =>
  sups.reduce((m, s) => Math.max(m, s.severity), 0);

/** Direct point penalty from suppressors, before any leverage gating. */
export function pointPenalty(p: DfsPlayer, sups: readonly Suppressor[]): number {
  return sups.reduce((sum, s) => sum + PENALTY[s.key][p.pos] * s.severity, 0);
}

/**
 * Build the `pen` function that `optimizeOne` / `optimizeHeuristic` already
 * accept. This is the whole integration surface — no optimizer code changes.
 *
 * Two components:
 *
 *   1. The direct point penalty above.
 *   2. THE ASYMMETRY RULE (L-1). In `leverage` mode, `objVal` credits a player
 *      `leverage(p) * 6` for being contrarian. When a suppressor is active that
 *      credit is cancelled in proportion to severity, because the field's low
 *      ownership is then an assessment rather than an oversight. A fully
 *      suppressed player earns no contrarian credit at all.
 */
export function buildPenalty(ctx: SignalContext, mode: Mode): (p: DfsPlayer) => number {
  return (p: DfsPlayer): number => {
    const sups = suppressorsFor(p, ctx);
    if (!sups.length) return 0;
    let pen = pointPenalty(p, sups);
    if (mode === "leverage") {
      pen += leverage(p) * 6 * worstSeverity(sups);
    }
    return pen;
  };
}

/* ------------------------------------------------------------------ *
 * Explainability                                                      *
 * ------------------------------------------------------------------ */

export type SuppressionReport = {
  readonly player: string;
  readonly pos: DfsPos;
  readonly team: string;
  readonly penalty: number;
  readonly suppressors: readonly Suppressor[];
};

/** Every suppressed player on a slate, worst first — the "why we skipped him" surface. */
export function explainSlate(slate: readonly DfsPlayer[], ctx: SignalContext, mode: Mode): readonly SuppressionReport[] {
  const pen = buildPenalty(ctx, mode);
  return slate
    .map((p) => ({ player: p.name, pos: p.pos, team: p.team, penalty: pen(p), suppressors: suppressorsFor(p, ctx) }))
    .filter((r) => r.suppressors.length > 0)
    .sort((a, b) => b.penalty - a.penalty);
}

/* ------------------------------------------------------------------ *
 * Contest-shape guard (L-3)                                           *
 * ------------------------------------------------------------------ */

export type ModeAdvice = {
  readonly recommended: Mode;
  readonly mismatch: boolean;
  readonly reason: string;
};

/**
 * Which objective the contest actually rewards.
 *
 * A contest paying one place out of a large field is won in the right tail, so
 * the mean-maximising `cash` objective is the wrong tool — that mistake was
 * worth roughly half the win equity on 2026-09-20. Small fields still want
 * ceiling, but not the extreme contrarianism a 100k-entry field demands, which
 * is why `gpp` and not `leverage` is the recommendation below the cutoff.
 */
export function adviseMode(contest: ContestShape, chosen: Mode): ModeAdvice {
  const payoutRate = contest.placesPaid / Math.max(1, contest.fieldSize);
  const topHeavy = payoutRate <= 0.05;
  if (!topHeavy) {
    return {
      recommended: "cash",
      mismatch: chosen !== "cash",
      reason: `${contest.placesPaid} of ${contest.fieldSize} paid (${Math.round(payoutRate * 100)}%) — a floor-maximising build is correct.`,
    };
  }
  const recommended: Mode = contest.fieldSize >= 1000 ? "leverage" : "gpp";
  return {
    recommended,
    mismatch: chosen !== recommended,
    reason:
      contest.fieldSize >= 1000
        ? `${contest.placesPaid} of ${contest.fieldSize} paid in a large field — extreme differentiation is required.`
        : `${contest.placesPaid} of ${contest.fieldSize} paid — won in the right tail, but a small field needs ceiling, not extreme contrarianism.`,
  };
}
