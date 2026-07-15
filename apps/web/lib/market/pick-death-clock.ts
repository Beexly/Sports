/**
 * Pick Death Clock — how the market has moved on a pick since it was
 * published, from real captured odds rows only.
 *
 * Speaks PRICE SPACE exclusively (points): the
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
 *   - direction and movement use median references, while the displayed
 *     endpoints remain real executable quotes from the captured books
 *   - moneylines fail closed because their truthful median reference is an
 *     implied-probability value, not an American-price delta
 */

import {
  buildMarketPointConsensus,
  normalizeMarketPoint,
} from "@sports/types";

export interface PickForClock {
  readonly pickType: string; // SPREAD | TOTAL | MONEYLINE (H2H treated as MONEYLINE)
  readonly selection: string; // e.g. "Chiefs -3.5", "OVER 48.5"
  readonly generatedAt: Date;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly sport: string;
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

export type ClockMetric = "spread_points" | "total_points";
export type ClockDirection = "toward_pick" | "away_from_pick" | "flat";

export interface PickDeathClock {
  readonly metric: ClockMetric;
  /** Observed executable quote nearest the publish-time median reference. */
  readonly atPublish: number;
  /** Observed executable quote nearest the latest median reference. */
  readonly latest: number;
  /** Publish-time median used for aggregation; it may be non-executable. */
  readonly referenceAtPublish: number;
  /** Latest median used for aggregation; it may be non-executable. */
  readonly referenceLatest: number;
  /** referenceLatest − referenceAtPublish, signed point units. */
  readonly delta: number;
  readonly direction: ClockDirection;
  readonly minutesSincePublish: number;
  /** Absolute median-reference movement per hour, point units, 2dp. */
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

  const atPublishValues: number[] = [];
  const latestValues: number[] = [];
  let latestCapture: Date | null = null;
  for (const bookmaker of shared) {
    const beforeRow = before.get(bookmaker);
    const afterRow = after.get(bookmaker);
    if (!beforeRow || !afterRow) return null;
    const beforeValue = plan.value(beforeRow);
    const afterValue = plan.value(afterRow);
    if (beforeValue === null || afterValue === null) return null;
    atPublishValues.push(beforeValue);
    latestValues.push(afterValue);
    if (!latestCapture || afterRow.fetchedAt > latestCapture) {
      latestCapture = afterRow.fetchedAt;
    }
  }

  const atPublishConsensus = plan.consensus(atPublishValues);
  const latestConsensus = plan.consensus(latestValues);
  if (!atPublishConsensus || !latestConsensus || !latestCapture) return null;
  const delta = Number(
    (latestConsensus.reference - atPublishConsensus.reference).toFixed(2),
  );

  const direction: ClockDirection =
    Math.abs(delta) <= FLAT_EPS
      ? "flat"
      : delta * plan.towardSign > 0
        ? "toward_pick"
        : "away_from_pick";

  const minutes = Math.max(
    0,
    Math.round((now.getTime() - pick.generatedAt.getTime()) / 60_000),
  );
  const hours = Math.max(minutes / 60, 1 / 60);

  return {
    metric: plan.metric,
    atPublish: Number(atPublishConsensus.executable.toFixed(2)),
    latest: Number(latestConsensus.executable.toFixed(2)),
    referenceAtPublish: Number(atPublishConsensus.reference.toFixed(2)),
    referenceLatest: Number(latestConsensus.reference.toFixed(2)),
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
  readonly consensus: (values: readonly number[]) => ClockConsensus | null;
  /** Sign of delta that means the market moved TOWARD the pick's side. */
  readonly towardSign: 1 | -1;
}

interface ClockConsensus {
  readonly reference: number;
  readonly executable: number;
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
      value: (r) => normalizeMarketPoint("TOTAL_POINTS", pick.sport, r.total)?.normalized ?? null,
      consensus: (values) => {
        const consensus = buildMarketPointConsensus("TOTAL_POINTS", pick.sport, values);
        return consensus
          ? { reference: consensus.reference, executable: consensus.executable }
          : null;
      },
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
      value: (r) => normalizeMarketPoint("SPREAD_POINTS", pick.sport, r.spread)?.normalized ?? null,
      consensus: (values) => {
        const consensus = buildMarketPointConsensus("SPREAD_POINTS", pick.sport, values);
        return consensus
          ? { reference: consensus.reference, executable: consensus.executable }
          : null;
      },
      towardSign: side === "home" ? -1 : 1,
    };
  }

  if (type === "MONEYLINE" || type === "H2H") {
    // American-price distance is discontinuous at pick'em. The shared odds
    // consensus therefore uses implied probability as its reference, which
    // cannot truthfully populate this point-unit clock contract.
    return null;
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
