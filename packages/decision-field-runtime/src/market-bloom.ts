/**
 * MARKET BLOOM — markets are living organisms with a lifecycle.
 *
 * Scores24 shows an odds table. GSE shows the market's life: when it was born, how it broadened, when it
 * moved, when it caught up to fair, when it went stale, when it closed. A market's stage caps what a
 * decision may do with it — and market BIRTH alone can never create a public action. Fixture-only.
 *
 * Pure + deterministic. Spec: docs/product/MARKET_BLOOM.md.
 */

import type { DecisionState } from "./decision-state.js";

export type MarketBloomStage = "UNBORN" | "OPENED" | "THIN" | "BROADENING" | "MATURE" | "MOVING" | "CAUGHT_UP" | "STALE" | "CLOSED";

export interface MarketBloomInput {
  readonly eventId: string;
  readonly sport: string;
  readonly marketKey: string;
  readonly bookCount: number;
  readonly minutesSinceUpdate: number;
  readonly priceMovedRecently: boolean;
  /** Did the price move past the fair/no-vig estimate (edge gone)? */
  readonly caughtUpToFair: boolean;
  readonly closed: boolean;
  readonly firstSeenLabel?: string;
}

export interface MarketBloomRecord {
  readonly eventId: string;
  readonly sport: string;
  readonly marketKey: string;
  readonly bookCount: number;
  readonly minutesSinceUpdate: number;
  readonly stage: MarketBloomStage;
  readonly maturityScore: number; // 0..1
  readonly suppressesAction: boolean;
  readonly note: string;
  readonly fixtureWatermarked: true;
}

const STALE_MINUTES = 30;
const MATURE_BOOKS = 5;
const BROADENING_BOOKS = 3;

export function classifyMarketBloomStage(i: MarketBloomInput): MarketBloomStage {
  if (i.closed) return "CLOSED";
  if (i.bookCount <= 0) return "UNBORN";
  if (i.minutesSinceUpdate > STALE_MINUTES) return "STALE";
  if (i.caughtUpToFair) return "CAUGHT_UP";
  if (i.priceMovedRecently) return "MOVING";
  if (i.bookCount >= MATURE_BOOKS) return "MATURE";
  if (i.bookCount >= BROADENING_BOOKS) return "BROADENING";
  if (i.bookCount >= 1) return "THIN";
  return "OPENED";
}

/** What a market stage permits a decision to do. Market birth/thinness NEVER reaches an action. */
export function marketBloomToDecisionState(stage: MarketBloomStage): DecisionState {
  switch (stage) {
    case "CAUGHT_UP":
      return "TOO_LATE"; // the edge has been priced in
    case "STALE":
      return "NEEDS_LIVE_DATA"; // can't act on a stale price
    case "CLOSED":
      return "TOO_LATE";
    case "UNBORN":
    case "OPENED":
    case "THIN":
      return "WATCHLIST"; // a thin/young market is watch-only, never an action
    case "BROADENING":
    case "MOVING":
      return "WATCHLIST";
    case "MATURE":
      return "WATCHLIST"; // maturity is context; an action needs the full decision, not just the market
  }
}

export function buildMarketBloomRecord(i: MarketBloomInput): MarketBloomRecord {
  const stage = classifyMarketBloomStage(i);
  const maturityScore = Math.max(0, Math.min(1, Math.round((i.bookCount / MATURE_BOOKS) * 100) / 100));
  const suppressesAction = stage === "STALE" || stage === "CAUGHT_UP" || stage === "CLOSED";
  const note =
    stage === "STALE" ? "Price is stale — no action on an old number."
    : stage === "CAUGHT_UP" ? "The market has absorbed the edge — likely too late."
    : stage === "CLOSED" ? "Market closed/settled."
    : stage === "THIN" || stage === "OPENED" || stage === "UNBORN" ? "Young/thin market — watch only, never an action on birth alone."
    : stage === "MATURE" ? "Broad, mature market — good context; an action still needs the full decision."
    : "Market is broadening/moving — watch.";
  return { eventId: i.eventId, sport: i.sport, marketKey: i.marketKey, bookCount: i.bookCount, minutesSinceUpdate: i.minutesSinceUpdate, stage, maturityScore, suppressesAction, note, fixtureWatermarked: true };
}

// ───────────────────────── Fixtures (Ecuador-Germany odds lifecycle, illustrative) ─────────────────────────
export const MARKET_BLOOM_FIXTURES: readonly MarketBloomInput[] = [
  { eventId: "fixture-soccer-ecu-ger-2026", sport: "soccer", marketKey: "match_result", bookCount: 7, minutesSinceUpdate: 4, priceMovedRecently: false, caughtUpToFair: false, closed: false },
  { eventId: "fixture-soccer-ecu-ger-2026", sport: "soccer", marketKey: "corners_over_9_5", bookCount: 2, minutesSinceUpdate: 6, priceMovedRecently: false, caughtUpToFair: false, closed: false },
  { eventId: "fixture-soccer-ecu-ger-2026", sport: "soccer", marketKey: "ecuador_handicap", bookCount: 1, minutesSinceUpdate: 50, priceMovedRecently: false, caughtUpToFair: false, closed: false },
  { eventId: "fixture-soccer-ecu-ger-2026", sport: "soccer", marketKey: "germany_tt_under_2_5", bookCount: 5, minutesSinceUpdate: 2, priceMovedRecently: true, caughtUpToFair: true, closed: false },
];

export function buildAllMarketBloomRecords(): readonly MarketBloomRecord[] {
  return MARKET_BLOOM_FIXTURES.map(buildMarketBloomRecord);
}
