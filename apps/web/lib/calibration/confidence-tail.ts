/**
 * Confidence-tail monitor — does the model's highest stated confidence earn it?
 *
 * Finding (production read, 2026-09-02, 1,663 graded WIN/LOSS picks; re-read
 * 2026-09-03 on the public population below, identical): every confidence
 * bucket from 80 upward won between 33% and 47% of the time (152 picks, 61
 * wins, 40% overall) while claiming 86% on average. Most of that tail
 * is model v5.0.0/v5.1.0 spread and total picks, but the current versions
 * still emit it (v5.2.6 + v5.2.7: 38 picks at ≥80, 14 wins). A tail that wins
 * less than half the time while claiming more than 80% is not miscalibrated,
 * it is inverted: the score is anti-predictive there. No recalibration map
 * fixes that; it is a model finding for the next calibration proposal.
 *
 * This module only measures it so the ops truth surface and the launch
 * checker show the state honestly every day. It never changes a pick.
 */

export const CONFIDENCE_TAIL_FLOOR = 80;
/** Below this many graded tail picks the verdict is "insufficient", never a claim. */
export const CONFIDENCE_TAIL_MIN_N = 30;

export interface ConfidenceTailRow {
  readonly confidence: number;
  readonly result: "WIN" | "LOSS";
  readonly modelVersion: string;
  /** Market (MONEYLINE / SPREAD / TOTAL). Optional so pure callers can omit it. */
  readonly pickType?: string;
}

/**
 * Per-market rows. Confidence is scored as a stated probability across every
 * market here exactly as `calibration/report.ts` scores the calibration
 * sample (confidence/100 against WIN/LOSS, all pick types), so the headline
 * verdict is comparable with the calibration floors. Spread and total picks
 * are priced near a coin flip, which is why the per-market split is shown:
 * a reader can weigh the moneyline tail on its own.
 */
export interface ConfidenceTailMarketRow {
  readonly market: string;
  readonly n: number;
  readonly wins: number;
  readonly winRate: number | null;
  readonly claimedRate: number | null;
}

export type ConfidenceTailVerdict = "insufficient" | "inverted" | "overconfident" | "calibrated";

export interface ConfidenceTailVersionRow {
  readonly modelVersion: string;
  readonly n: number;
  readonly wins: number;
  readonly winRate: number | null;
}

