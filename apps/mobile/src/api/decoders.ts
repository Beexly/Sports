import type {
  BoardState,
  BoardStateMeta,
  BoardStateRow,
  BriefPayload,
  CalibrationBucket,
  CalibrationPayload,
  PerformancePayload,
  PublicPick,
} from "./contracts";

/**
 * Runtime decoders.
 *
 * TypeScript types vanish at runtime. A native client holds a cache on disk and
 * a server it does not control, so every payload is validated before it is
 * trusted — and validation MUST be tolerant of new fields while strict about
 * the ones a screen depends on.
 *
 * The rule for a missing field: decide whether absence is a legitimate state or
 * a malformed payload, and encode that decision here rather than at the call
 * site. `confidence: null` is legitimate (the viewer is FREE). A missing `id`
 * is not, and decoding it as `undefined` would put a keyless row into a list.
 */

export class DecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecodeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new DecodeError(`${label} was not an object`);
  return value;
}

function str(value: unknown, label: string): string {
  if (typeof value !== "string") throw new DecodeError(`${label} was not a string`);
  return value;
}

function optStr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function optNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arr(value: unknown, label: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new DecodeError(`${label} was not an array`);
  return value;
}

/* ══════════════════════════════════════════════════════════════════════════
   BOARD
   ══════════════════════════════════════════════════════════════════════════ */

function decodeBoardRow(raw: unknown, label: string): BoardStateRow {
  const r = requireRecord(raw, label);
  return {
    id: str(r.id, `${label}.id`),
    gameId: str(r.gameId ?? "", `${label}.gameId`),
    matchup: str(r.matchup ?? "", `${label}.matchup`),
    sport: str(r.sport ?? "", `${label}.sport`),
    market: str(r.market ?? "", `${label}.market`),
    status: (r.status as BoardStateRow["status"]) ?? "GATED",
    // Always public. A null edge index on a scored row is a data gap, and the
    // UI renders it as one rather than as a zero.
    edgeIndex: optNum(r.edgeIndex),
    // Redacted server-side for FREE viewers. Kept null, never defaulted.
    confidence: optNum(r.confidence),
    rankingP: optNum(r.rankingP),
    rankingSource: optStr(r.rankingSource),
    gateReason: optStr(r.gateReason),
    updatedAt: str(r.updatedAt ?? "", `${label}.updatedAt`),
  };
}

