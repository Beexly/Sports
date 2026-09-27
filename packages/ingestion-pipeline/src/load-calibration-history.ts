/**
 * Load settled pick history for one sport and map it to CalibrationHistoryRow[].
 *
 * Fail-open: any read failure, empty result, or unbuildable history returns
 * undefined — the same silence as never attaching the field. Never throws.
 * PUSH / VOID / PENDING rows are excluded by the pure builder (no invented y).
 */

import { db } from "@sports/db";
import {
  buildCalibrationHistory,
  type SettledPickHistorySource,
} from "@sports/prediction-engine";
import type { CalibrationHistoryRow } from "@sports/types";

/** Cap the history the mint-time screen sees so refresh cycles stay bounded. */
const CALIBRATION_HISTORY_LIMIT = 500;

export async function loadCalibrationHistoryForSport(
  sportKey: string,
): Promise<CalibrationHistoryRow[] | undefined> {
  try {
    const picks = await db.pick.findMany({
      where: {
        result: { in: ["WIN", "LOSS"] },
        game: { sport: { key: sportKey } },
      },
      select: {
        pickType: true,
        result: true,
        settledAt: true,
        confidence: true,
        factorBreakdown: true,
        game: {
          select: {
            commenceTime: true,
            sport: { select: { key: true } },
          },
        },
      },
      orderBy: { settledAt: "desc" },
      take: CALIBRATION_HISTORY_LIMIT,
    });

    const sources: SettledPickHistorySource[] = picks.map((pick) => ({
      sport: pick.game?.sport?.key ?? sportKey,
      pickType: pick.pickType,
      result: pick.result,
      settledAt: pick.settledAt,
      commenceTime: pick.game?.commenceTime ?? null,
      confidence: pick.confidence,
      factorBreakdown: pick.factorBreakdown,
    }));

    const rows = buildCalibrationHistory(sources);
    return rows.length > 0 ? rows : undefined;
  } catch {
    return undefined;
  }
}
