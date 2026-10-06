/**
 * Family-weight evidence census — measures whether a signal family PRESENCE
 * carries information about the settled outcome, before its weight is trusted.
 *
 * THE PROBLEM THIS EXISTS TO FIX
 * -----------------------------
 * `DEFAULT_FAMILY_PRIOR_WEIGHTS` (hierarchical-pool.ts) and the per-signal
 * `trustWeight` fields in the registry are hand-assigned numbers:
 * SITUATIONAL 0.12, NARRATIVE 0.05, MICROCLIMATE 0.08, and 38 CONTINUOUS_VALUE
 * signals at 0.06–0.14. They move the PUBLISHED probability through
 * `applyContinuousSignalTilt`. None of them has ever been measured against a
 * settled outcome. A prior presented as a weight is the exact thing this repo's
 * doctrine forbids: "a weight is a prior, and inventing priors would fabricate
 * the ranking the tuner is meant to measure."
 *
 * This module does NOT decide the weights. It reports, per family, whether the
 * settled record contains enough evidence to say anything at all — and returns
 * `insufficient-evidence` when it does not. A census that counts is not a
 * thing that decides.
 *
 * WHY THE NAIVE VERSION IS WRONG (measured 2026-09-29)
 * -----------------------------------------------------
 * A first pass over 3,493 settled picks reported all five populated families
 * "ANTI-PREDICTIVE" (rest z=−4.33, venue z=−3.93, ats_form z=−4.18,
 * line_movement z=−5.67, schedule z=−5.67). That reading was a CONFOUND and
 * this module is built to refuse it:
 *
 *  - The 0-flag bucket is 100% MONEYLINE (933/933 rows). Moneyline is the
 *    market CLV-1 already measured as losing to the close hardest, and it
 *    carries no signal flags by construction. So "flags present" is largely a
 *    proxy for "not a moneyline pick".
 *  - `hadLineMovementSignal` and `hadScheduleSignal` disagree on 0 of 4,135
 *    rows. They are the SAME column value, so their identical z is one
 *    observation counted twice, not two independent confirmations.
 *  - Split by era (SURF-7's discipline), the sign FLIPS: rest present/absent is
 *    −8.99pp in the current era and +2.13pp in the legacy era. Pooling eras
 *    averages a well-behaved sample with an inverted one — that is how the
 *    false CONFIRMS stamp got onto 788 rows (8bda5340a).
 *
 * So every measurement here is (a) stratified by pickType so bet-type mix
 * cannot masquerade as signal quality, (b) de-duplicated against collinear
 * flags, and (c) required to hold direction WITHIN at least one stratum before
 * it is called anything other than `unmeasurable`.
 *
 * HONESTY CONTRACT
 * ----------------
 *  - No imputation, no `any`, no fabricated rows.
 *  - Below the evidence floor, the verdict is `insufficient-evidence` and
 *    `suggestedMultiplier` is null. A null means "we do not know", which is
 *    different from zero and must never be read as zero.
 *  - An anti-predictive family earns a NEGATIVE suggested multiplier, because
 *    dropping it silently would misrepresent what the data says.
 *  - Pure: no DB, no clock, no network. The caller supplies rows.
 */

/** Minimum settled observations in the SMALLER stratum before a verdict is allowed. */
export const MIN_STRATUM_OBSERVATIONS = 100;

/**
 * Minimum |z| before a direction is called real. 1.96 is the conventional
 * two-sided 5% threshold; we are deliberately not tuning it to make a family
 * look measured.
 */
export const MIN_ABS_Z = 1.96;

