/**
 * Persist offline map bake-off (isotonic/log-loss/temp) for ops surface.
 * Apply remains OFF — this is diagnostics only.
 */

import { db, isStubMode } from "@sports/db";
import type { CalibrationMapBakeoff } from "@/lib/calibration/calibration-map-bakeoff";

export const MAP_BAKEOFF_SCOPE = "ops.calibration.map-bakeoff";

export async function persistMapBakeoff(bake: CalibrationMapBakeoff): Promise<void> {
  if (isStubMode()) return;
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: MAP_BAKEOFF_SCOPE,
        title: `Map bake-off bestNLL=${bake.bestByLogLoss ?? "n/a"} bestBrier=${bake.bestByBrier ?? "n/a"}`,
        summary: `nTest=${bake.nTest} T=${bake.temperatureT ?? "n/a"} cv=${bake.cvSelect?.recommended ?? "n/a"} iso=${bake.isotonicDebug?.recommendation ?? "n/a"} applyOff=true`,
        full_text: JSON.stringify(bake),
        source_type: "cron.calibration-metrics",
        source_timestamp: new Date(bake.generatedAt),
        actor: "system",
        owner: "system",
        confidence: 85,
        tags: ["map-bakeoff", "isotonic", "log-loss", "offline", "apply-off"],
        metadata: bake as object,
        owner_approval: true,
      },
    });
  } catch {
    /* best-effort */
  }
}

export async function loadMapBakeoff(): Promise<CalibrationMapBakeoff | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: MAP_BAKEOFF_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { metadata: true, full_text: true },
    });
    if (!row) return null;
    const raw =
      typeof row.metadata === "object" && row.metadata !== null
        ? row.metadata
        : row.full_text
          ? JSON.parse(row.full_text)
          : null;
    if (!raw || typeof raw !== "object") return null;
    return raw as CalibrationMapBakeoff;
  } catch {
    return null;
  }
}

/** Compact ops surface (no full method grid). */
export function summarizeMapBakeoff(bake: CalibrationMapBakeoff | null): {
  readonly present: boolean;
  readonly applyOff: true;
  readonly bestByBrier: string | null;
  readonly bestByLogLoss: string | null;
  readonly temperatureT: number | null;
  readonly cvRecommended: string | null;
  readonly isotonicRecommendation: string | null;
  readonly plateauCollapseRate: number | null;
  readonly logLossMean: number | null;
  readonly nTest: number | null;
  readonly resAwareSelected: boolean | null;
  readonly resAwareA: number | null;
  readonly resAwareResGain: number | null;
  readonly onlineBetaA: number | null;
  readonly ocoPublishedRes: number | null;
  readonly ocoRecommendedDelta: number | null;
  readonly operatorHint: string;
} {
  if (!bake) {
    return {
      present: false,
      applyOff: true,
      bestByBrier: null,
      bestByLogLoss: null,
      temperatureT: null,
      cvRecommended: null,
      isotonicRecommendation: null,
      plateauCollapseRate: null,
      logLossMean: null,
      nTest: null,
      resAwareSelected: null,
      resAwareA: null,
      resAwareResGain: null,
      onlineBetaA: null,
      ocoPublishedRes: null,
      ocoRecommendedDelta: null,
      operatorHint:
        "No map bake-off artifact yet — run calibration-metrics. Maps apply OFF.",
    };
  }
  return {
    present: true,
    applyOff: true,
    bestByBrier: bake.bestByBrier,
    bestByLogLoss: bake.bestByLogLoss,
    temperatureT: bake.temperatureT ?? null,
    cvRecommended: bake.cvSelect?.recommended ?? null,
    isotonicRecommendation: bake.isotonicDebug?.recommendation ?? null,
    plateauCollapseRate: bake.isotonicDebug?.plateauCollapseRate ?? null,
    logLossMean: bake.logLossDiagnose?.meanLogLoss ?? null,
    nTest: bake.nTest,
    resAwareSelected: bake.resAwareBeta?.selected ?? null,
    resAwareA: bake.resAwareBeta?.a ?? null,
    resAwareResGain:
      bake.resAwareBeta != null && Number.isFinite(bake.resAwareBeta.resGain)
        ? bake.resAwareBeta.resGain
        : null,
    onlineBetaA: bake.onlineBeta?.a ?? null,
    ocoPublishedRes:
      bake.ocoPipeline != null && Number.isFinite(bake.ocoPipeline.publishedRes)
        ? bake.ocoPipeline.publishedRes
        : null,
    ocoRecommendedDelta: bake.ocoPipeline?.recommendedDelta ?? null,
    operatorHint:
      bake.isotonicDebug?.operatorHint ??
      "Offline map bake-off present. CALIBRATION_ADJUSTMENTS stays false until RES + holdout floors.",
  };
}
