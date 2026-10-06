/**
 * Group-aware tuning sample — the independent unit is the FIXTURE, not the row.
 *
 * #924's `tune-signal-weights.ts` measures a key's evidence with `n` = the row
 * COUNT and scales weight by `sqrt(n / MIN_SAMPLES)`. That is only valid if
 * rows are independent. They are not, and this repo documents exactly why,
 * twice:
 *
 *  - AGENTS.md, "FIXTURE TRIPLICATION": every NFL fixture exists as THREE
 *    `games` rows, none tombstoned (odds-api id, `espn:americanfootball_nfl:`,
 *    `espn:nfl:`).
 *  - AGENTS.md, the 124-pending-row audit: "the same model-signal selection is
 *    published once per fixture across a whole series with byte-identical
 *    trueProb" — Rays ML 0.8597101874244611 on three different dates, Red Sox
 *    ML 0.7666284226276924 on three.
 *
 * A key with 100 rows drawn from 11 fixtures therefore clears MIN_SAMPLES(100)
 * and earns FULL weight, while a key with 99 rows across 99 genuinely
 * independent games is refused. The floor is being paid in a currency that does
 * not exist. The same defect class the rulers queue already found in
 * `walkForwardSplits`: "There is no group key anywhere in the function... Models
 * that share contaminated folds are not independent estimates."
 *
 * WHAT THIS DOES
 *
 * Adds a group key to the tuning sample and makes the evidence floor count
 * DISTINCT GROUPS. `clusterKey` is required: a caller that cannot name the
 * fixture must not be able to silently pass correlated rows off as independent.
 *
 * It does NOT change `tuneSignalWeights`'s signature. That function is #924's
 * and is imported by its test; changing it would rewrite another agent's
 * contract for no gain. Instead this exposes the corrected numbers and the
 * corrected multiplier, and the report states BOTH so a reader can see the
 * inflation rather than take the corrected figure on faith.
 *
 * No gate, no env flag, no write, nothing published changes.
 */

/** The signal key being scored, e.g. "pgs.target_share". */
export type TunedKey = string;

/**
 * A group id that identifies the independent unit the reading belongs to.
 *
 * For picks this is the FIXTURE identity, not `gameId` — the repo's own
 * measurement is that `gameId` is exactly the field that triplicates. Callers
 * must resolve fixture identity themselves; this module never guesses one from a
 * row, because a wrong group key silently reintroduces the defect.
 */
export type GroupKey = string;

export interface GroupedObservation {
  readonly key: TunedKey;
  /**
   * The independent unit this reading belongs to. REQUIRED. Two rows sharing a
   * `clusterKey` are ONE observation of evidence, not two.
   */
  readonly clusterKey: GroupKey;
  /** Normalized directional reading at mint time (−1..1). */
  readonly value: number;
  /** Settled outcome 1/0. PUSH/VOID must be excluded upstream, never coerced. */
  readonly outcome: 0 | 1;
}

