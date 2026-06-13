/**
 * Pick Death Clock — how the market has moved on a pick since it was
 * published, from real captured odds rows only.
 *
 * Speaks PRICE SPACE exclusively (points and American prices): the
 * audit-drawer contract bans fair-probability/EV terms on pick surfaces
 * until the owner lifts that gate, so this module never de-vigs and never
 * names an edge. "Toward" / "away" is movement relative to the pick's side
 * — a factual market description, not a value claim. No time-to-zero is
 * computed: that would require an edge definition, which stays gated.
 *
 * Honesty rules:
 *   - null when fewer than 2 books have a quote BOTH at/before publish and
 *     after it — a one-book move is noise wearing a trend costume
 *   - only books present at both ends compare; book composition can't fake
 *     a move
 *   - medians across books, so one stale book cannot drag the clock
 */

export interface PickForClock {
  readonly pickType: string; // SPREAD | TOTAL | MONEYLINE (H2H treated as MONEYLINE)
  readonly selection: string; // e.g. "Chiefs -3.5", "OVER 48.5"
  readonly generatedAt: Date;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
}

export interface OddsRowForClock {
  readonly bookmaker: string;
  readonly market: string;
  readonly fetchedAt: Date;
  readonly spread: number | null; // home-perspective points
  readonly total: number | null;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
}

export type ClockMetric = "spread_points" | "total_points" | "moneyline_price";
export type ClockDirection = "toward_pick" | "away_from_pick" | "flat";

export interface PickDeathClock {
  readonly metric: ClockMetric;
  /** Median across books at/just before publish, in market units. */
  readonly atPublish: number;
  /** Median across the same books' latest quotes. */
  readonly latest: number;
  /** latest − atPublish, signed, market units (points or American price). */
  readonly delta: number;
  readonly direction: ClockDirection;
  readonly minutesSincePublish: number;
  /** Absolute movement per hour since publish, market units, 2dp. */
  readonly ratePerHour: number;
  readonly booksUsed: number;
  readonly latestCaptureAt: string;
}

const FLAT_EPS = 1e-9;

export function buildPickDeathClock(
  pick: PickForClock,
  rows: readonly OddsRowForClock[],
  now = new Date(),
): PickDeathClock | null {
  const plan = metricPlan(pick);
  if (!plan) return null;

  // Per book: the last row at/before publish, and the last row after it.
  const before = new Map<string, OddsRowForClock>();
  const after = new Map<string, OddsRowForClock>();
  for (const row of rows) {
    if (row.market !== plan.market) continue;
    if (plan.value(row) === null) continue;
    const bucket = row.fetchedAt <= pick.generatedAt ? before : after;
    const existing = bucket.get(row.bookmaker);
    if (!existing || row.fetchedAt > existing.fetchedAt) {
      bucket.set(row.bookmaker, row);
    }
  }

  const shared = [...before.keys()].filter((b) => after.has(b));
  if (shared.length < 2) return null;

  const atPublish = median(shared.map((b) => plan.value(before.get(b)!)!));
  const latest = median(shared.map((b) => plan.value(after.get(b)!)!));
  const delta = Number((latest - atPublish).toFixed(2));

  const direction: ClockDirection =
    Math.abs(delta) <= FLAT_EPS
      ? "flat"
      : delta * plan.towardSign > 0
        ? "toward_pick"
        : "away_from_pick";

  const latestCapture = shared
    .map((b) => after.get(b)!.fetchedAt)
    .reduce((max, d) => (d > max ? d : max));
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - pick.generatedAt.getTime()) / 60_000),
  );
  const hours = Math.max(minutes / 60, 1 / 60);

  return {
    metric: plan.metric,
    atPublish: Number(atPublish.toFixed(2)),
    latest: Number(latest.toFixed(2)),
    delta,
    direction,
    minutesSincePublish: minutes,
    ratePerHour: Number((Math.abs(delta) / hours).toFixed(2)),
    booksUsed: shared.length,
    latestCaptureAt: latestCapture.toISOString(),
  };
}

interface MetricPlan {
  readonly metric: ClockMetric;
  readonly market: string;
  readonly value: (row: OddsRowForClock) => number | null;
  /** Sign of delta that means the market moved TOWARD the pick's side. */
  readonly towardSign: 1 | -1;
}

function metricPlan(pick: PickForClock): MetricPlan | null {
  const type = pick.pickType.toUpperCase();
  const sel = pick.selection.toUpperCase();

  if (type === "TOTAL") {
    const over = sel.includes("OVER");
    const under = sel.includes("UNDER");
    if (!over && !under) return null;
    // OVER: total rising = market agrees; UNDER: falling = market agrees.
    return {
      metric: "total_points",
      market: "TOTALS",
      value: (r) => (isNum(r.total) ? r.total : null),
      towardSign: over ? 1 : -1,
    };
  }

  if (type === "SPREAD") {
    const side = pickSide(pick);
    if (!side) return null;
    // spread is home-perspective: falling (−3.5 → −4.5) = toward a home pick.
    return {
      metric: "spread_points",
      market: "SPREADS",
      value: (r) => (isNum(r.spread) ? r.spread : null),
      towardSign: side === "home" ? -1 : 1,
    };
  }

  if (type === "MONEYLINE" || type === "H2H") {
    const side = pickSide(pick);
    if (!side) return null;
    // American prices are monotone with decimal odds across the book-quoted
    // range, so the side's price FALLING means it shortened = market agrees.
    return {
      metric: "moneyline_price",
      market: "H2H",
      value: (r) => {
        const p = side === "home" ? r.homePrice : r.awayPrice;
        return isNum(p) && p !== 0 ? p : null;
      },
      towardSign: -1,
    };
  }

  return null;
}

function pickSide(pick: PickForClock): "home" | "away" | null {
  const sel = pick.selection.toUpperCase();
  const home = pick.homeTeamName.toUpperCase();
  const away = pick.awayTeamName.toUpperCase();
  // Match the longer name first so "LA Clippers" never matches "LA".
  const ordered: Array<["home" | "away", string]> =
    home.length >= away.length
      ? [["home", home], ["away", away]]
      : [["away", away], ["home", home]];
  for (const [side, name] of ordered) {
    if (name.length > 0 && sel.includes(name)) return side;
  }
  return null;
}

function isNum(x: number | null): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
