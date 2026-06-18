import { db } from "@sports/db";
import {
  edgeSignificance,
  type SignificanceResult,
} from "@sports/prediction-engine";
import { buildH2hMarketRead } from "@/lib/market/game-market-read";

/**
 * Edge-significance loader — does the model's settled win record beat a no-edge
 * null, or is it luck?
 *
 * This wires the engine's `edgeSignificance` Monte-Carlo permutation test
 * (packages/prediction-engine/src/edge-significance.ts) to REAL settled,
 * canonical picks. Under the null, each pick only wins with its no-edge
 * (market-implied) probability; the test asks how often a no-edge baseline
 * would have produced at least as many wins as the model actually got.
 *
 * Honesty discipline (CLAUDE.md #1/#2/#5):
 *   - Gated behind `canExposePerformanceStats` AND a minimum decided sample.
 *     Below the gate we return `null` so the surface renders an honest empty
 *     state — never a fabricated p-value.
 *   - Canonical only: isBootstrap=false, isPublished=true, the seed model
 *     version excluded — the same filter as the proof-of-record ledger.
 *   - The null probability is REAL, not assumed:
 *       · MONEYLINE picks with a multi-book H2H consensus use the market's
 *         vig-free implied probability of the chosen side.
 *       · SPREAD/TOTAL picks are priced to ~50% by construction, so their
 *         honest no-edge null is 0.5 (the breakeven before margin).
 *   - PUSH/VOID are excluded from the decided sample (no win/loss to test).
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface EdgeSignificanceReport {
  /** The permutation-test result over the decided canonical sample. */
  readonly result: SignificanceResult;
  /** ISO timestamp the report was assembled (freshness stamp). */
  readonly generatedAt: string;
  /**
   * How many of the decided picks had a real multi-book market null vs the
   * 0.5 construction null. Surfaced so the reader sees the basis honestly.
   */
  readonly marketNullCount: number;
  readonly constructionNullCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Odds rows fetched per game to build the consensus null (bounded). */
const ODDS_ROWS_PER_GAME = 60;
/** Bounded read — large enough to cover the public record. */
const MAX_DECIDED = 500;
/** Construction null for spread/total picks priced to ~50%. */
const CONSTRUCTION_NULL = 0.5;

// ── Loader ────────────────────────────────────────────────────────────────────

export interface LoadEdgeSignificanceInput {
  readonly canExposePerformanceStats: boolean;
  /** Minimum DECIDED canonical picks before a verdict may be published. */
  readonly minDecidedForPublic: number;
}

/**
 * Returns the edge-significance report, or `null` when the gate is closed or
 * the decided sample is too small to be honest. Callers render an explicit
 * empty/gated state on `null` — they must never invent a number.
 */
export async function loadEdgeSignificance(
  input: LoadEdgeSignificanceInput,
  now = new Date()
): Promise<EdgeSignificanceReport | null> {
  if (!input.canExposePerformanceStats) return null;

  const minDecided = Math.max(1, input.minDecidedForPublic);

  const settled = await db.pick
    .findMany({
      where: {
        result: { in: ["WIN", "LOSS"] },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: {
        id: true,
        pickType: true,
        selection: true,
        result: true,
        game: {
          select: {
            homeTeamName: true,
            odds: {
              where: { market: "H2H" },
              orderBy: { fetchedAt: "desc" },
              take: ODDS_ROWS_PER_GAME,
            },
          },
        },
      },
      orderBy: { settledAt: "desc" },
      take: MAX_DECIDED,
    })
    .catch(() => []);

  if (settled.length < minDecided) return null;

  let marketNullCount = 0;
  let constructionNullCount = 0;

  const picks = settled.map((pick) => {
    const won = pick.result === "WIN";
    let nullProb = CONSTRUCTION_NULL;

    if (pick.pickType === "MONEYLINE") {
      const oddsRows = (pick.game?.odds ?? []).map((o) => ({
        bookmaker: o.bookmaker,
        market: String(o.market),
        fetchedAt: o.fetchedAt,
        homePrice: o.homePrice,
        awayPrice: o.awayPrice,
        drawPrice: o.drawPrice,
      }));
      const consensus = buildH2hMarketRead(oddsRows)?.consensus ?? null;
      if (consensus) {
        const pickedHome =
          pick.game?.homeTeamName != null &&
          pick.selection.startsWith(pick.game.homeTeamName);
        nullProb = pickedHome ? consensus.fairHomeProb : consensus.fairAwayProb;
        marketNullCount += 1;
      } else {
        constructionNullCount += 1;
      }
    } else {
      // SPREAD / TOTAL — priced to ~50% by construction.
      constructionNullCount += 1;
    }

    return { won, nullProb };
  });

  const result = edgeSignificance(picks);

  return {
    result,
    generatedAt: now.toISOString(),
    marketNullCount,
    constructionNullCount,
  };
}