export interface GroupedTunedWeight {
  readonly key: TunedKey;
  /** Rows fed in, including rows inside a cluster. Diagnostic only. */
  readonly rows: number;
  /** DISTINCT cluster keys — the real evidence count. Drives the floor. */
  readonly groups: number;
  /** Largest cluster size, so one fixture cannot masquerade as a wide sample. */
  readonly maxClusterSize: number;
  /** Rows / groups. 1.0 means every row was independent. */
  readonly duplicationFactor: number;
  readonly correlation: number;
  /** #924's multiplier, computed on the ROW count. Shown for comparison. */
  readonly naiveMultiplier: number;
  /** Multiplier computed on the GROUP count. This is the honest one. */
  readonly multiplier: number;
  /** How much the row count overstated the weight. 1.0 = no duplication. */
  readonly inflation: number;
  readonly verdict: "earned" | "insufficient-groups" | "anti-predictive" | "inert";
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/**
 * Point-biserial correlation, identical in definition to #924's. Duplicated
 * rather than imported so this module's numbers can be checked against that one
 * in a test — if the two ever disagree, one of them is wrong and the test says
 * which.
 */
export function pointBiserial(
  values: readonly number[],
  outcomes: readonly (0 | 1)[],
): number {
  const n = values.length;
  if (n !== outcomes.length || n < 2) return 0;
  const mv = values.reduce((a, b) => a + b, 0) / n;
  // Annotate the accumulator as number: inferring it from `outcomes`' element
  // type yields `0 | 1`, so `a + (o === 1 ? 1 : 0)` fails to typecheck even
  // though it is arithmetically correct at runtime.
  const ones: number = outcomes.reduce((a: number, o) => a + (o === 1 ? 1 : 0), 0);
  if (ones === 0 || ones === n) return 0;
  const mo = ones / n;
  let num = 0;
  let sqv = 0;
  let sqo = 0;
  for (let i = 0; i < n; i++) {
    const dv = (values[i] as number) - mv;
    const dOut = (outcomes[i] as 0 | 1) - mo;
    num += dv * dOut;
    sqv += dv * dv;
    sqo += dOut * dOut;
  }
  const den = Math.sqrt(sqv * sqo);
  if (den <= 0) return 0;
  return clamp(num / den, -1, 1);
}

/**
 * Bounded multiplier from a correlation and an EVIDENCE COUNT. Same shape as
 * #924's `correlationToMultiplier`; the only difference is which count is passed
 * in, and that difference is the entire point of this module.
 */
export function multiplierFrom(r: number, evidenceCount: number, minSamples: number): number {
  if (evidenceCount < minSamples) return 0;
  if (!Number.isFinite(r)) return 0;
  return clamp(r * Math.sqrt(evidenceCount / minSamples), -1, 1);
}

export interface TuneGroupsOptions {
  /** Evidence floor, counted in DISTINCT GROUPS. Defaults to 100. */
  readonly minGroups?: number;
}

/**
 * Tune each key, counting distinct clusters as the evidence.
 *
 * A key earns weight only when its DISTINCT GROUP count clears `minGroups`. A
 * key can hold a very high row count and still earn nothing, which is the
 * correct answer rather than a failure: it means the evidence is a handful of
 * fixtures restated, and there is no way to tell from the rows alone.
 */
export function tuneGroupedWeights(
  sample: readonly GroupedObservation[],
  options: TuneGroupsOptions = {},
): GroupedTunedWeight[] {
  const minGroups = options.minGroups ?? 100;

  interface Bucket {
    rows: GroupedObservation[];
    clusters: Map<GroupKey, number>;
  }
  const buckets = new Map<TunedKey, Bucket>();
  for (const row of sample) {
    if (!row.key) continue;
    let bucket = buckets.get(row.key);
    if (!bucket) {
      bucket = { rows: [], clusters: new Map() };
      buckets.set(row.key, bucket);
    }
    bucket.rows.push(row);
    const c = bucket.clusters.get(row.clusterKey);
    if (c === undefined) bucket.clusters.set(row.clusterKey, 1);
    else bucket.clusters.set(row.clusterKey, c + 1);
  }

  const out: GroupedTunedWeight[] = [];
  for (const [key, bucket] of buckets) {
    // Correlation is over USABLE rows only: a non-finite reading is not evidence
    // and must not drag the correlation toward zero, but it also must not be
    // silently deleted from the count, or a key that is mostly junk would look
    // clean. Both are reported.
    const usable = bucket.rows.filter((r) => Number.isFinite(r.value));
    const rows = usable.length;
    const groups = bucket.clusters.size;
    // Reduce rather than Math.max(...spread): the spread form overflows the
    // argument limit once a key has more than ~125k distinct fixtures, and it
    // throws a RangeError at runtime rather than failing to compile.
    let maxClusterSize = 0;
    for (const size of bucket.clusters.values()) {
      if (size > maxClusterSize) maxClusterSize = size;
    }
    const duplicationFactor = groups > 0 ? rows / groups : 0;

    const r = pointBiserial(
      usable.map((x) => x.value),
      usable.map((x) => x.outcome),
    );

    const naiveMultiplier = multiplierFrom(r, rows, minGroups);
    const multiplier = multiplierFrom(r, groups, minGroups);
    // Inflation is undefined when the naive figure is 0 (nothing to overstate);
    // report 1 so a consumer dividing by it cannot produce NaN.
    const inflation = naiveMultiplier === 0 ? 1 : Math.abs(naiveMultiplier / multiplier || 1);

    const verdict: GroupedTunedWeight["verdict"] =
      groups < minGroups
        ? "insufficient-groups"
        : multiplier <= 0
          ? r < 0
            ? "anti-predictive"
            : "inert"
          : "earned";

    out.push({
      key,
      rows,
      groups,
      maxClusterSize,
      duplicationFactor,
      correlation: r,
      naiveMultiplier,
      multiplier,
      inflation,
      verdict,
    });
  }
  out.sort((a, b) => Math.abs(b.multiplier) - Math.abs(a.multiplier));
  return out;
}