/**
 * Settled rows the SMALLER arm needs before its multiplier saturates, as a
 * multiple of MIN_STRATUM_OBSERVATIONS.
 *
 * Why this exists: the first version scaled evidence by
 * `sqrt(minArm / MIN_STRATUM_OBSERVATIONS)`, which equals 1.0 the moment the
 * smaller arm merely *touches* the floor. A 100-row arm facing a 200,000-row
 * arm therefore earned a full-strength weight off 0.05% of the evidence — a
 * throttle with no teeth. Saturating at 10x the floor means an arm sitting
 * exactly on the floor is throttled to ~0.32, and full weight requires real
 * sample in the thin arm, not a large one next to it.
 *
 * This multiplier is a deliberately conservative PRIOR, stated openly and
 * named here rather than buried in a literal. It is a claim about how much
 * thin-arm evidence is worth, not a measured constant; a founder calibration
 * decision may legitimately change it. What is NOT negotiable is that the
 * evidence factor is monotone increasing in the smaller arm's size, which the
 * test suite pins.
 */
export const EVIDENCE_SATURATION_MULTIPLE = 10;

/** Rows the smaller arm needs for a saturated evidence factor. */
export const EVIDENCE_SATURATION_ROWS = MIN_STRATUM_OBSERVATIONS * EVIDENCE_SATURATION_MULTIPLE;

/**
 * Maximum share of one pickType inside a family bucket before the bucket is
 * refused as a bet-type proxy rather than a signal reading.
 */
export const MAX_PICKTYPE_SHARE = 0.9;

/** A family bucket: one family, one presence state, one pickType stratum. */
export interface FamilyStratum {
  readonly family: string;
  readonly present: boolean;
  readonly pickType: string;
  readonly wins: number;
  readonly losses: number;
  /**
   * Distinct fixtures backing this bucket. Rows per fixture > 1 is a
   * correlation risk: several picks on one game are not independent
   * observations. This is reported, never silently ignored.
   */
  readonly distinctFixtures: number;
}

export type WeightVerdict =
  /** Direction held in every stratum that had enough power to test it. */
  | "earned"
  /** Direction reversed relative to the assumed sign, and it held. */
  | "anti-predictive"
  /** Tested with adequate power; no reliable direction. */
  | "inert"
  /** Not enough settled evidence to test. We do not know. */
  | "insufficient-evidence"
  /** Every stratum is a bet-type proxy or too thin to test at all. */
  | "unmeasurable";

export interface FamilyWeightMeasurement {
  readonly family: string;
  readonly verdict: WeightVerdict;
  /**
   * Multiplier the settled record supports, in −1..1, or null when the
   * verdict is insufficient-evidence / unmeasurable. null ≠ 0.
   */
  readonly suggestedMultiplier: number | null;
  /** Two-proportion z on the pooled strata, or null when untestable. */
  readonly z: number | null;
  readonly pValue: number | null;
  readonly observedWins: number;
  readonly observedLosses: number;
  readonly distinctFixtures: number;
  /**
   * Total-variation distance between the present arm's and the absent arm's
   * bet-type mix, in 0..1. 0 = identical composition, 1 = disjoint. At or above
   * MAX_PICKTYPE_SHARE the comparison is a bet-type proxy, not a signal
   * reading, and the verdict is `unmeasurable`.
   */
  readonly betTypeMixDistance: number;
  /**
   * How many pickType strata carried enough settled rows in BOTH arms to be
   * tested, and how many were dropped for being underpowered. Dropped strata are
   * never silently averaged in with a zero-variance term — that would be
   * inventing evidence.
   */
  readonly strataTested: number;
  readonly strataDropped: number;
  /** Families whose flags are collinear with this one, e.g. schedule === line_movement. */
  readonly collinearWith: readonly string[];
  /** Human-readable reason. Never empty — an unexplained verdict is a bug. */
  readonly reason: string;
}

// ───────────────────────── math (self-contained, no dependencies) ─────────────────────────

/** Abramowitz & Stegun 7.1.26 approximation of erf, |error| < 1.5e-7. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1 - poly * Math.exp(-ax * ax);
  return sign * y;
}

/** Two-sided p-value for a z statistic under the standard normal. */
export function twoTailedP(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(0, Math.min(1, 1 - Math.abs(erf(z / Math.SQRT2))));
}

/**
 * Two-proportion z test. Returns null when either arm is empty, because a
 * z of ±Infinity is not a measurement — it is a division by zero wearing a
 * lab coat.
 */