export function decodeBoardState(body: unknown): BoardState {
  const root = requireRecord(body, "board state");
  const data = requireRecord(root.data, "board state.data");
  const meta = isRecord(root.meta) ? root.meta : {};

  return {
    data: {
      sportsWatched: numOr(data.sportsWatched, 0),
      booksPolled: numOr(data.booksPolled, 0),
      openPicks: numOr(data.openPicks, 0),
      gatedToday: numOr(data.gatedToday, 0),
      lastRefresh: typeof data.lastRefresh === "string" ? data.lastRefresh : "",
      modelVersion: typeof data.modelVersion === "string" ? data.modelVersion : "",
      bootstrap: data.bootstrap === true,
      scoringNow: arr(data.scoringNow, "scoringNow").map((r, i) =>
        decodeBoardRow(r, `scoringNow[${i}]`),
      ),
      publishedToday: arr(data.publishedToday, "publishedToday").map((r, i) =>
        decodeBoardRow(r, `publishedToday[${i}]`),
      ),
      gatedTodayRows: arr(data.gatedTodayRows, "gatedTodayRows").map((r, i) =>
        decodeBoardRow(r, `gatedTodayRows[${i}]`),
      ),
    },
    meta: {
      isSampleData: meta.isSampleData === true,
      suppressedDemoData: meta.suppressedDemoData === true,
      ...(meta.dataError === "DB_UNREACHABLE" ? { dataError: "DB_UNREACHABLE" as const } : {}),
      traceId: typeof meta.traceId === "string" ? meta.traceId : "",
      degradations: arr(meta.degradations, "degradations"),
      health: meta.health ?? null,
      boardClass: meta.boardClass ?? null,
      degradationCharacter:
        typeof meta.degradationCharacter === "string" ? meta.degradationCharacter : "unknown",
    } satisfies BoardStateMeta,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PICKS
   ══════════════════════════════════════════════════════════════════════════ */

function decodePick(raw: unknown, label: string): PublicPick {
  const r = requireRecord(raw, label);
  const game = requireRecord(r.game ?? {}, `${label}.game`);

  return {
    id: str(r.id, `${label}.id`),
    game: {
      homeTeam: str(game.homeTeam ?? "", `${label}.game.homeTeam`),
      awayTeam: str(game.awayTeam ?? "", `${label}.game.awayTeam`),
      commenceTime: str(game.commenceTime ?? "", `${label}.game.commenceTime`),
      sport: str(game.sport ?? "", `${label}.game.sport`),
    },
    pickType: (r.pickType as PublicPick["pickType"]) ?? "SPREAD",
    selection: str(r.selection ?? "", `${label}.selection`),
    line: numOr(r.line, 0),
    lineMovement: isRecord(r.lineMovement)
      ? { opening: numOr(r.lineMovement.opening, 0), current: numOr(r.lineMovement.current, 0) }
      : null,
    hasBookPrice: typeof r.hasBookPrice === "boolean" ? r.hasBookPrice : undefined,
    marketImplied: isRecord(r.marketImplied)
      ? {
          prob: numOr(r.marketImplied.prob, 0),
          bookmakerCount: numOr(r.marketImplied.bookmakerCount, 0),
        }
      : null,
    winProbability: isRecord(r.winProbability)
      ? {
          value: numOr(r.winProbability.value, 0),
          // Only "market_devig" is emitted today; an unknown basis is preserved
          // verbatim so a UI that must not render an independent estimate can
          // still tell that it is looking at one.
          basis: (r.winProbability.basis as "market_devig" | "independent_estimate") ?? "market_devig",
          books: numOr(r.winProbability.books, 0),
          method: "proportional",
        }
      : null,
    // The single most important null in the payload. Never defaulted.
    confidence: optNum(r.confidence),
    confidenceCalibrated: isRecord(r.confidenceCalibrated)
      ? {
          pct: numOr(r.confidenceCalibrated.pct, 0),
          label: typeof r.confidenceCalibrated.label === "string" ? r.confidenceCalibrated.label : "",
        }
      : null,
    edgeScore: optNum(r.edgeScore),
    // factorBreakdown arrives as an object OR a JSON string. Pass both through
    // unchanged; `lib/trust.ts` normalises it at the point of use, so the
    // decoder does not become a second, weaker parser.
    factorBreakdown: (r.factorBreakdown ?? null) as PublicPick["factorBreakdown"],
    dataQualityScore: numOr(r.dataQualityScore, 0),
    tier: (r.tier as PublicPick["tier"]) ?? "FREE",
    pickGrade: (r.pickGrade as PublicPick["pickGrade"]) ?? "LEAN",
    riskLevel: (r.riskLevel as PublicPick["riskLevel"]) ?? "MODERATE",
    reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
    reasoningShort: typeof r.reasoningShort === "string" ? r.reasoningShort : "",
    isFeatured: r.isFeatured === true,
    isAuditAvailable: r.isAuditAvailable === true,
    generatedAt: str(r.generatedAt ?? "", `${label}.generatedAt`),
    dataFreshnessAt: optStr(r.dataFreshnessAt),
    result: (r.result as PublicPick["result"]) ?? "PENDING",
    receiptHash: optStr(r.receiptHash),
  };
}

/** `/api/picks` returns `{ success, data: { picks: [...], ... }, meta }`. */
export function decodePickList(body: unknown): PublicPick[] {
  const root = requireRecord(body, "picks");
  const data = root.data;
  if (Array.isArray(data)) return data.map((p, i) => decodePick(p, `picks[${i}]`));
  if (isRecord(data)) {
    const list = data.picks ?? data.rows ?? [];
    return arr(list, "picks").map((p, i) => decodePick(p, `picks[${i}]`));
  }
  return [];
}

/** `/api/picks/[id]/explain` — the factor trail. Shape varies; accepted loosely. */
export function decodeExplain(body: unknown): Record<string, unknown> {
  const root = requireRecord(body, "explain");
  if (isRecord(root.data)) return root.data;
  return root;
}

/* ══════════════════════════════════════════════════════════════════════════
   CALIBRATION
   ══════════════════════════════════════════════════════════════════════════ */

function decodeBucket(raw: unknown, label: string): CalibrationBucket {
  const r = requireRecord(raw, label);
  return {
    lower: numOr(r.lower, 0),
    upper: numOr(r.upper, 0),
    n: numOr(r.n, 0),
    predicted: numOr(r.predicted, 0),
    observed: numOr(r.observed, 0),
  };
}

export function decodeCalibration(body: unknown): CalibrationPayload {
  const root = requireRecord(body, "calibration");
  const data = isRecord(root.data) ? root.data : root;
  return {
    buckets: arr(data.buckets, "buckets").map((b, i) => decodeBucket(b, `buckets[${i}]`)),
    brier: optNum(data.brier ?? data.brierScore),
    brierBaseline: optNum(data.brierBaseline),
    sampleSize: numOr(data.sampleSize, 0),
    minimumSampleSize: optNum(data.minimumSampleSize),
    verdict: optStr(data.verdict),
    modelVersion: optStr(data.modelVersion),
    asOf: optStr(data.asOf ?? root.asOf),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PERFORMANCE
   ══════════════════════════════════════════════════════════════════════════ */

export function decodePerformance(body: unknown): PerformancePayload {
  const root = requireRecord(body, "performance");
  const data = isRecord(root.data) ? root.data : root;
  return {
    settled: numOr(data.settled, 0),
    wins: numOr(data.wins, 0),
    losses: numOr(data.losses, 0),
    pushes: numOr(data.pushes, 0),
    voids: numOr(data.voids, 0),
    winRate: optNum(data.winRate),
    brier: optNum(data.brier ?? data.brierScore),
    bySport: arr(data.bySport, "bySport").map((row) => {
      const r = requireRecord(row, "bySport[]");
      return {
        sport: typeof r.sport === "string" ? r.sport : "",
        settled: numOr(r.settled, 0),
        winRate: optNum(r.winRate),
      };
    }),
    byType: arr(data.byType, "byType").map((row) => {
      const r = requireRecord(row, "byType[]");
      const pickType = r.pickType;
      return {
        pickType:
          pickType === "SPREAD" || pickType === "MONEYLINE" || pickType === "TOTAL"
            ? pickType
            : "SPREAD",
        settled: numOr(r.settled, 0),
        winRate: optNum(r.winRate),
      };
    }),
    asOf: optStr(data.asOf ?? root.asOf),
    modelVersion: optStr(data.modelVersion),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   BRIEF
   ══════════════════════════════════════════════════════════════════════════ */

export function decodeBrief(body: unknown): BriefPayload {
  const root = requireRecord(body, "brief");
  const data = isRecord(root.data) ? root.data : root;
  const bodyField = data.body;
  return {
    headline: typeof data.headline === "string" ? data.headline : "",
    body: Array.isArray(bodyField)
      ? bodyField.filter((p): p is string => typeof p === "string")
      : typeof bodyField === "string"
        ? [bodyField]
        : [],
    asOf: typeof data.asOf === "string" ? data.asOf : "",
    gated: root.success === false || data.gated === true,
    gateReason: optStr(data.gateReason ?? root.error),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   GENERIC ENVELOPE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Pass-through for endpoints whose shape is not yet pinned. Returns the parsed
 * body unchanged — used only by surfaces that render nothing from it yet.
 */
export function decodePassthrough(body: unknown): unknown {
  return body;
}

/**
 * An empty list is a legitimate response. `decodePickList` returning `[]` means
 * "nothing published", which the UI renders as the honest empty state — never
 * as an error, and never as a suggestion that something is broken.
 */
export const EMPTY_PICK_LIST: readonly PublicPick[] = [];