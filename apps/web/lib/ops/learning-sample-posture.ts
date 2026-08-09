/**
 * Learning / PROVEN sample posture — non-seed settled counts only.
 *
 * Integrity: commenced ≠ settled. Seed/bootstrap rows never count toward
 * the revenue ladder or calibration publish floors. Public-safe (counts only).
 */

import type { PrismaClient } from "@sports/db";

export interface LearningSamplePosture {
  /** Published non-seed picks with WIN/LOSS/PUSH — ladder / learning SoT. */
  readonly nonSeedSettled: number;
  readonly nonSeedWins: number;
  readonly nonSeedLosses: number;
  readonly nonSeedPushes: number;
  /** Published non-seed still PENDING (includes not-yet-commenced). */
  readonly nonSeedPending: number;
  /** Settled bootstrap/seed rows (excluded from ladder). */
  readonly seedSettled: number;
  /** Code floor for PROVEN sample (minSettledProven default 100). */
  readonly floorProven: number;
  /** Strawman publish checklist floor (default 500). */
  readonly floorPublishStrawman: number;
  readonly meetsCodeFloor: boolean;
  readonly meetsPublishStrawman: boolean;
  /** Primary market breakdown when query succeeds; null on failure. */
  readonly byPickType: ReadonlyArray<{
    readonly pickType: string;
    readonly settled: number;
  }> | null;
  readonly operatorHint: string;
}

const SETTLED = ["WIN", "LOSS", "PUSH"] as const;

export async function loadLearningSamplePosture(
  db: PrismaClient,
  options?: { floorProven?: number; floorPublishStrawman?: number },
): Promise<LearningSamplePosture> {
  const floorProven = Math.max(1, options?.floorProven ?? 100);
  const floorPublishStrawman = Math.max(floorProven, options?.floorPublishStrawman ?? 500);

  const nonSeedBase = { isPublished: true as const, isBootstrap: false as const };

  const [
    nonSeedSettled,
    nonSeedWins,
    nonSeedLosses,
    nonSeedPushes,
    nonSeedPending,
    seedSettled,
    byTypeRows,
  ] = await Promise.all([
    db.pick.count({
      where: { ...nonSeedBase, result: { in: [...SETTLED] } },
    }),
    db.pick.count({ where: { ...nonSeedBase, result: "WIN" } }),
    db.pick.count({ where: { ...nonSeedBase, result: "LOSS" } }),
    db.pick.count({ where: { ...nonSeedBase, result: "PUSH" } }),
    db.pick.count({ where: { ...nonSeedBase, result: "PENDING" } }),
    db.pick.count({
      where: {
        isBootstrap: true,
        result: { in: [...SETTLED] },
      },
    }),
    db.pick
      .groupBy({
        by: ["pickType"],
        where: { ...nonSeedBase, result: { in: [...SETTLED] } },
        _count: { _all: true },
      })
      .catch(() => null),
  ]);

  const byPickType =
    byTypeRows == null
      ? null
      : byTypeRows
          .map((r) => ({
            pickType: r.pickType,
            settled: r._count._all,
          }))
          .sort((a, b) => b.settled - a.settled);

  const meetsCodeFloor = nonSeedSettled >= floorProven;
  const meetsPublishStrawman = nonSeedSettled >= floorPublishStrawman;

  let operatorHint: string;
  if (!meetsCodeFloor) {
    operatorHint = `Non-seed settled ${nonSeedSettled}/${floorProven} (code floor). Seed settled ${seedSettled} excluded. Keep settle-picks running — do not invent sample.`;
  } else if (!meetsPublishStrawman) {
    operatorHint = `Code floor met (${nonSeedSettled}≥${floorProven}). Publish strawman still ${nonSeedSettled}/${floorPublishStrawman}. Calibration still requires founder YES — sample alone is not PROVEN.`;
  } else {
    operatorHint = `Non-seed settled ${nonSeedSettled} meets publish strawman ≥${floorPublishStrawman}. Still blocked until calibration published + founder ceremony — never auto-claim PROVEN.`;
  }

  return {
    nonSeedSettled,
    nonSeedWins,
    nonSeedLosses,
    nonSeedPushes,
    nonSeedPending,
    seedSettled,
    floorProven,
    floorPublishStrawman,
    meetsCodeFloor,
    meetsPublishStrawman,
    byPickType,
    operatorHint,
  };
}
