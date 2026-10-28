/**
 * Reproduced client-function fragments.
 *
 * Each function below is a transcription of arithmetic that is VISIBLE in a
 * beautified bundle captured during the overnight pass. Nothing is inferred from a
 * name and no coefficient is added. Where a helper is minified past reading, the
 * fragment is marked incomplete and the unknown is named.
 *
 * Hosts: fantasypoints.com. The thepowerrank.com hits are d3 internals and are
 * recorded as framework rather than reproduced.
 */

export interface Fragment {
  readonly host: string;
  readonly visibleName: string;
  readonly what: string;
  /** "complete" = every operand is visible. "incomplete" = a helper is unreadable. */
  readonly completeness: "complete" | "incomplete";
  readonly unknown: string | null;
}

/**
 * fantasypoints `Xm` — linear decay to a floor.
 *
 * `Math.max(.12, 1 - (e - 1) / t)`. At e=1 the weight is 1; it falls linearly and
 * clamps at 0.12. Fully visible.
 */
export function fantasypointsDecayToFloor(index: number, span: number): number {
  return Math.max(0.12, 1 - (index - 1) / span);
}

/**
 * fantasypoints `Mc` — deterministic pseudo-random value in [lo, hi], rounded.
 *
 * `const r = n - t, i = t + Yo(e) % 10007 / 10007 * r, s = 10 ** a;
 *  return Math.round(i * s) / s`
 *
 * `Yo` is an unreadable hash helper, so the caller supplies its output. The 10007
 * divisor and the rounding are visible and reproduced.
 */
export function fantasypointsDeterministicInRange(
  hash: number,
  lo: number,
  hi: number,
  decimals = 0,
): number {
  const span = hi - lo;
  const value = lo + ((hash % 10007) / 10007) * span;
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/** fantasypoints `vt` — `Mc` with zero decimals. */
export const fantasypointsDeterministicInt = (hash: number, lo: number, hi: number): number =>
  fantasypointsDeterministicInRange(hash, lo, hi, 0);

/**
 * fantasypoints `epe` — pro-rate a total by elapsed seconds against a 3600 s cap.
 *
 * `lc = 3600`; `const a = finite(e) ? e : 0, r = finite(t) ? t : 0,
 *  i = max(0, min(lc, finite(n) ? n : lc)), s = r / lc * i;
 *  return Math.round((a + s) * 100) / 100`
 *
 * Fully visible. `base` is added to the pro-rated part.
 */
export function fantasypointsProRateBySeconds(
  base: number,
  total: number,
  seconds: number,
  cap = 3600,
): number {
  const b = Number.isFinite(base) ? base : 0;
  const t = Number.isFinite(total) ? total : 0;
  const s = Math.max(0, Math.min(cap, Number.isFinite(seconds) ? seconds : cap));
  return Math.round((b + (t / cap) * s) * 100) / 100;
}

/**
 * fantasypoints `dF` — name-match rank.
 *
 * Returns 0 for a prefix match, 1 when the query's first token prefixes a word in
 * the candidate, 2 for a loose token match, null for no match. Fully visible.
 */
export function fantasypointsNameMatchRank(query: string, candidate: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return null;
  const c = (candidate || "").toLowerCase();
  if (!c) return null;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  for (const tok of tokens) if (!c.includes(tok)) return null;
  if (c.startsWith(q)) return 0;
  const first = tokens[0];
  if (first === undefined) return null;
  return c.split(/[\s'']+/).some((w) => w.startsWith(first)) ? 1 : 2;
}

export interface RankedAsset {
  readonly assetId: string;
  readonly name: string;
  readonly position: string;
  readonly mvs: number;
}

/**
 * fantasypoints `Dwe` — rank assets by name match, tie-break on mvs, take N.
 *
 * `PICK_` ids are skipped. Sort is `rank asc`, then `mvs desc`. Fully visible given
 * the match rank above.
 */
export function fantasypointsRankAssets(
  query: string,
  assets: ReadonlyMap<string, RankedAsset>,
  limit = 10,
): RankedAsset[] {
  const scored: { entry: RankedAsset; rank: number }[] = [];
  for (const [id, asset] of assets) {
    if (id.startsWith("PICK_")) continue;
    const rank = fantasypointsNameMatchRank(query, asset.name || "");
    if (rank !== null) scored.push({ entry: asset, rank });
  }
  scored.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.entry.mvs - a.entry.mvs));
  return scored.slice(0, limit).map((s) => s.entry);
}

/**
 * fantasypoints `pwe` — a player's rank, or null when the rank is not finite.
 *
 * `const n = ome(e, t); return n && Number.isFinite(n.rank) ? n.rank : null`
 *
 * `ome` is unreadable, so the caller supplies the looked-up record.
 */
export function fantasypointsFiniteRank(record: { rank?: unknown } | null | undefined): number | null {
  const r = record?.rank;
  return typeof r === "number" && Number.isFinite(r) ? r : null;
}

/**
 * fantasypoints `Qfe` — sum points for every threshold the value clears.
 *
 * `e.reduce((n, a) => y6(a.key, t) >= a.target ? n + a.points : n, 0)` then `f6`.
 *
 * INCOMPLETE: `y6` (the value lookup by key) and `f6` (the wrapper) are unreadable.
 * The threshold comparison and the sum are visible and reproduced.
 */
export function fantasypointsThresholdSum(
  thresholds: readonly { readonly target: number; readonly points: number }[],
  valueFor: (index: number) => number,
): number {
  return thresholds.reduce((n, a, i) => (valueFor(i) >= a.target ? n + a.points : n), 0);
}

/** Registry of every fragment above, with its completeness mark. */
export const FRAGMENTS: readonly Fragment[] = [
  { host: "fantasypoints.com", visibleName: "Xm", what: "linear decay to a 0.12 floor", completeness: "complete", unknown: null },
  { host: "fantasypoints.com", visibleName: "Mc", what: "deterministic value in range from a hash mod 10007", completeness: "incomplete", unknown: "Yo (hash helper)" },
  { host: "fantasypoints.com", visibleName: "vt", what: "Mc with zero decimals", completeness: "incomplete", unknown: "Yo (hash helper)" },
  { host: "fantasypoints.com", visibleName: "epe", what: "pro-rate a total by seconds against a 3600 s cap", completeness: "complete", unknown: null },
  { host: "fantasypoints.com", visibleName: "dF", what: "name-match rank 0/1/2/null", completeness: "complete", unknown: null },
  { host: "fantasypoints.com", visibleName: "Dwe", what: "rank assets by match then mvs, take N", completeness: "complete", unknown: null },
  { host: "fantasypoints.com", visibleName: "pwe", what: "finite rank or null", completeness: "incomplete", unknown: "ome (record lookup)" },
  { host: "fantasypoints.com", visibleName: "Qfe", what: "sum points for cleared thresholds", completeness: "incomplete", unknown: "y6 (value lookup), f6 (wrapper)" },
];

/** Hosts whose surviving functions were framework internals, not proprietary logic. */
export const FRAGMENT_FRAMEWORK_HOSTS: readonly string[] = ["thepowerrank.com"];
