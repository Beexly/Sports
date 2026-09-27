/**
 * Signal-ledger source adapters — the PRODUCER #924 is missing.
 *
 * #924 (91124a22f) landed `signal-ledger-populator.ts` and `tune-signal-weights.ts`
 * as pure functions, and correctly measured that they are inert: nothing reads the
 * entity tables the platform already populates (player_game_stats 35,168 / injuries
 * 6,501 / snap_counts 29,513 / next_gen_stats 2,718) and projects them into
 * candidates, and neither module is exported from the barrel. This file is the
 * adapter layer that closes that gap, so the tuner can be handed a real sample.
 *
 * Three rules bind everything here, each from an observed failure in this repo:
 *
 *  1. NO ANCHOR IS EVER INVENTED. A directional reading needs a neutral point
 *     (`anchor`) and a scale (`spread`) to be comparable across signal families.
 *     Those are empirical properties of a league population, not constants, so
 *     they are REQUIRED INPUTS. A caller that has not measured them cannot emit a
 *     signal, and `normalizeReading`'s own fallback (0) is never reached silently:
 *     a missing anchor drops the row rather than voting neutral. Neutral is a
 *     CLAIM ("this is average"); absent is SILENCE, and the ledger's whole
 *     contract is that silence is honest.
 *
 *  2. A ROW WITH NO RESOLVED ENTITY IS DROPPED, not keyed by name. injuries and
 *     snap_counts both allow a null playerId, and the Player rows are the only
 *     join to a stable id. Keying a signal on a display name would merge
 *     "T. Jones" across teams into one entity, which is precisely the identity
 *     bug holdout-discipline's `mapTeamIdentity` exists to prevent.
 *
 *  3. AS-OF HONESTY. `capturedAt` comes from the row's own `fetchedAt`, never
 *     from `new Date()`. A signal stamped at projection time would be born fresh
 *     and the composer's half-life decay would never fire, so a September 2025
 *     injury would read as fresh in September 2026 and outvote a real reading.
 *
 * Pure and db-free: these take already-loaded rows and return candidates. The
 * caller owns the query. Writes NOTHING to `signals` or anywhere else.
 */

import {
  buildCandidate,
  categoryPrior,
  normalizeReading,
  type CandidateSourceRow,
  type EntityType,
  type LedgerCandidate,
} from "./signal-ledger-populator.js";

/**
 * Empirical league baseline for one signal key: the neutral point and the scale.
 * Both are MEASURED from a population, never assumed. `spread` must be > 0 —
 * a zero spread means the population is constant, so the key carries no
 * directional information and its rows are dropped rather than divided by it.
 */
export interface SignalAnchor {
  readonly anchor: number;
  readonly spread: number;
}

/** Anchors keyed by signal key, e.g. `{ "ngs.cpoe": { anchor, spread } }`. */
export type AnchorTable = Readonly<Record<string, SignalAnchor>>;

/**
 * A row's capture instant as Prisma hands it back: a `Date` on a normal
 * request, an ISO `string` from a serialized or worker client.
 *
 * The row interfaces below previously declared `readonly fetchedAt: Date`
 * while `loadSignalLedger` — the first PRODUCTION caller — passes ISO strings.
 * That is precisely a type lie the compiler cannot catch: it builds, and it
 * throws `r.fetchedAt.toISOString is not a function` at runtime. Found by
 * running the real caller, not by re-reading the declarations.
 */
export type DateLike = Date | string;

