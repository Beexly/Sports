/**
 * Settlement backlog breakdown — sport-level overdue counts for ops truth.
 * Pure loader; no invented scores. Complements loadSettlementHealth.
 *
 * Client shape is findMany-only so PrismaClient assigns cleanly under
 * next build typecheck (groupBy stubs with string[] `by` broke prod deploys).
 */

export interface SettlementBreakdownClient {
  pick: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
      take?: number;
    }) => Promise<
      Array<{
        id: string;
        game: { sport: { key: string }; commenceTime: Date };
      }>
    >;
  };
}

export type SportOverdueRow = {
  readonly sportKey: string;
  readonly overduePending: number;
};

export type SettlementBreakdown = {
  readonly graceHours: number;
  readonly overdueBySport: readonly SportOverdueRow[];
  readonly overduePending: number;
  readonly samplePickIds: readonly string[];
  readonly operatorNext: readonly string[];
};

/**
 * Load overdue PENDING picks (past grace) grouped by sport key.
 * Caps sample pick ids for ops payloads.
 */
export async function loadSettlementBreakdown(
  db: SettlementBreakdownClient,
  input: { graceHours?: number; now?: Date; sampleLimit?: number } = {},
): Promise<SettlementBreakdown> {
  const graceHours = input.graceHours ?? 6;
  const now = input.now ?? new Date();
  const overdueCutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
  const sampleLimit = input.sampleLimit ?? 12;

  const rows = await db.pick.findMany({
    where: {
      isPublished: true,
      result: "PENDING",
      NOT: { modelVersion: { contains: "seed" } },
      game: { commenceTime: { lt: overdueCutoff } },
    },
    select: {
      id: true,
      game: { select: { commenceTime: true, sport: { select: { key: true } } } },
    },
    take: 2000,
  });

  const bySport = new Map<string, number>();
  for (const r of rows) {
    const key = r.game.sport.key;
    bySport.set(key, (bySport.get(key) ?? 0) + 1);
  }

  const overdueBySport = [...bySport.entries()]
    .map(([sportKey, overduePending]) => ({ sportKey, overduePending }))
    .sort((a, b) => b.overduePending - a.overduePending);

  const overduePending = rows.length;
  const samplePickIds = rows.slice(0, sampleLimit).map((r) => r.id);

  const operatorNext =
    overduePending === 0
      ? ["Settlement backlog clear at this grace window."]
      : [
          "Trigger free-path settle-picks (cron or operator): /api/cron/settle-picks",
          "Inspect top sports in overdueBySport — re-run free scores for those keys first",
          "RCA Wave A: NO_TRUSTED_FINAL / OVERDUE_NO_SCORE → multi-source scores then re-settle",
          "Do not auto-void; DISPUTED holds are policy, not bugs",
        ];

  return {
    graceHours,
    overdueBySport,
    overduePending,
    samplePickIds,
    operatorNext,
  };
}