export function twoProportionZ(
  winsA: number,
  nA: number,
  winsB: number,
  nB: number,
): number | null {
  if (nA <= 0 || nB <= 0) return null;
  const p1 = winsA / nA;
  const p2 = winsB / nB;
  const pooled = (winsA + winsB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se <= 0) return null;
  return (p1 - p2) / se;
}

// ───────────────────────── strata assembly ─────────────────────────

interface Bucket {
  present: number;
  absent: number;
  wins: number;
  losses: number;
  fixtures: number;
  byPickType: Map<string, number>;
  totalRows: number;
}

function emptyBucket(): Bucket {
  return {
    present: 0,
    absent: 0,
    wins: 0,
    losses: 0,
    fixtures: 0,
    byPickType: new Map<string, number>(),
    totalRows: 0,
  };
}

function buildBuckets(strata: readonly FamilyStratum[]): Map<string, Map<boolean, Bucket>> {
  const out = new Map<string, Map<boolean, Bucket>>();
  for (const s of strata) {
    if (!Number.isFinite(s.wins) || !Number.isFinite(s.losses)) continue;
    if (s.wins < 0 || s.losses < 0) continue;
    const rows = s.wins + s.losses;
    if (rows === 0) continue;

    let byFamily = out.get(s.family);
    if (!byFamily) {
      byFamily = new Map<boolean, Bucket>();
      out.set(s.family, byFamily);
    }
    const b = byFamily.get(s.present) ?? emptyBucket();
    byFamily.set(s.present, b);

    if (s.present) b.present += rows;
    else b.absent += rows;
    b.wins += s.wins;
    b.losses += s.losses;
    // Fixture counts are only summed for the present arm; the absent arm's
    // fixture count is a property of the same games, so summing both would
    // double count every fixture.
    if (s.present) b.fixtures += Math.max(0, s.distinctFixtures);
    b.byPickType.set(s.pickType, (b.byPickType.get(s.pickType) ?? 0) + rows);
    b.totalRows += rows;
  }
  return out;
}

/**
 * Total-variation distance between the present arm's and the absent arm's
 * bet-type mix, in 0..1. 0 = identical composition, 1 = completely disjoint.
 *
 * This is the confound test, and it is deliberately NOT "how concentrated is
 * each arm on its own". A family measured entirely within SPREAD is a perfectly
 * clean measurement; what corrupts it is comparing an all-MONEYLINE absent arm
 * against an all-SPREAD present arm, where the win-rate gap measures the bet
 * type rather than the signal. Composition DIFFERENCE between the arms catches
 * that and leaves the legitimate single-pickType case alone.
 */
export function pickTypeMixDistance(present: Bucket, absent: Bucket): number {
  if (present.totalRows === 0 || absent.totalRows === 0) return 1;
  const keys = new Set<string>([...present.byPickType.keys(), ...absent.byPickType.keys()]);
  let total = 0;
  for (const k of keys) {
    const a = (present.byPickType.get(k) ?? 0) / present.totalRows;
    const b = (absent.byPickType.get(k) ?? 0) / absent.totalRows;
    total += Math.abs(a - b);
  }
  return total / 2;
}

/** True when the two arms are too different in bet-type mix to compare. */
function isPickTypeProxy(present: Bucket, absent: Bucket): boolean {
  return pickTypeMixDistance(present, absent) >= MAX_PICKTYPE_SHARE;
}

/**
 * Per-pickType stratified z, combined by inverse variance.
 *
 * WHY THIS EXISTS — the bug it fixes
 * ----------------------------------
 * The first version of this census took (family, presence) buckets and POOLED
 * every pickType inside them. Stratifying the input rows is not stratifying the
 * statistics: pooling an all-MONEYLINE absent arm with an all-SPREAD present arm
 * reproduces exactly the confound the `pickTypeMixDistance` guard was written to
 * catch, and the guard only fired when a whole arm was 100% one bet type. Run
 * against the real settled record on 2026-09-29, the pooled version reported
 * rest / ats_form / venue / line_movement all "ANTI-PREDICTIVE" at z = −3.9 to
 * −5.7 — a clean-looking, wrong answer, produced by the one confound this file
 * exists to prevent.
 *
 * So the test is computed INSIDE each pickType, where bet type is held
 * constant, and the per-stratum z values are combined with weights
 * `w_i = 1 / SE_i²` (a fixed-effect Mantel–Haenszel-style combination on the z
 * scale). Within a pickType there is no bet-type mix to confound, so what is
 * left is the signal.
 *
 * Stratula where one arm is empty or underpowered are DROPPED and counted in
 * `strataDropped`, never silently averaged in with a zero-variance term.
 */
