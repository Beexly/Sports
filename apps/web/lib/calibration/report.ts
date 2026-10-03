import { db } from "@sports/db";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import { inPlayExclusionNote, partitionInPlay } from "@/lib/calibration/in-play-exclusion";
import { resolveEffectivePerformanceGate } from "@/lib/ops/effective-performance-gate";

export interface CalibrationReportPayload {
  data: ReturnType<typeof computeCalibration> & {
    updatedAt: string;
    isCollecting: boolean;
    publicMessage: string;
    /** Distinct modelVersion values in this sample. Empty when gated or no rows. */
    modelVersions: readonly string[];
    /**
     * C-302: settled rows this reader withheld because they were generated at or
     * after kickoff. Counted and disclosed, never scored (C-298 sample parity).
     */
    excludedInPlay: number;
    /** One sentence carrying the exclusion and its denominator, or the zero case. */
    inPlayNote: string;
  };
  meta: { gated: boolean; isSampleData: boolean };
}

/**
 * C-322. The sample is memoised. THE GATE IS NOT, and that distinction is the
 * whole design: `resolveEffectivePerformanceGate()` is still called on every
 * request, so the moment the gate closes the population is withheld again — a
 * cached sample can never outlive the withholding it is supposed to respect.
 *
 * Why memoise at all: removing the `take: 500` cap (C-317) was right, and it
 * turned this loader into a full-population read with a nested game+sport include
 * on a `force-dynamic` page with no cache — on every request, on a page about to
 * be marketed. A cap was the defect; an unbounded per-request read is the cost of
 * removing it honestly. This pays the cost without reintroducing the defect.
 *
 * A SHORT TTL IS ONLY HONEST IF `updatedAt` MOVES WITH IT. The payload's
 * updatedAt is the moment the SAMPLE was read, never the moment of the request.
 * Stamping a cached sample with `now` would make "Updated less than a minute ago"
 * the next false claim in this file, which is the failure this module was just
 * fixed for.
 */
const SAMPLE_TTL_MS = 60_000;

async function fetchCalibrationPicks() {
  return db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      // ORDER IS PRESENTATION ONLY; THERE IS NO `take`. A cap here silently
      // replaced the record with a rolling window of the newest settled picks
      // while the header still read "N settled picks" — so the published 80-89
      // bucket read 78.0% (n=41) here and 51.9% (n=129) over the full record,
      // and the confidence-tail monitor, which reads the same population with no
      // cap, called the same tail overconfident at 52.3% (n=222). Two public
      // surfaces, one population, two samples: the panel must score everything
      // the population definition admits.
      orderBy: { settledAt: "desc" },
    })
    .catch(() => null);
}

type CalibrationPickRows = NonNullable<Awaited<ReturnType<typeof fetchCalibrationPicks>>>;

let sampleCache: { rows: CalibrationPickRows; at: Date } | null = null;

/** Reset the memo — test-only. */
export function __resetPublicCalibrationSampleCache(): void {
  sampleCache = null;
}

async function loadCalibrationSample(
  now: Date,
): Promise<{ rows: CalibrationPickRows; at: Date } | null> {
  if (sampleCache && now.getTime() - sampleCache.at.getTime() < SAMPLE_TTL_MS) return sampleCache;
  const rows = await fetchCalibrationPicks();
  // A FAILED read is never cached: caching null would hold the unavailable state
  // for a whole TTL after the database had recovered.
  if (rows === null) return null;
  sampleCache = { rows, at: now };
  return sampleCache;
}

export async function loadPublicCalibrationReport(now = new Date()): Promise<CalibrationReportPayload> {
  // Public numbers only when published ∩ GREEN (effective gate). Env PERFORMANCE_STATS
  // alone is not enough — and this check is deliberately OUTSIDE the memo.
  const effective = await resolveEffectivePerformanceGate();

  if (!effective.canExposePerformanceStats) {
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage:
          "Building calibration history from settled canonical picks. Public metrics stay dark until eligibility GREEN and publish policy.",
        modelVersions: [],
        // Nothing was read: the gate withheld the population, so there is
        // nothing to have excluded. Stated rather than left undefined.
        excludedInPlay: 0,
        inPlayNote: inPlayExclusionNote(0, 0),
      },
      meta: { gated: true, isSampleData: false },
    };
  }

  // Fail OPEN like loadBoardState: a DB blip must never crash the home, board,
  // house, or proof pages that await this. On error, return the honest
  // building/empty state instead of throwing into the global error screen.
  const sample = await loadCalibrationSample(now);
  const picks = sample?.rows ?? null;

  if (picks === null) {
    const report = computeCalibration([]);
    return {
      data: {
        ...report,
        updatedAt: now.toISOString(),
        isCollecting: true,
        publicMessage: "Calibration is temporarily unavailable; building history from settled canonical picks.",
        modelVersions: [],
        // The read failed, so nothing was scored and nothing was excluded.
        excludedInPlay: 0,
        inPlayNote: inPlayExclusionNote(0, 0),
      },
      meta: { gated: false, isSampleData: false },
    };
  }

  // C-302: a pick generated at or after its game's kickoff carries a LIVE price
  // that already encodes part of the outcome it is graded against, so scoring it
  // is a look-ahead. Withheld here and disclosed with its count and denominator —
  // never dropped by outcome, never silently. Same rule as the C-298 sample, from
  // one shared definition (lib/calibration/in-play-exclusion.ts).
  const { scored, excludedInPlay } = partitionInPlay(picks, (pick) => ({
    generatedAt: pick.generatedAt,
    commenceTime: pick.game.commenceTime,
  }));

  const input: CalibrationPickInput[] = scored.map((pick) => ({
    id: pick.id,
    confidence: pick.confidence,
    result: pick.result,
    sport: pick.game.sport.name,
    pickType: pick.pickType,
    riskLevel: pick.riskLevel,
    dataQualityScore: pick.game.dataQualityScore,
  }));

  const report = computeCalibration(input);
  const modelVersions = [...new Set(scored.map((pick) => pick.modelVersion).filter(Boolean))].sort();

  return {
    data: {
      ...report,
      // The SAMPLE's read time, not this request's — see the memo note above.
      updatedAt: (sample?.at ?? now).toISOString(),
      isCollecting: report.sampleSize === 0,
      publicMessage:
        report.sampleSize === 0
          ? "Building calibration history from settled canonical picks."
          : "Calibration is computed from settled canonical picks only.",
      modelVersions,
      excludedInPlay: excludedInPlay.length,
      inPlayNote: inPlayExclusionNote(excludedInPlay.length, picks.length),
    },
    meta: { gated: false, isSampleData: false },
  };
}
