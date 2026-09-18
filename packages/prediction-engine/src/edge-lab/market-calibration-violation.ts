/**
 * 5-percentage-point market-calibration violation mill.
 *
 * ESTIMAND (one line, before any number): among settled WIN/LOSS picks that
 * have a pick_proof_receipt with marketFairProb in (0,1), the fraction of 10
 * equal-width bins with n≥30 where |mean(marketFairProb) − mean(y)| > 0.05.
 *
 * What is violating what: the de-vigged market p (receipt.marketFairProb) vs
 * the realized pick result y (WIN=1, LOSS=0). Over which rows: settled
 * two-outcome grades with a frozen receipt; PUSH/VOID/PENDING out. What
 * number would make it matter: ≥1 evaluable violating bin on a sport we
 * intend to price — then market logit is not licensed as a FIXED offset
 * for that sport. Underpowered is not a pass and not a violation.
 *
 * The 0.05 is a THRESHOLD, not a measured market error. This mill does not
 * query production. productionNumber is always NOT_RUN. The 2026-09-04
 * closing-ML Brier (docs/data/MARKET_CALIBRATION_2026-09-04.md, nflverse
 * games 2006-2025) is a different estimand on a different population; it
 * does not answer this question.
 *
 * Missing input for a production number: a read-replica extract of
 * MARKET_CALIBRATION_SQL (picks ⋈ pick_proof_receipts ⋈ games ⋈ sports).
 * This sandbox does not hold those rows.
 *
 * No database. Empty input throws. SHADOW. priced false.
 */

export const MARKET_CALIBRATION_ESTIMAND =
  "Among settled WIN/LOSS picks with pick_proof_receipt.marketFairProb in (0,1), the fraction of 10 equal-width bins with n≥30 where |mean(marketFairProb)−mean(y)| > 0.05." as const;

export const MARKET_CALIBRATION_MATTERS_WHEN =
  "A sport with ≥1 evaluable violating bin cannot use market logit as a FIXED offset. Underpowered is not a pass. 0.05 is a threshold, not a measured 5% market error." as const;

export const MARKET_CALIBRATION_PRODUCTION_NUMBER = "NOT_RUN" as const;

export const MARKET_CALIBRATION_VIOLATION_PP = 0.05;
export const MARKET_CALIBRATION_MIN_BIN_N = 30;
export const MARKET_CALIBRATION_BINS = 10;

export const MARKET_CALIBRATION_SQL = `
SELECT json_agg(row_to_json(t))
FROM (
  SELECT
    s.key AS sport,
    r."marketFairProb" AS "marketP",
    CASE p.result WHEN 'WIN' THEN 1 ELSE 0 END AS y
  FROM picks p
  JOIN pick_proof_receipts r ON r."pickId" = p.id
  JOIN games g ON g.id = p."gameId"
  JOIN sports s ON s.id = g."sportId"
  WHERE p.result IN ('WIN', 'LOSS')
    AND g."mergedIntoGameId" IS NULL
    AND r."marketFairProb" > 0
    AND r."marketFairProb" < 1
) t
`.trim();

export const MARKET_CALIBRATION_PRODUCTION_NEEDS = {
  estimand: MARKET_CALIBRATION_ESTIMAND,
  mattersWhen: MARKET_CALIBRATION_MATTERS_WHEN,
  productionNumber: MARKET_CALIBRATION_PRODUCTION_NUMBER,
  replicaSql: "MARKET_CALIBRATION_SQL",
  tables: ["picks", "pick_proof_receipts", "games", "sports"] as const,
  env: "READONLY_DATABASE_URL",
  client: "psql",
  yCoding: "WIN=1, LOSS=0; PUSH/VOID/PENDING excluded",
  missingInput:
    "Settled WIN/LOSS picks joined to pick_proof_receipts.marketFairProb and sports.key. This sandbox does not hold those rows. A replica extract of MARKET_CALIBRATION_SQL is the missing input. IndependentEdge.marketFairProb is the wrong column (signal path is null). nflverse closing-ML Brier is a different estimand.",
  notTheSameAs:
    "docs/data/MARKET_CALIBRATION_2026-09-04.md — nflverse closing moneylines 2006-2025, not our receipts.",
} as const;

export type MarketCalibRow = {
  readonly sport: string;
  readonly marketP: number;
  readonly y: 0 | 1;
};

export type MarketCalibBin = {
  readonly lo: number;
  readonly hi: number;
  readonly n: number;
  readonly meanP: number;
  readonly meanY: number;
  readonly absGap: number;
  readonly evaluable: boolean;
  readonly violates: boolean;
};

