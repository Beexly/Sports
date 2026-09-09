/**
 * Free/signal slate generation — NO THE_ODDS_API_KEY required.
 *
 * Builds MONEYLINE model-signal picks from independent fair values only
 * (Kalshi / FPI / ClubElo / Poisson / Dixon–Coles / Elo). Never invents book
 * odds or book labels. Opens signal board when market odds are ABSENT/stale.
 *
 * Law: free-path ABSENT-only for books · rankingP = independent trueProb ·
 * no PROVEN · no PERFORMANCE_STATS flip · maps OFF.
 */

import { db } from "@sports/db";
import {
  getReadinessGates,
  MODEL_VERSION,
  MIN_PUBLISH_CONFIDENCE,
  PREMIUM_CONFIDENCE_THRESHOLD,
  resolvePublishTimeMarketP,
  type OddsRowForMarketP,
  type PublishTimeMarketPResult,
} from "@sports/prediction-engine";
import {
  NO_MARKET_REFERENCE,
  anchorFreshness,
  signalDecision,
  signalEdgeFields,
  signalFactorDescription,
  signalRationale,
  signalReasoning,
} from "./signal-market-anchor.js";
import type {
  FactorBreakdown,
  IndependentEdgeSummary,
  IndependentMarketFairValue,
} from "@sports/types";
import { buildIndependentFairValues } from "./build-independent-fair-values.js";
import {
  FixtureConfirmer,
  formatFixtureLine,
  type FixtureBatchResult,
  type FixtureProbe,
} from "./fixture-confirmation.js";
import { collapseGameRowsToFixtures } from "./fixture-collapse.js";

/**
 * Rows read from `games` before the per-fixture collapse. Sized well above the
 * window's real row count (744 measured on 2026-09-08 across a 21d horizon) so
 * the collapse, not this number, decides the slate; a run that fills it says so
 * in the log rather than silently shortening the board.
 */
const SLATE_SCAN_LIMIT = 1000;

/** Fixtures actually slated, applied AFTER the collapse. */
const SLATE_FIXTURE_LIMIT = 80;

export type SignalSlateResult = {
  readonly ok: boolean;
  readonly gamesConsidered: number;
  readonly candidatesWithIndependents: number;
  readonly picksUpserted: number;
  readonly picksSkipped: number;
  /**
   * Games skipped by the fixture confirmation guard (C-111): not listed on the
   * day's free ESPN scoreboard, or the board could not be fetched (fail-closed).
   */
  readonly fixtureUnconfirmed: number;
  /**
   * C-253. Picks written with a real de-vigged market anchor from the stored
   * odds table, and how many of those came from a single book. Reported
   * separately and never summed into one number, because one book is below the
   * floor a board-priced pick requires. `picksUpserted - marketAnchored` is the
   * count still measuring its edge against a coin flip.
   */
  readonly marketAnchored: number;
  readonly marketAnchoredSingleBook: number;
  /**
   * Set when the one odds read for the slate threw, so EVERY pick this cycle is
   * unanchored for an infrastructure reason rather than because no market
   * existed. Deliberately not an `errors` entry: the slate still published what
   * it meant to publish. A reader that treats `marketAnchored: 0` as "no market
   * existed" without checking this field would draw the wrong conclusion.
   */
  readonly marketAnchorReadError: string | null;
  /** Per-pick resolver throws. Each cost one pick its anchor, none cost a pick. */
  readonly marketAnchorResolveFailures: number;
  /** Anchors resolved but refused as too old, or blended from books too far apart in time. */
  readonly marketAnchorRejectedStale: number;
  readonly errors: readonly string[];
  readonly note: string;
};

