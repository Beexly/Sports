/**
 * Odds API historical backfill — core mapping + planning logic.
 *
 * WHY. Calibration needs opening and closing lines for past games. The live
 * ingest only captures the present, so `OddsLineSnapshot` has no OPEN/CLOSE
 * history for games that commenced before wiring. The Odds API's
 * `/historical/sports/{sport}/odds` endpoint returns every game's odds as of
 * an arbitrary past timestamp — one call per timestamp covers all games.
 *
 * COST DISCIPLINE (Garrett, 2026-10-01: authorized to use the paid quota, but
 * he does not want to keep paying — be efficient):
 * - One historical-odds call per (game, phase) needed — 2 per game max
 *   (OPEN at commence−7d, CLOSE at commence−1h).
 * - Games already holding both phases are skipped before any call.
 * - Moneylines skipped (same convention as the line-movement observer).
 * - The route (not this module) enforces the credit governor and the
 *   reservePaidCallSlot pacing; this module never touches the network.
 *
 * SHAPE. One `OddsLineSnapshot`-shaped row per bookmaker per market per side,
 * matching live ingestion. `capturedAt` is the snapshot's as-of timestamp.
 */
import type { OddsApiEvent } from "@sports/types";

export type BackfillPhase = "OPEN" | "CLOSE";

/** A row ready for `OddsLineSnapshot` upsert (gameId resolved by the caller). */
export interface BackfillSnapshotRow {
  gameId: string;
  capturedAt: Date;
  phase: BackfillPhase;
  book: string;
  market: "SPREAD" | "TOTAL";
  side: string;
  price: number;
  line: number | null;
  source: string;
}

export const BACKFILL_SOURCE = "odds-api-historical";
export const OPEN_LEAD_DAYS = 7;
export const CLOSE_LEAD_HOURS = 1;

/** The as-of timestamp for a phase: open = a week before kickoff, close = an hour before. */
export function phaseTimestamp(commenceTime: Date, phase: BackfillPhase): Date {
  const t = commenceTime.getTime();
  return new Date(
    phase === "OPEN" ? t - OPEN_LEAD_DAYS * 24 * 3_600_000 : t - CLOSE_LEAD_HOURS * 3_600_000,
  );
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Map one historical event's bookmakers into snapshot rows for a phase.
 * Returns [] when the event carries no usable spread/total markets.
 */
export function mapHistoricalEventToRows(
  event: OddsApiEvent,
  gameId: string,
  phase: BackfillPhase,
  asOf: Date,
): BackfillSnapshotRow[] {
  const rows: BackfillSnapshotRow[] = [];
  for (const book of event.bookmakers ?? []) {
    const bookKey = typeof book.key === "string" && book.key.length > 0 ? book.key : null;
    if (!bookKey) continue;
    for (const market of book.markets ?? []) {
      const key = market.key;
      if (key !== "spreads" && key !== "totals") continue;
      const snapshotMarket = key === "spreads" ? "SPREAD" : "TOTAL";
      for (const outcome of market.outcomes ?? []) {
        const price = outcome.price;
        const line = outcome.point;
        if (!isFiniteNumber(price)) continue;
        if (!isFiniteNumber(line)) continue;
        const side =
          typeof outcome.name === "string" && outcome.name.length > 0 ? outcome.name : "?";
        rows.push({
          gameId,
          capturedAt: asOf,
          phase,
          book: bookKey,
          market: snapshotMarket,
          side,
          price,
          line,
          source: BACKFILL_SOURCE,
        });
      }
    }
  }
  return rows;
}

export interface BackfillPlanItem {
  gameId: string;
  externalId: string;
  commenceTime: Date;
  phases: BackfillPhase[];
}

export interface BackfillPlanInput {
  gameId: string;
  externalId: string;
  commenceTime: Date;
  /** Phases already present for this game (from OddsLineSnapshot). */
  existingPhases: readonly string[];
}

/**
 * Plan which (game, phase) pairs still need backfill. A game is skipped when
 * it already holds both phases. Pure — the route does the fetching.
 */
export function planBackfill(games: readonly BackfillPlanInput[]): BackfillPlanItem[] {
  const out: BackfillPlanItem[] = [];
  for (const g of games) {
    const phases: BackfillPhase[] = [];
    if (!g.existingPhases.includes("OPEN")) phases.push("OPEN");
    if (!g.existingPhases.includes("CLOSE")) phases.push("CLOSE");
    if (phases.length > 0) {
      out.push({
        gameId: g.gameId,
        externalId: g.externalId,
        commenceTime: g.commenceTime,
        phases,
      });
    }
  }
  return out;
}

/** Estimated paid calls for a plan (one historical-odds call per phase). */
export function estimateCalls(plan: readonly BackfillPlanItem[]): number {
  return plan.reduce((n, item) => n + item.phases.length, 0);
}