export type MarketCalibSportCard = {
  readonly sport: string;
  readonly n: number;
  readonly binsEvaluable: number;
  readonly binsUnderpowered: number;
  readonly binsViolating: number;
  readonly violationRate: number | null;
  readonly verdict: "underpowered" | "measured";
  readonly bins: readonly MarketCalibBin[];
};

export type MarketCalibReport = {
  readonly n: number;
  readonly estimand: typeof MARKET_CALIBRATION_ESTIMAND;
  readonly mattersWhen: typeof MARKET_CALIBRATION_MATTERS_WHEN;
  readonly productionNumber: typeof MARKET_CALIBRATION_PRODUCTION_NUMBER;
  readonly violationPp: typeof MARKET_CALIBRATION_VIOLATION_PP;
  readonly minBinN: number;
  readonly overall: MarketCalibSportCard;
  readonly bySport: readonly MarketCalibSportCard[];
  readonly priced: false;
  readonly status: "shadow";
  readonly dbQueried: false;
};

function binIndex(p: number): number {
  if (p >= 1) return MARKET_CALIBRATION_BINS - 1;
  if (p <= 0) return 0;
  return Math.min(MARKET_CALIBRATION_BINS - 1, Math.floor(p * MARKET_CALIBRATION_BINS));
}

function scoreGroup(sport: string, rows: readonly MarketCalibRow[]): MarketCalibSportCard {
  const acc = Array.from({ length: MARKET_CALIBRATION_BINS }, () => ({
    n: 0,
    sumP: 0,
    sumY: 0,
  }));
  for (const row of rows) {
    const i = binIndex(row.marketP);
    acc[i]!.n += 1;
    acc[i]!.sumP += row.marketP;
    acc[i]!.sumY += row.y;
  }
  const bins: MarketCalibBin[] = acc.map((cell, i) => {
    const lo = i / MARKET_CALIBRATION_BINS;
    const hi = (i + 1) / MARKET_CALIBRATION_BINS;
    const meanP = cell.n > 0 ? cell.sumP / cell.n : Number.NaN;
    const meanY = cell.n > 0 ? cell.sumY / cell.n : Number.NaN;
    const absGap = cell.n > 0 ? Math.abs(meanP - meanY) : Number.NaN;
    const evaluable = cell.n >= MARKET_CALIBRATION_MIN_BIN_N;
    const violates = evaluable && absGap > MARKET_CALIBRATION_VIOLATION_PP;
    return { lo, hi, n: cell.n, meanP, meanY, absGap, evaluable, violates };
  });
  const binsEvaluable = bins.filter((b) => b.evaluable).length;
  const binsUnderpowered = bins.filter((b) => b.n > 0 && !b.evaluable).length;
  const binsViolating = bins.filter((b) => b.violates).length;
  return {
    sport,
    n: rows.length,
    binsEvaluable,
    binsUnderpowered,
    binsViolating,
    violationRate: binsEvaluable > 0 ? binsViolating / binsEvaluable : null,
    verdict: binsEvaluable > 0 ? "measured" : "underpowered",
    bins,
  };
}

/**
 * Score de-vigged market p against settled y. Throws on empty or
 * non-finite/out-of-range p. Does not invent a 5% number. productionNumber
 * stays NOT_RUN: this function never queries a replica.
 */
export function measureMarketCalibrationViolation(rows: readonly MarketCalibRow[]): MarketCalibReport {
  if (rows.length === 0) {
    throw new RangeError("measureMarketCalibrationViolation: empty sample");
  }
  for (const row of rows) {
    if (!(row.marketP >= 0 && row.marketP <= 1) || !Number.isFinite(row.marketP)) {
      throw new RangeError(`measureMarketCalibrationViolation: marketP out of [0,1]: ${row.marketP}`);
    }
    if (row.y !== 0 && row.y !== 1) {
      throw new RangeError("measureMarketCalibrationViolation: y must be 0 or 1");
    }
  }
  const bySportMap = new Map<string, MarketCalibRow[]>();
  for (const row of rows) {
    const list = bySportMap.get(row.sport) ?? [];
    list.push(row);
    bySportMap.set(row.sport, list);
  }
  const bySport = [...bySportMap.keys()].sort().map((sport) => scoreGroup(sport, bySportMap.get(sport)!));
  return {
    n: rows.length,
    estimand: MARKET_CALIBRATION_ESTIMAND,
    mattersWhen: MARKET_CALIBRATION_MATTERS_WHEN,
    productionNumber: MARKET_CALIBRATION_PRODUCTION_NUMBER,
    violationPp: MARKET_CALIBRATION_VIOLATION_PP,
    minBinN: MARKET_CALIBRATION_MIN_BIN_N,
    overall: scoreGroup("ALL", rows),
    bySport,
    priced: false,
    status: "shadow",
    dbQueried: false,
  };
}
