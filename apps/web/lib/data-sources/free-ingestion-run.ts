/**
 * Free-mode IngestionRun evidence.
 *
 * Health (`live-capability-probes`) defines ingestion health solely as a recent
 * `IngestionRun` with status SUCCESS. The paid Odds path (`processSport`) always
 * wrote those rows; the free path did not — so after THE_ODDS_API_KEY was
 * intentionally removed (~2026-07-25), /api/health stayed degraded forever even
 * when free-spine probes and free settlement were working.
 *
 * This helper is the free-mode analogue: write an honest SUCCESS/FAILED run so
 * the existing probe recovers without inventing odds or re-enabling paid spend.
 *
 * Law: oddsApiRequired=false · refuse-default · no fabricated scores.
 */

import { db } from "@sports/db";

export type FreeIngestionRunInput = {
  /** Sport key when single-sport; omit or use "free-spine" for multi-sport probes. */
  sport?: string | null;
  gamesUpserted?: number;
  oddsInserted?: number;
  errorMessage?: string | null;
  /** When true, mark FAILED; otherwise SUCCESS. */
  failed?: boolean;
};

export type FreeIngestionRunResult = {
  id: string;
  status: "SUCCESS" | "FAILED";
  completedAt: string;
};

/**
 * Persist a completed free-path IngestionRun. Never throws — health evidence is
 * best-effort and must not break the cron that produced the free work.
 */
export async function recordFreeIngestionRun(
  input: FreeIngestionRunInput = {},
): Promise<FreeIngestionRunResult | null> {
  try {
    const status = input.failed ? "FAILED" : "SUCCESS";
    const completedAt = new Date();
    const run = await db.ingestionRun.create({
      data: {
        sport: input.sport?.trim() || null,
        status,
        gamesUpserted: input.gamesUpserted ?? 0,
        oddsInserted: input.oddsInserted ?? 0,
        errorMessage: input.errorMessage?.slice(0, 2000) ?? null,
        completedAt,
      },
      select: { id: true, status: true, completedAt: true },
    });
    return {
      id: run.id,
      status: run.status === "FAILED" ? "FAILED" : "SUCCESS",
      completedAt: (run.completedAt ?? completedAt).toISOString(),
    };
  } catch (err) {
    console.warn(
      `[free-ingestion-run] failed to record ${input.failed ? "FAILED" : "SUCCESS"}: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