/** ISO-8601 for either representation. Never a wall-clock read. */
function toIso(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * The subset of each source row these adapters read. Declared structurally (not
 * as a Prisma type) so the package stays db-free and unit-testable, and so a
 * caller can pass a projected/renamed shape without the engine importing the
 * client. `playerId` is nullable in injuries/snap_counts and that nullability is
 * load-bearing — see rule 2.
 */
export interface PlayerGameStatRow {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly targetShare: number | null;
  readonly fantasyPointsPpr: number | null;
  readonly passingEpa: number | null;
  readonly rushingEpa: number | null;
  readonly receivingEpa: number | null;
  readonly fetchedAt: DateLike;
}

export interface SnapCountRow {
  readonly playerId: string | null;
  readonly season: number;
  readonly week: number;
  readonly offensePct: number | null;
  readonly stPct: number | null;
  readonly defensePct: number | null;
  readonly fetchedAt: DateLike;
}

export interface NextGenStatRow {
  readonly gsisId: string;
  readonly season: number;
  readonly week: number;
  readonly statType: string; // "passing" | "receiving" | "rushing"
  readonly cpoe: number | null;
  readonly avgSeparation: number | null;
  readonly avgYacAboveExpectation: number | null;
  readonly expectedCompletionPct: number | null;
  readonly completionPct: number | null;
  readonly avgAirYardsToSticks: number | null;
  readonly fetchedAt: DateLike;
}

export interface InjuryRow {
  readonly playerId: string | null;
  readonly gsisId: string | null;
  readonly season: number;
  readonly week: number;
  readonly reportStatus: string | null;
  readonly practiceStatus: string | null;
  readonly fetchedAt: DateLike;
}

/**
 * Injury availability as a bounded ordinal. This is the ONE place a qualitative
 * status becomes a number, so it is a single exhaustive table rather than
 * per-adapter guesswork. Ordinals are ordinal in MEANING and roughly linear in
 * distance from full participation; the magnitude is then set by the caller's
 * anchor table, so a founder who believes "Out" is 3x "Questionable" encodes that
 * in the anchor, not here.
 *
 * Free text from a provider that matches nothing in this table yields NO value.
 * An unrecognized status is not treated as "healthy" — that would invent a
 * positive reading out of missing data, the exact inversion the populator's
 * drop-rather-than-default rule exists to prevent.
 */
const AVAILABILITY_ORDINAL: Readonly<Record<string, number>> = {
  out: 0,
  doubtful: 1,
  questionable: 2,
  limited: 2,
  restricted: 1,
  probable: 4,
  active: 5,
  full: 5,
};

function normalizeStatus(raw: string | null): number | null {
  if (raw === null) return null;
  const key = raw.trim().toLowerCase();
  const hit = AVAILABILITY_ORDINAL[key];
  return hit === undefined ? null : hit;
}

/**
 * Emit one candidate if, and only if, the reading is measurable: a finite raw
 * value AND a measured anchor for its key. Returns null otherwise so the caller
 * drops the row — it never defaults a value, a weight, or a timestamp.
 */
function emit(
  row: CandidateSourceRow,
  anchors: AnchorTable,
  entityType: EntityType,
): LedgerCandidate | null {
  const key = row.key;
  if (!key) return null;
  const a = anchors[key];
  // No measured baseline for this key => the row cannot be placed on the shared
  // scale, so it does not get a vote. This is the rule that keeps a league
  // average from being invented as a hardcoded constant.
  if (!a) return null;
  const value = normalizeReading(row.value, a.anchor, a.spread);
  return buildCandidate({ ...row, value }, entityType);
}

/**
 * PROJECTION 1 — settled per-game production and efficiency.
 * `targetShare` is a share (0..1) and EPA is per-play, so each is keyed and
 * anchored SEPARATELY; normalizing them against one shared anchor would make a
 * share and an EPA-per-play vote on the same scale, which they are not.
 */
export function projectPlayerGameStats(
  rows: readonly PlayerGameStatRow[],
  anchors: AnchorTable,
): LedgerCandidate[] {
  const out: LedgerCandidate[] = [];
  for (const r of rows) {
    const fields: readonly [string, number | null, string][] = [
      ["pgs.target_share", r.targetShare, "PRODUCTION"],
      ["pgs.fantasy_ppr", r.fantasyPointsPpr, "PRODUCTION"],
      ["pgs.passing_epa", r.passingEpa, "EFFICIENCY"],
      ["pgs.rushing_epa", r.rushingEpa, "EFFICIENCY"],
      ["pgs.receiving_epa", r.receivingEpa, "EFFICIENCY"],
    ];
    for (const [key, raw, category] of fields) {
      if (raw === null) continue;
      const prior = categoryPrior(category);
      const c = emit(
        {
          entityId: r.playerId,
          key,
          category,
          value: raw,
          valueRaw: raw,
          weight: prior.weight,
          confidence: prior.confidence,
          capturedAt: toIso(r.fetchedAt),
          season: r.season,
          week: r.week,
        },
        anchors,
        "player",
      );
      if (c) out.push(c);
    }
  }
  return out;
}

/**
 * PROJECTION 2 — participation share. offensePct / stPct / defensePct are each
 * anchored separately; a player on offense and one on defense have genuinely
 * different baselines and a role player genuinely differs from a starter.
 */
export function projectSnapCounts(
  rows: readonly SnapCountRow[],
  anchors: AnchorTable,
): LedgerCandidate[] {
  const out: LedgerCandidate[] = [];
  for (const r of rows) {
    // Rule 2: no resolved player => no entity => no vote.
    if (!r.playerId) continue;
    const fields: readonly [string, number | null][] = [
      ["snap.offense_pct", r.offensePct],
      ["snap.st_pct", r.stPct],
      ["snap.defense_pct", r.defensePct],
    ];
    for (const [key, raw] of fields) {
      if (raw === null) continue;
      const prior = categoryPrior("PRODUCTION");
      const c = emit(
        {
          entityId: r.playerId,
          key,
          category: "PRODUCTION",
          value: raw,
          valueRaw: raw,
          weight: prior.weight,
          confidence: prior.confidence,
          capturedAt: toIso(r.fetchedAt),
          season: r.season,
          week: r.week,
        },
        anchors,
        "player",
      );
      if (c) out.push(c);
    }
  }
  return out;
}

/**
 * PROJECTION 3 — NGS tracking. Keyed by `statType` because a receiver's CPOE and
 * a quarterback's CPOE are different quantities on different scales; collapsing
 * them into one `ngs.cpoe` key would average two populations into a number that
 * describes neither.
 */
export function projectNextGenStats(
  rows: readonly NextGenStatRow[],
  anchors: AnchorTable,
): LedgerCandidate[] {
  const out: LedgerCandidate[] = [];
  for (const r of rows) {
    if (!r.statType) continue;
    const fields: readonly [string, number | null, string][] = [
      ["cpoe", r.cpoe, "EFFICIENCY"],
      ["avg_separation", r.avgSeparation, "PRODUCTION"],
      ["yac_above_expectation", r.avgYacAboveExpectation, "EFFICIENCY"],
      ["air_yards_to_sticks", r.avgAirYardsToSticks, "EFFICIENCY"],
    ];
    for (const [metric, raw, category] of fields) {
      if (raw === null) continue;
      const key = `ngs.${r.statType}.${metric}`;
      const prior = categoryPrior(category);
      const c = emit(
        {
          entityId: r.gsisId,
          key,
          category,
          value: raw,
          valueRaw: raw,
          weight: prior.weight,
          confidence: prior.confidence,
          capturedAt: toIso(r.fetchedAt),
          season: r.season,
          week: r.week,
        },
        anchors,
        "player",
      );
      if (c) out.push(c);
    }
  }
  return out;
}

/**
 * PROJECTION 4 — availability, the one soft signal with a settled source.
 * Resolves an entity from playerId, else gsisId; drops when neither exists
 * rather than falling back to `playerName` (rule 2). Availability reads HIGHEST
 * confidence of any category here because it is a reported fact rather than an
 * estimate, but it is still gated on `practiceStatus` winning over
 * `reportStatus` when both are present: practice participation is the later and
 * more informative word, and a player listed Out on the report who then practices
 * full is a different player-state than the report claimed.
 */
export function projectInjuries(
  rows: readonly InjuryRow[],
  anchors: AnchorTable,
): LedgerCandidate[] {
  const out: LedgerCandidate[] = [];
  for (const r of rows) {
    const entityId = r.playerId ?? r.gsisId;
    if (!entityId) continue;
    const practice = normalizeStatus(r.practiceStatus);
    const report = normalizeStatus(r.reportStatus);
    const ordinal = practice ?? report;
    if (ordinal === null) continue;
    const prior = categoryPrior("HEALTH");
    const c = emit(
      {
        entityId,
        key: "injury.availability",
        category: "HEALTH",
        value: ordinal,
        // The source reading is the ordinal itself. NOTE: `buildCandidate` does
        // not copy `valueRaw` onto the candidate, so this field is carried for
        // the caller's audit trail only and never reaches the composer. The
        // practice-vs-report distinction is therefore NOT preserved downstream,
        // which is a real gap in the populator, not a property of this adapter.
        valueRaw: ordinal,
        weight: prior.weight,
        confidence: prior.confidence,
        capturedAt: toIso(r.fetchedAt),
        season: r.season,
        week: r.week,
      },
      anchors,
      "player",
    );
    if (c) out.push(c);
  }
  return out;
}

/**
 * Project every populated source in one call. Convenience only — each
 * projection is independently usable, and a caller that has loaded one table
 * should call that projection directly rather than this.
 */
export function projectAllSources(sources: {
  readonly playerGameStats?: readonly PlayerGameStatRow[];
  readonly snapCounts?: readonly SnapCountRow[];
  readonly nextGenStats?: readonly NextGenStatRow[];
  readonly injuries?: readonly InjuryRow[];
}, anchors: AnchorTable): LedgerCandidate[] {
  return [
    ...projectPlayerGameStats(sources.playerGameStats ?? [], anchors),
    ...projectSnapCounts(sources.snapCounts ?? [], anchors),
    ...projectNextGenStats(sources.nextGenStats ?? [], anchors),
    ...projectInjuries(sources.injuries ?? [], anchors),
  ];
}

/**
 * Count what a projection would produce, and — more usefully — what it DROPPED
 * and why. The drop reason is the point: a caller whose anchor table is empty
 * must be able to tell "the tables are empty" from "I never measured the
 * anchors", because those have identical output and opposite fixes.
 */
export function explainProjection(
  candidates: readonly LedgerCandidate[],
  inputCounts: Readonly<Record<string, number>>,
  anchors: AnchorTable,
): { emitted: number; missingAnchors: readonly string[]; inputCounts: Readonly<Record<string, number>> } {
  const missing = new Set<string>();
  for (const [key, n] of Object.entries(inputCounts)) {
    if (n > 0 && !anchors[key]) missing.add(key);
  }
  return {
    emitted: candidates.length,
    missingAnchors: [...missing].sort(),
    inputCounts,
  };
}