export interface ConfidenceTailSummary {
  readonly floor: number;
  readonly n: number;
  readonly wins: number;
  /** Observed hit rate in the tail, 0–1. */
  readonly winRate: number | null;
  /** Mean stated confidence in the tail, 0–1 (what the picks claimed). */
  readonly claimedRate: number | null;
  readonly brier: number | null;
  readonly byVersion: readonly ConfidenceTailVersionRow[];
  /** Split by market; empty when the rows carry no pickType. */
  readonly byMarket: readonly ConfidenceTailMarketRow[];
  readonly verdict: ConfidenceTailVerdict;
  readonly operatorHint: string;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function summarizeConfidenceTail(
  rows: readonly ConfidenceTailRow[],
  options: { readonly floor?: number; readonly minN?: number } = {},
): ConfidenceTailSummary {
  const floor = options.floor ?? CONFIDENCE_TAIL_FLOOR;
  const minN = options.minN ?? CONFIDENCE_TAIL_MIN_N;
  const tail = rows.filter((r) => Number.isFinite(r.confidence) && r.confidence >= floor);
  const n = tail.length;
  const wins = tail.filter((r) => r.result === "WIN").length;
  const winRate = n > 0 ? wins / n : null;
  const claimedRate = n > 0 ? tail.reduce((s, r) => s + r.confidence / 100, 0) / n : null;
  const brier =
    n > 0
      ? tail.reduce((s, r) => s + (r.confidence / 100 - (r.result === "WIN" ? 1 : 0)) ** 2, 0) / n
      : null;

  const versions = new Map<string, { n: number; wins: number }>();
  for (const r of tail) {
    const v = versions.get(r.modelVersion) ?? { n: 0, wins: 0 };
    v.n += 1;
    if (r.result === "WIN") v.wins += 1;
    versions.set(r.modelVersion, v);
  }
  const byVersion: ConfidenceTailVersionRow[] = [...versions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modelVersion, v]) => ({
      modelVersion,
      n: v.n,
      wins: v.wins,
      winRate: v.n > 0 ? round4(v.wins / v.n) : null,
    }));

  const markets = new Map<string, { n: number; wins: number; claimed: number }>();
  for (const r of tail) {
    if (!r.pickType) continue;
    const m = markets.get(r.pickType) ?? { n: 0, wins: 0, claimed: 0 };
    m.n += 1;
    if (r.result === "WIN") m.wins += 1;
    m.claimed += r.confidence / 100;
    markets.set(r.pickType, m);
  }
  const byMarket: ConfidenceTailMarketRow[] = [...markets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([market, m]) => ({
      market,
      n: m.n,
      wins: m.wins,
      winRate: m.n > 0 ? round4(m.wins / m.n) : null,
      claimedRate: m.n > 0 ? round4(m.claimed / m.n) : null,
    }));

  let verdict: ConfidenceTailVerdict;
  if (n < minN || winRate === null || claimedRate === null) {
    verdict = "insufficient";
  } else if (winRate < 0.5) {
    verdict = "inverted";
  } else if (winRate < claimedRate - 0.1) {
    verdict = "overconfident";
  } else {
    verdict = "calibrated";
  }

  const pct = (x: number | null) => (x === null ? "?" : `${Math.round(x * 100)}%`);
  const operatorHint =
    verdict === "insufficient"
      ? `Only ${n} graded pick(s) at ≥${floor} confidence (need ${minN}); no tail verdict yet.`
      : verdict === "inverted"
        ? `Picks at ≥${floor} confidence win ${pct(winRate)} while claiming ${pct(claimedRate)} (n=${n}). The high tail is anti-predictive: do not publish confidence as probability; open a calibration proposal before the next MODEL_VERSION.`
        : verdict === "overconfident"
          ? `Picks at ≥${floor} confidence win ${pct(winRate)} while claiming ${pct(claimedRate)} (n=${n}); shrink the tail in the next calibration proposal.`
          : `Picks at ≥${floor} confidence win ${pct(winRate)} against ${pct(claimedRate)} claimed (n=${n}).`;

  return {
    floor,
    n,
    wins,
    winRate: winRate === null ? null : round4(winRate),
    claimedRate: claimedRate === null ? null : round4(claimedRate),
    brier: brier === null ? null : round4(brier),
    byVersion,
    byMarket,
    verdict,
    operatorHint,
  };
}

/**
 * The population is the public-performance one (public-performance-policy,
 * calibration/report): published, non-bootstrap, not a seed row. The summary
 * is served on a public endpoint, so a bootstrap or seed pick must never move
 * the verdict in either direction.
 */
const SEED_MODEL_VERSION = "v5.0.0-seed";

/** Narrow read surface so the loader stays testable without a Prisma client. */
export interface ConfidenceTailDb {
  pick: {
    findMany(args: {
      where: {
        result: { in: ["WIN", "LOSS"] };
        confidence: { gte: number };
        isPublished: true;
        isBootstrap: false;
        NOT: { modelVersion: string };
      };
      select: { confidence: true; result: true; modelVersion: true; pickType: true };
    }): Promise<Array<{ confidence: number; result: string; modelVersion: string; pickType: string }>>;
  };
}

export async function loadConfidenceTail(
  db: ConfidenceTailDb,
  floor: number = CONFIDENCE_TAIL_FLOOR,
): Promise<ConfidenceTailSummary> {
  const rows = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS"] },
      confidence: { gte: floor },
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: SEED_MODEL_VERSION },
    },
    select: { confidence: true, result: true, modelVersion: true, pickType: true },
  });
  return summarizeConfidenceTail(
    rows
      .filter((r) => r.result === "WIN" || r.result === "LOSS")
      .map((r) => ({
        confidence: r.confidence,
        result: r.result === "WIN" ? "WIN" : "LOSS",
        modelVersion: r.modelVersion,
      })),
    { floor },
  );
}