export function stratifiedZ(
  rows: readonly FamilyStratum[],
  family: string,
): { z: number | null; tested: number; dropped: number; lift: number | null; nPresent: number; nAbsent: number } {
  const byPickType = new Map<string, FamilyStratum[]>();
  for (const r of rows) {
    if (r.family !== family) continue;
    const list = byPickType.get(r.pickType) ?? [];
    list.push(r);
    byPickType.set(r.pickType, list);
  }

  let weightedZ = 0;
  let totalWeight = 0;
  let weightedLift = 0;
  let tested = 0;
  let dropped = 0;
  let nPresent = 0;
  let nAbsent = 0;

  for (const strata of byPickType.values()) {
    const present = strata.find((s) => s.present);
    const absent = strata.find((s) => !s.present);
    const n1 = present ? present.wins + present.losses : 0;
    const n0 = absent ? absent.wins + absent.losses : 0;
    // Drop strata that cannot test the contrast at all. Counting these as
    // "no difference" would be inventing evidence.
    if (n1 < MIN_STRATUM_OBSERVATIONS || n0 < MIN_STRATUM_OBSERVATIONS) {
      dropped++;
      continue;
    }
    const z = twoProportionZ(present?.wins ?? 0, n1, absent?.wins ?? 0, n0);
    if (z === null) {
      dropped++;
      continue;
    }
    const pooled = ((present?.wins ?? 0) + (absent?.wins ?? 0)) / (n1 + n0);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n0));
    if (se <= 0) {
      dropped++;
      continue;
    }
    const w = 1 / (se * se);
    // Fixed-effect combination of independent per-stratum z's:
    //     z_combined = Σ(z_i · √w_i) / √(Σ w_i)
    // Since √w_i = 1/se_i, the numerator term is simply z_i / se_i. The earlier
    // form Σ(w_i · z_i) / √(Σ w_i) is wrong: with a single stratum it reduces
    // to z·w, inflating a flat family to z ≈ 20. Sanity check that the formula
    // reproduces the plain z for one stratum: √(1/se²) = 1/se, so it cancels.
    weightedZ += z * Math.sqrt(w);
    // The lift must be stratified too, or a bet-type mix difference re-enters
    // through the back door and the multiplier inherits the confound the z
    // just removed.
    weightedLift += w * ((present?.wins ?? 0) / n1 - (absent?.wins ?? 0) / n0);
    totalWeight += w;
    nPresent += n1;
    nAbsent += n0;
    tested++;
  }

  if (tested === 0 || totalWeight <= 0) {
    return { z: null, tested, dropped, lift: null, nPresent, nAbsent };
  }
  return {
    z: weightedZ / Math.sqrt(totalWeight),
    tested,
    dropped,
    lift: weightedLift / totalWeight,
    nPresent,
    nAbsent,
  };
}

/**
 * Families whose per-row presence pattern is identical — they are one signal,
 * not two. This is not cosmetic: the settled record shows
 * `hadLineMovementSignal` and `hadScheduleSignal` disagreeing on 0 of 4,135
 * rows, so their identical z-statistic is ONE observation counted twice.
 * Reporting both as independent confirmation would inflate apparent
 * corroboration.
 */