function clamp01(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** Marker suffix every signal-slate selection carries; a row without it was priced by a book. */
export const SIGNAL_SELECTION_SUFFIX = "(model signal)";

/**
 * True only for a row this path wrote itself: signal selection AND no book behind it.
 * A book-priced MONEYLINE row (process-sport.ts) carries the book price in its selection,
 * bookmakerCount >= MIN_BOOKMAKERS, a real marketFairProb and an immutable proof receipt
 * committing to all three. The signal path may create when no row exists and refresh
 * its own rows; it must never rewrite a book-priced pick.
 */
export function isSignalSlateRow(row: {
  readonly selection: string;
  readonly bookmakerCount: number;
}): boolean {
  return row.selection.endsWith(SIGNAL_SELECTION_SUFFIX) && row.bookmakerCount === 0;
}

/**
 * Teaser line for viewers who cannot see confidence. It carries no probability:
 * the independent estimate is uncalibrated (maps OFF), single-source in most
 * rows, and its >= 80 tail is measured inverted, so "@ 68%" read as a win
 * probability was a claim the calibration surface does not cover.
 */
export function buildSignalReasoningShort(chosenTeam: string, sourcesLabel: string): string {
  return `${chosenTeam} model signal (${sourcesLabel}). Independent estimate, not a book price.`;
}

/** Pure blend of independent home fair probs (exported for unit tests). */
/**
 * Equal-then-sharpness blend of independent home fair probs.
 * Soft sources near 0.5 no longer drown exchange/standings extremes (RES lift).
 * After blend, mild stretch from 0.5 (×1.2) when sources agree on side —
 * preserves polarity, increases discrimination. Never invents empty → null.
 */
export function blendIndependentHomeFair(
  values: readonly IndependentMarketFairValue[],
): { homeP: number; sources: string[] } | null {
  const pairs: { h: number; s: string; w: number }[] = [];
  for (const v of values) {
    const h = v.homeFairProb;
    const a = v.awayFairProb;
    if (h == null || a == null || !Number.isFinite(h) || !Number.isFinite(a)) continue;
    if (h < 0 || h > 1 || a < 0 || a > 1) continue;
    const sum = h + a;
    if (!(sum > 0)) continue;
    const hn = h / sum;
    // Sharpness weight: |p−0.5| + floor so every real source still votes a little.
    // Kalshi / standings / FPI get more say than near-coin-flip Elo/Poisson.
    const w = Math.abs(hn - 0.5) + 0.05;
    pairs.push({ h: hn, s: v.source, w });
  }
  if (pairs.length === 0) return null;
  const wSum = pairs.reduce((s, x) => s + x.w, 0);
  if (!(wSum > 0)) return null;
  let homeP = pairs.reduce((s, x) => s + x.h * x.w, 0) / wSum;

  // Mild discrimination stretch when net not a coin flip (model definition, not map).
  // ×1.12 from 0.5 (was 1.25 — overconfident, ECE/Brier tax). Polarity preserved.
  if (Math.abs(homeP - 0.5) >= 0.03) {
    homeP = 0.5 + (homeP - 0.5) * 1.12;
  }

  return { homeP: clamp01(homeP), sources: pairs.map((p) => p.s) };
}

function pickGradeFromConfidence(confidence: number): "STRONG_PLAY" | "SOLID_PLAY" | "LEAN" {
  if (confidence >= 80) return "STRONG_PLAY";
  if (confidence >= 65) return "SOLID_PLAY";
  return "LEAN";
}

/**
 * Generate model-signal MONEYLINE picks for upcoming games using independents only.
 */
export async function generateSignalSlate(opts?: {
  readonly horizonHours?: number;
  readonly logPrefix?: string;
  readonly now?: Date;
  /** When true, do not call ESPN seed (board-fill already seeded). */
  readonly skipSeed?: boolean;
  /** Injected fetch for the fixture confirmation scoreboard (tests); defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
}): Promise<SignalSlateResult> {
  const logPrefix = opts?.logPrefix ?? "[signal-slate]";
  const now = opts?.now ?? new Date();
  const horizonHours = opts?.horizonHours ?? 504; // 21d signal board (early season)
  const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
  const gates = getReadinessGates();
  const errors: string[] = [];
  let candidatesWithIndependents = 0;
  let picksUpserted = 0;
  let picksSkipped = 0;
  let fixtureUnconfirmed = 0;

  // Cold Game table: seed free ESPN schedule so signals can publish without quote keys.
  if (!opts?.skipSeed) {
    const existing = await db.game.count({
      where: { commenceTime: { gte: now, lte: horizon } },
    });
    if (existing === 0) {
      try {
        const { seedGamesFromEspn } = await import("./seed-games-from-espn.js");
        await seedGamesFromEspn({
          horizonHours,
          logPrefix: `${logPrefix}:auto-seed`,
          now,
        });
      } catch (seedErr) {
        errors.push(
          `espn auto-seed: ${seedErr instanceof Error ? seedErr.message : String(seedErr)}`,
        );
      }
    }
  }

  // BOUNDS ROWS SCANNED, NOT FIXTURES SLATED (C-166).
  //
  // `take: 80` used to be both at once, and the games table holds about 2.5
  // rows per real fixture with none of them tombstoned, so the cap was spent
  // partly on duplicates: measured on production 2026-09-08, 744 rows over 658
  // real fixtures inside this window, the cap reaching only 71 fixtures, 9 of
  // the 80 slots (11%) on duplicate rows. That is a cap applied BEFORE the
  // collapse - the same defect the board's pass lane (C-153) and its withdrawal
  // watermark (C-161) each carried. Scan wide, collapse, then cap on fixtures.
  const scannedGames = await db.game.findMany({
    where: {
      commenceTime: { gte: now, lte: horizon },
      // The database's own canonicity marker. Latent today (zero rows are
      // tombstoned in any sport) and load-bearing the moment the merge runs:
      // without it this lane would keep generating picks on rows the database
      // has marked not-real.
      mergedIntoGameId: null,
    },
    select: {
      id: true,
      externalId: true,
      sportId: true,
      mergedIntoGameId: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      createdAt: true,
      sport: { select: { key: true, name: true } },
      // Feeds the survivor rule, which is selectCanonical's rule and not a new
      // one: most picks, most odds children, non-ESPN externalId, oldest row.
      _count: { select: { picks: true, odds: true, oddsLineSnapshots: true } },
    },
    orderBy: { commenceTime: "asc" },
    take: SLATE_SCAN_LIMIT,
  });
  const collapsedGames = collapseGameRowsToFixtures(scannedGames);
  const gameList = collapsedGames.slice(0, SLATE_FIXTURE_LIMIT);

  // C-253: one read of the append-only odds table for the whole slate, so a
  // pick that HAS a stored market price stops being published as if it had
  // none. Measured before this change: 232 of 387 published signal moneylines
  // had a real two-sided book row for their fixture at or before their own
  // generatedAt, and every one of them was written with marketFairProb null.
  // Rows after `now` are never read - the anchor is fixed at publish time, not
  // recomputed toward the close - and a failed read degrades to the unanchored
  // path rather than failing the slate.
  let slateOddsRows: OddsRowForMarketP[] = [];
  let marketAnchorReadError: string | null = null;
  let marketAnchorResolveFailures = 0;
  let anchorRejectedStale = 0;
  if (gameList.length > 0) {
    try {
      slateOddsRows = await db.odds.findMany({
        where: {
          gameId: { in: gameList.map((g) => g.id) },
          market: "H2H",
          fetchedAt: { lte: now },
          homePrice: { not: null },
          awayPrice: { not: null },
        },
        select: {
          gameId: true,
          bookmaker: true,
          homePrice: true,
          awayPrice: true,
          fetchedAt: true,
        },
      });
      console.log(
        `${logPrefix} market anchor: ${slateOddsRows.length} stored H2H row(s) at or before ${now.toISOString()} across ${gameList.length} fixture(s)`,
      );
    } catch (err) {
      // NOT an `errors` entry. `errors` drives `ok: false` and the truth
      // surface, and a slate that published every pick it meant to publish did
      // not fail. Losing the anchor degrades what the edge is MEASURED against;
      // the copy on each affected pick then states plainly that no market price
      // was stored. Reported through its own field so it is still visible.
      marketAnchorReadError = err instanceof Error ? err.message : String(err);
      console.warn(
        `${logPrefix} market anchor read failed, every pick this cycle falls back to unanchored: ${marketAnchorReadError}`,
      );
      slateOddsRows = [];
    }
  }
  const oddsByGame = new Map<string, OddsRowForMarketP[]>();
  for (const row of slateOddsRows) {
    const bucket = oddsByGame.get(row.gameId);
    if (bucket) bucket.push(row);
    else oddsByGame.set(row.gameId, [row]);
  }
  let anchoredCount = 0;
  let anchoredSingleBook = 0;
  if (collapsedGames.length !== scannedGames.length) {
    console.log(
      `${logPrefix} collapsed ${scannedGames.length} rows to ${collapsedGames.length} fixtures, slating ${gameList.length}`,
    );
  }
  if (scannedGames.length === SLATE_SCAN_LIMIT) {
    // NO SILENT CAP. If the scan itself filled, fixtures beyond it were never
    // considered and the slate is bounded by the scan rather than by the
    // horizon. Said out loud so it is a number someone can act on.
    console.warn(
      `${logPrefix} scan limit ${SLATE_SCAN_LIMIT} reached inside the ${horizonHours}h horizon; later fixtures were not considered`,
    );
  }

  // Fixture confirmation guard (C-111): a game row's own commenceTime is not
  // proof the contest happens that day. Each sport's games are confirmed in one
  // batch against the free ESPN scoreboard (one fetch per sport per run); a
  // failed fetch skips the whole sport this cycle (fail-closed).
  const confirmer = new FixtureConfirmer({ fetchImpl: opts?.fetchImpl, now });
  const fixtureBatches = new Map<string, Promise<FixtureBatchResult>>();
  const fixtureBatchFor = (sportKey: string): Promise<FixtureBatchResult> => {
    let batch = fixtureBatches.get(sportKey);
    if (!batch) {
      const probes: FixtureProbe[] = gameList
        .filter((g) => (g.sport?.key ?? "unknown") === sportKey)
        .map((g) => ({
          id: g.id,
          homeTeamName: g.homeTeamName,
          awayTeamName: g.awayTeamName,
          commenceTime: g.commenceTime,
          createdAt: g.createdAt,
        }));
      batch = confirmer.confirmBatch(sportKey, probes).then((result) => {
        // A board that cannot be read surfaces in `errors` (ok: false) like
        // every other slate failure, so a sustained ESPN outage is visible to
        // the caller and the truth surface, not only in the log line.
        if (result.status === "fetch_failed") {
          const message = `fixture scoreboard unavailable for ${sportKey}, skipping ${probes.length} games this cycle: ${result.error}`;
          console.warn(`${logPrefix} ${message}`);
          errors.push(message);
        } else if (result.status === "unsupported_sport") {
          const message = `no free ESPN scoreboard for ${sportKey}, skipping ${probes.length} games (cannot confirm fixtures)`;
          console.warn(`${logPrefix} ${message}`);
          errors.push(message);
        }
        return result;
      });
      fixtureBatches.set(sportKey, batch);
    }
    return batch;
  };

  for (const game of gameList) {
    const sportKey = game.sport?.key ?? "unknown";
    // A two-way moneyline on a three-way market overstates P(win): the blend
    // below normalises home/(home+away) and drops the draw mass, while the pick
    // settles a draw as a loss. The book path refuses to publish these
    // (scoring.ts isThreeWayMoneylineSport) and so does this one.
    if (sportKey.toLowerCase().startsWith("soccer")) {
      picksSkipped += 1;
      continue;
    }
    const fixtureBatch = await fixtureBatchFor(sportKey);
    if (fixtureBatch.status !== "ok") {
      picksSkipped += 1;
      fixtureUnconfirmed += 1;
      continue;
    }
    const fixture = fixtureBatch.byGameId.get(game.id);
    if (!fixture || fixture.status !== "confirmed") {
      // A listed contest whose ESPN kickoff is already behind the run clock is
      // skipped for a different reason than an absent one; say which.
      console.warn(
        fixture?.status === "event_already_started"
          ? `${logPrefix} fixture already started per the ESPN ${sportKey} scoreboard (listed ${fixture.event.commenceTime.toISOString()}), no pick: ${formatFixtureLine(game)}`
          : `${logPrefix} fixture not listed on the ESPN ${sportKey} scoreboard for its date, no pick: ${formatFixtureLine(game)}`,
      );
      picksSkipped += 1;
      fixtureUnconfirmed += 1;
      continue;
    }
    let commenceTime = game.commenceTime;
    if (fixture.correctedCommenceTime) {
      // Schedule correction from the free cleared source (see
      // commenceTimeCorrection): ESPN lists the same contest, same day, at a
      // clock more than 15 minutes from ours, and the kickoff is still ahead.
      try {
        await db.game.update({
          where: { id: game.id },
          data: { commenceTime: fixture.correctedCommenceTime },
        });
        console.log(
          `${logPrefix} commenceTime corrected from ESPN for ${formatFixtureLine(game)} -> ${fixture.correctedCommenceTime.toISOString()}`,
        );
        commenceTime = fixture.correctedCommenceTime;
      } catch (err) {
        errors.push(
          `${game.id}: commenceTime correction failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const homeTeam = game.homeTeamName;
    const awayTeam = game.awayTeamName;
    let independents: IndependentMarketFairValue[];
    try {
      independents = await buildIndependentFairValues({
        sportKey,
        homeTeam,
        awayTeam,
        commenceTime,
        now: () => now,
      });
    } catch (err) {
      errors.push(
        `${game.id}: independent build failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      picksSkipped += 1;
      continue;
    }

    if (!independents || independents.length === 0) {
      picksSkipped += 1;
      continue;
    }

    const blend = blendIndependentHomeFair(independents);
    if (!blend) {
      picksSkipped += 1;
      continue;
    }

    candidatesWithIndependents += 1;
    const homeChosen = blend.homeP >= 0.5;
    const trueProb = homeChosen ? blend.homeP : clamp01(1 - blend.homeP);
    const confidence = Math.round(trueProb * 100);
    if (confidence < MIN_PUBLISH_CONFIDENCE) {
      picksSkipped += 1;
      continue;
    }
    // Public selective default δ=0.1 — skip coin-flip signals that would be
    // upserted then filtered to empty on /api/picks.
    if (Math.abs(trueProb - 0.5) < 0.1) {
      picksSkipped += 1;
      continue;
    }

    const chosenTeam = homeChosen ? homeTeam : awayTeam;
    const rankingP = trueProb;
    const pickGrade = pickGradeFromConfidence(confidence);
    const tier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";
    const sources = blend.sources;
    const sourcesLabel = sources.join(", ");

    // C-253. The selection string is built here rather than below because the
    // market anchor is resolved for the SIDE, and the side comes from the
    // selection through the engine's own boundary-aware resolver - the same one
    // settlement and CLV use - not from a second team-matching heuristic.
    const selection = `${chosenTeam} ML ${SIGNAL_SELECTION_SUFFIX}`;
    let anchor: PublishTimeMarketPResult | null = null;
    try {
      anchor = resolvePublishTimeMarketP(
        {
          gameId: game.id,
          generatedAt: now,
          selection,
          homeTeamName: homeTeam,
          awayTeamName: awayTeam,
        },
        oddsByGame.get(game.id) ?? [],
      );
    } catch (err) {
      // A resolver throw must not cost the slate a pick, and it is not a slate
      // failure: it costs THIS pick its anchor, which the copy below then
      // states rather than hides. Counted, logged, and kept out of `errors` for
      // the same reason as the read failure above.
      marketAnchorResolveFailures += 1;
      console.warn(
        `${logPrefix} market anchor resolve failed for ${formatFixtureLine(game)}, pick falls back to unanchored: ${err instanceof Error ? err.message : String(err)}`,
      );
      anchor = null;
    }
    // C-256 (Devin). A book that stopped quoting days ago can still be a
    // bookmaker's "latest row at or before generatedAt", so a stale price could
    // pair with a fresh one and present as a two-book anchor. Checked here
    // rather than in the resolver, which the calibration loader also runs:
    // tightening that would move measured history to fix the instrument.
    const freshness = anchorFreshness(anchor, now);
    if (!freshness.usable) {
      anchorRejectedStale += 1;
      console.warn(
        `${logPrefix} market anchor rejected (${freshness.reason}) for ${formatFixtureLine(game)}, pick falls back to unanchored`,
      );
      anchor = null;
    }
    const edge = signalEdgeFields(trueProb, anchor);
    // C-258 (Devin). edgePts was round((trueProb - 0.5) * 100), computed before
    // the anchor was resolved, and persists as the Edge Index the card renders
    // as a market-relative number. That is the same coin-flip-as-edge the whole
    // C-253 change removed from rawEdge, surviving one field over. It is now
    // the market-relative edge when an anchor backs it, and unchanged otherwise
    // (those rows are already withheld from viewers who cannot see confidence
    // by publicEdgeScore, whose own docblock gives the reason: without a book
    // line it equals confidence minus 50). Negative edges floor at 0 exactly as
    // before, so the field's range does not change.
    const edgePts = edge.anchored
      ? Math.max(0, Math.round(edge.rawEdge * 100))
      : Math.max(0, Math.round((trueProb - NO_MARKET_REFERENCE) * 100));

    const independentEdge: IndependentEdgeSummary = {
      // C-255 (Devin). Was `trueProb >= 0.58` alone, which went on labelling a
      // pick LEAN even when the anchor showed the market prices the side ABOVE
      // our estimate - the product liking a price its own arithmetic just called
      // overpriced. `decision` is a claim label, not a publish gate (nothing
      // reads it to decide what is written or served), so this retracts a claim
      // where the evidence retracts it and moves no gate. Unanchored rows keep
      // the old rule unchanged, because for them nothing has changed.
      decision: signalDecision(trueProb, edge),
      agreement: sources.length >= 2 ? "CONFIRMS" : "SOLO",
      // Still null when nothing was stored: never invent 0.5 into this field.
      // When a real de-vigged book price exists it goes here, with the book
      // count and snapshot beside it so one book is never read as two.
      marketFairProb: edge.marketFairProb,
      trueProb,
      rawEdge: edge.rawEdge,
      shrunkEdge: edge.shrunkEdge,
      marketFairSource: edge.marketFairSource,
      marketBookCount: edge.marketBookCount,
      marketSnapshotAt: edge.marketSnapshotAt,
      expectedClv: 0,
      conviction: Math.min(100, Math.round(trueProb * 100)),
      sources: [...sources],
      priced: true,
      rationale: signalRationale(edge, chosenTeam, sourcesLabel, trueProb),
    };

    const factorBreakdown: FactorBreakdown = {
      consensusScore: 0,
      marketDepthScore: 0,
      edgeScore: edgePts,
      marketPriceShapeScore: 0,
      // C-253. An expected value cannot be computed without a price, and this
      // field previously held `trueProb - 0.5`: a distance from a coin flip
      // wearing the name of an EV. It is now the shrunk edge against a real
      // de-vigged book price when one exists, matching what the board path
      // writes (scoring.ts), and null when no market was stored. Null is the
      // honest value for "no EV is computable here".
      trueEvScore: edge.anchored ? edge.shrunkEdge : null,
      fairProbability: rankingP,
      lineMovementScore: 0,
      volatilityPenalty: 0,
      dataQualityScore: Math.min(100, 60 + independents.length * 15),
      rankingP,
      rankingSource: "independent_trueProb",
      marketFairProb: null,
      independentEdge,
      factors: [
        {
          name: `Independent fair value (${sourcesLabel})`,
          impact: "positive",
          // C-255 (Devin). This was fixed at "No book odds attached." and the
          // pick card renders it beside the rationale, so an anchored pick
          // asserted a de-vigged price and denied one in the same card. Third
          // place the same sentence lived; it now derives from the same
          // SignalEdgeFields as the rationale and the reasoning, so all three
          // cannot disagree.
          description: signalFactorDescription(edge, sourcesLabel, trueProb),
          weight: confidence,
        },
      ],
    };

    // Paid viewers read this verbatim. It states an estimate with its status, and
    // carries no operator vocabulary (RankingP, eligibility colours, ladder names).
    // C-253: it must not say "No book price is attached to this pick" on a pick
    // that now carries a de-vigged stored price, so the wording follows the
    // anchor instead of being fixed.
    const reasoning = signalReasoning(edge, chosenTeam, sourcesLabel, trueProb);
    const reasoningShort = buildSignalReasoningShort(chosenTeam, sourcesLabel);

    try {
      const existing = await db.pick.findUnique({
        where: { gameId_pickType: { gameId: game.id, pickType: "MONEYLINE" } },
        select: { id: true, result: true, selection: true, bookmakerCount: true },
      });

      if (existing && existing.result !== "PENDING") {
        picksSkipped += 1;
        continue;
      }

      // Never overwrite a book-priced pick. refresh-odds and board-fill run this
      // slate in the same tick AFTER refreshOdds, and until 2026-09-05 a same-side
      // book pick fell through to the updateMany below: selection became
      // "X ML (model signal)", line 0, bookmakerCount 0, confidence = trueProb*100,
      // factorBreakdown.marketFairProb null, while the immutable proof receipt
      // still committed the book price and the real market probability. That
      // erased marketFairProb on the only rows that had one (bake-off coverage
      // fell to 34%) and turned the moneyline paywall into a probability threshold.
      if (existing && !isSignalSlateRow(existing)) {
        picksSkipped += 1;
        continue;
      }

      if (
        existing?.selection &&
        existing.selection.includes("ML") &&
        !existing.selection.startsWith(chosenTeam)
      ) {
        console.warn(
          `${logPrefix} SIDE FLIP frozen for ${game.id}: kept "${existing.selection}" vs signal "${selection}"`,
        );
        picksSkipped += 1;
        continue;
      }

      const shared = {
        selection,
        line: 0,
        confidence,
        edgeScore: edgePts,
        consensusPct: trueProb,
        bookmakerCount: 0,
        tier: tier as "FREE" | "PREMIUM",
        pickGrade,
        riskLevel: "MODERATE" as const,
        reasoning,
        reasoningShort,
        factorBreakdown: JSON.parse(JSON.stringify(factorBreakdown)),
        modelVersion: MODEL_VERSION,
        dataFreshnessAt: now,
      };

      // `isPublished` IS NOT IN `shared`, and the asymmetry is the point (C-92).
      //
      // It used to be, so every slate run rewrote the flag on every existing
      // PENDING row. An operator who unpublished a live pick - because it was
      // wrong, or corrupt, or on a line no book quotes - had it SILENTLY
      // RE-PUBLISHED by the next run. Measured on production 2026-09-07:
      // 70 published PENDING moneylines are subject to that today.
      //
      // Create-only would be the obvious fix and it is the WRONG one, because
      // it also removes the gate's power to CLOSE. `canExposePublicPicks` is an
      // honesty boundary: when it goes false, rows that are live must stop
      // being live, and a create-only flag would leave them published forever.
      //
      // So the write is one-directional. Gate CLOSED: force `false`, every run,
      // no exceptions - the boundary keeps its teeth. Gate OPEN: write nothing,
      // because "the gate permits publishing" is not the same statement as
      // "this particular pick should be published", and only the second one is
      // an operator's to make. A pick that was never published stays that way
      // until something deliberately publishes it.
      //
      // THE COST OF THIS, STATED RATHER THAN GLOSSED (Devin Review, #719).
      // One-directional means GATE RECOVERY DOES NOT RESTORE. If
      // canExposePublicPicks closes and later reopens, the rows this code
      // unpublished on the closed runs are NOT republished on the open ones,
      // and because a pick is unique per (gameId, pickType) no new row can
      // replace them - they stay hidden for the rest of their life. That is a
      // real regression against the previous behaviour and it is not free.
      //
      // It is accepted here because the two failures are not symmetric. The old
      // behaviour silently RE-PUBLISHED a pick an operator had withdrawn for
      // being wrong or corrupt, which publishes something known to be false.
      // The new behaviour publishes LESS than it could. Under this product's
      // premise, publishing less is the safe direction and publishing a known
      // falsehood is not.
      //
      // Doing BOTH correctly needs to distinguish "unpublished by the gate"
      // from "unpublished by an operator", and `isPublished` is a bare Boolean
      // with nowhere to record which - so it needs a provenance column, i.e. a
      // schema change, which is founder-gated. Tracked as C-158; the test suite
      // pins the current behaviour so the gap is visible rather than latent.
      const publicationUpdate = gates.canExposePublicPicks
        ? {}
        : { isPublished: false };

      if (existing) {
        // Race-safe update (GSE-SEC-043): scope to result:"PENDING" so a
        // concurrent settle cannot have its freshly-graded result overwritten.
        // Matches the updateMany pattern in settle-sport.ts / free-settlement-runner.ts.
        const updated = await db.pick.updateMany({
          where: { id: existing.id, result: "PENDING" },
          data: {
            ...shared,
            ...publicationUpdate,
            generatedAt: now,
          },
        });
        if (updated.count === 0) {
          // Pick was settled between our findUnique and here — frozen, skip.
          picksSkipped += 1;
          continue;
        }
      } else {
        await db.pick.create({
          data: {
            gameId: game.id,
            pickType: "MONEYLINE",
            ...shared,
            // On CREATE the gate decides outright: there is no prior operator
            // judgement to preserve, so the flag is simply the gate's value.
            isPublished: gates.canExposePublicPicks,
            isBootstrap: !gates.canPersistCanonicalHistory,
            isFeatured: false,
            generatedAt: now,
          },
        });
      }
      // Public /api/picks filters on game.dataQualityScore >= 70 — stamp from
      // independent factor quality so signal path is not invisible by default 0.
      const gameDq = Math.max(
        70,
        Math.min(100, 60 + independents.length * 15),
      );
      await db.game.update({
        where: { id: game.id },
        data: { dataQualityScore: gameDq },
      });
      picksUpserted += 1;
      // C-255 (Devin). These were incremented right after the anchor resolved,
      // BEFORE the settled-row skip, the book-priced skip, the side-flip refusal
      // and this write itself. `marketAnchored` could therefore exceed
      // `picksUpserted` and report coverage for picks that were never written:
      // a count whose label did not match what it counted, which is the exact
      // defect class C-241, C-246, C-250, C-251 and C-252 are. They now advance
      // only on the same line that records a successful upsert, so the ratio
      // marketAnchored/picksUpserted is always over the same population.
      if (edge.anchored) {
        anchoredCount += 1;
        if (edge.marketFairSource === "market_p_single_book") anchoredSingleBook += 1;
      }
    } catch (err) {
      errors.push(
        `${game.id}: upsert failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      picksSkipped += 1;
    }
  }

  const note =
    picksUpserted > 0
      ? `Signal slate: ${picksUpserted} model-signal picks (independents only; no book labels).`
      : `Signal slate empty: ${gameList.length} games, ${candidatesWithIndependents} with independents, none published.`;

  console.log(
    `${logPrefix} ${note}` +
      (fixtureUnconfirmed > 0 ? ` fixtureUnconfirmed=${fixtureUnconfirmed}` : "") +
      ` marketAnchored=${anchoredCount}/${picksUpserted}` +
      (anchoredSingleBook > 0 ? ` (singleBook=${anchoredSingleBook})` : "") +
      (marketAnchorReadError != null ? ` marketAnchorReadFailed` : "") +
      (marketAnchorResolveFailures > 0
        ? ` marketAnchorResolveFailures=${marketAnchorResolveFailures}`
        : "") +
      (anchorRejectedStale > 0 ? ` marketAnchorRejectedStale=${anchorRejectedStale}` : ""),
  );

  return {
    ok: errors.length === 0,
    gamesConsidered: gameList.length,
    candidatesWithIndependents,
    picksUpserted,
    picksSkipped,
    fixtureUnconfirmed,
    marketAnchored: anchoredCount,
    marketAnchoredSingleBook: anchoredSingleBook,
    marketAnchorReadError,
    marketAnchorResolveFailures,
    marketAnchorRejectedStale: anchorRejectedStale,
    errors,
    note,
  };
}