export function findCollinearFamilies(
  strata: readonly FamilyStratum[],
): Map<string, string[]> {
  // Signature = the family's full ordered set of (pickType, presence, n, wins).
  const perFamily = new Map<string, string[]>();
  for (const s of strata) {
    const key = `${s.pickType}|${s.present ? 1 : 0}|${s.wins + s.losses}|${s.wins}`;
    const list = perFamily.get(s.family) ?? [];
    list.push(key);
    perFamily.set(s.family, list);
  }

  const groups = new Map<string, string[]>();
  for (const [family, keys] of perFamily) {
    const sig = keys.slice().sort().join(";");
    const group = groups.get(sig) ?? [];
    group.push(family);
    groups.set(sig, group);
  }

  const result = new Map<string, string[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const family of group) {
      result.set(
        family,
        group.filter((f) => f !== family).sort(),
      );
    }
  }
  return result;
}

// ───────────────────────── the measurement ─────────────────────────

function measureFamily(
  family: string,
  byPresence: Map<boolean, Bucket>,
  collinear: readonly string[],
  allStrata: readonly FamilyStratum[],
): FamilyWeightMeasurement {
  const present = byPresence.get(true);
  const absent = byPresence.get(false);

  const base = {
    family,
    observedWins: (present?.wins ?? 0) + (absent?.wins ?? 0),
    observedLosses: (present?.losses ?? 0) + (absent?.losses ?? 0),
    distinctFixtures: present?.fixtures ?? 0,
    collinearWith: collinear,
  };

  if (!present || !absent) {
    return {
      ...base,
      verdict: "unmeasurable",
      suggestedMultiplier: null,
      z: null,
      pValue: null,
      betTypeMixDistance: 1,
      strataTested: 0,
      strataDropped: 0,
      reason:
        "only one presence state exists in the settled record, so there is nothing to compare against",
    };
  }

  // The MONEYLINE trap: when the two arms have near-disjoint bet-type mixes,
  // "present vs absent" measures bet type rather than signal quality. The
  // zero-flag bucket is 100% MONEYLINE in the settled record, so this is not
  // hypothetical.
  const presentProxy = isPickTypeProxy(present, absent);
  const mixDistance = pickTypeMixDistance(present, absent);

  if (presentProxy) {
    return {
      ...base,
      verdict: "unmeasurable",
      suggestedMultiplier: null,
      z: null,
      pValue: null,
      betTypeMixDistance: mixDistance,
      strataTested: 0,
      strataDropped: 0,
      reason:
        `bet-type proxy: the present and absent arms have near-disjoint bet-type ` +
        `mixes (total-variation distance ${mixDistance.toFixed(3)} >= ${MAX_PICKTYPE_SHARE}). ` +
        "Comparing them measures bet type, not signal quality.",
    };
  }

  // No pooled row floor here. The per-stratum floor inside `stratifiedZ` is the
  // only floor that matters, because a family can clear 100 rows pooled while
  // having no testable pickType at all — and a pooled floor would report that
  // as evidence when it is the opposite.

  // The test is STRATIFIED by pickType. Pooling the arms here is the exact bug
  // that produced the false "all five families anti-predictive" reading on the
  // real record: a bet-type mix difference masquerades as signal quality.
  const strat = stratifiedZ(allStrata, family);
  if (strat.z === null) {
    return {
      ...base,
      verdict: strat.tested === 0 ? "insufficient-evidence" : "unmeasurable",
      suggestedMultiplier: null,
      z: null,
      pValue: null,
      betTypeMixDistance: mixDistance,
      strataTested: strat.tested,
      strataDropped: strat.dropped,
      reason:
        strat.tested === 0
          ? `no pickType stratum had ${MIN_STRATUM_OBSERVATIONS} settled rows in BOTH arms ` +
            `(${strat.dropped} strata examined and all were underpowered). We do not know.`
          : `no stratum had a testable pooled variance across ${strat.tested} tested strata.`,
    };
  }

  const z = strat.z;
  const pValue = twoTailedP(z);
  const lift = strat.lift ?? 0;
  // Throttle by the SMALLER arm ACROSS TESTED STRATA, so a single huge
  // pickType cannot lend its size to a family measured on a token one.
  const thinArm = Math.min(strat.nPresent, strat.nAbsent);

  if (Math.abs(z) < MIN_ABS_Z) {
    return {
      ...base,
      verdict: "inert",
      suggestedMultiplier: 0,
      z,
      pValue,
      betTypeMixDistance: mixDistance,
      strataTested: strat.tested,
      strataDropped: strat.dropped,
      reason:
        `stratified across ${strat.tested} pickType strata (${strat.dropped} underpowered, dropped); ` +
        `stratified lift ${(lift * 100).toFixed(2)}pp, z=${z.toFixed(2)} (p=${pValue.toFixed(4)}). ` +
        "Adequate power, no reliable direction.",
    };
  }

  // Evidence scales with the SMALLER arm, not the total, so a family cannot buy
  // significance with a huge present-arm and a token absent-arm. Note this
  // throttles the WEIGHT, not the verdict: z is computed on the tested strata
  // and a real difference is still called a real difference. The throttle stops
  // a thin arm from moving a published probability at full strength.
  const evidence = Math.sqrt(thinArm / EVIDENCE_SATURATION_ROWS);
  const capped = Math.min(1, evidence);
  const multiplier = Number((Math.tanh(lift * 4) * capped).toFixed(6));

  return {
    ...base,
    verdict: lift > 0 ? "earned" : "anti-predictive",
    suggestedMultiplier: multiplier,
    z,
    pValue,
    betTypeMixDistance: mixDistance,
    strataTested: strat.tested,
    strataDropped: strat.dropped,
    reason:
      `stratified across ${strat.tested} pickType strata (${strat.dropped} underpowered, dropped); ` +
      `stratified lift ${(lift * 100).toFixed(2)}pp, z=${z.toFixed(2)} (p=${pValue.toFixed(4)}), ` +
      `thin arm ${thinArm} rows, evidence factor ${capped.toFixed(3)}` +
      (collinear.length > 0 ? `; collinear with ${collinear.join(", ")}` : ""),
  };
}

/**
 * Measure every family present in `strata`. Deterministic: the same input
 * always produces the same report, and the output order is sorted by family so
 * two runs can be diffed.
 */
export function censusFamilyWeights(
  strata: readonly FamilyStratum[],
): readonly FamilyWeightMeasurement[] {
  const buckets = buildBuckets(strata);
  const collinear = findCollinearFamilies(strata);
  const out: FamilyWeightMeasurement[] = [];
  for (const family of Array.from(buckets.keys()).sort()) {
    const byPresence = buckets.get(family);
    if (!byPresence) continue;
    out.push(measureFamily(family, byPresence, collinear.get(family) ?? [], strata));
  }
  return out;
}

/**
 * The families the registry currently pays, whose verdict is not `earned`.
 * This is the list that still rests on an unmeasured prior.
 */
export function familiesRestingOnPriors(
  measurements: readonly FamilyWeightMeasurement[],
): readonly FamilyWeightMeasurement[] {
  return measurements.filter((m) => m.verdict !== "earned");
}

/** Plain-language report. Every line traces to a measured field above. */
export function formatFamilyWeightReport(
  measurements: readonly FamilyWeightMeasurement[],
): string {
  const lines: string[] = [];
  lines.push("FAMILY WEIGHT EVIDENCE CENSUS");
  lines.push("=============================");
  if (measurements.length === 0) {
    lines.push("no strata supplied — nothing was measured.");
    return lines.join("\n");
  }
  for (const m of measurements) {
    const mult = m.suggestedMultiplier === null ? "n/a" : m.suggestedMultiplier.toFixed(3);
    lines.push("");
    lines.push(`${m.family}  verdict=${m.verdict}  multiplier=${mult}`);
    lines.push(
      `  settled: ${m.observedWins}W/${m.observedLosses}L across ${m.distinctFixtures} fixtures`,
    );
    lines.push(`  ${m.reason}`);
  }
  const priors = familiesRestingOnPriors(measurements);
  lines.push("");
  lines.push(
    `${priors.length} of ${measurements.length} families do NOT rest on measured evidence.`,
  );
  return lines.join("\n");
}
