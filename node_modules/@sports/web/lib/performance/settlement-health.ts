/**
 * Settlement health — the LEADING indicator under the CLV north-star.
 *
 * CLV coverage (clv-coverage.ts) is a LAGGING signal: it can only see picks that
 * already settled. But a pick that never settles never gets a CLV record at all —
 * so a silent settlement/ingestion failure quietly starves the coverage metric
 * AND corrupts the public track record (games that happened but show no outcome).
 *
 * This probe is the leading half: it counts picks whose game has already started
 * but which remain PENDING past a grace window long enough for the game to finish
 * and the settlement job to run. A non-zero count means settlement is falling
 * behind — the most dangerous operational gap, because it degrades the very record
 * that is the entire moat, before anyone notices.
 *
 * Pure evaluator + a thin DB loader (mirrors clv-coverage.ts / public-clv-policy.ts).
 * No fabricated numbers — counts come from persisted picks and real commence times.
 */

/**
 * The complete settlement-health vocabulary, as a runtime value — same reason as
 * `SCHEDULER_LIVENESS_STATUSES`: the external watchdog string-compares this band
 * in shell, where a TypeScript union has no reach.
 */
export const SETTLEMENT_HEALTH_BANDS = [
  "NO_DATA",
  "HEALTHY",
  "DEGRADED",
  "CRITICAL",
] as const;

export type SettlementHealthBand = (typeof SETTLEMENT_HEALTH_BANDS)[number];

export interface SettlementHealthInput {
  /** Published, non-seed picks whose game has already started (result irrelevant). */
  readonly commencedTotal: number;
  /** Of those, how many are STILL PENDING past the grace window — i.e. overdue to settle. */
  readonly overduePending: number;
  /** Hours after kickoff a pick is allowed to remain PENDING before it counts as overdue. */
  readonly graceHours: number;
  /** Overdue count at/above this is CRITICAL; below it (but > 0) is DEGRADED. Default 5. */
  readonly criticalThreshold?: number;
}

export interface SettlementHealth {
  readonly commencedTotal: number;
  readonly overduePending: number;
  readonly graceHours: number;
  readonly health: SettlementHealthBand;
  /** True when nothing is overdue over a non-empty set — settlement is keeping up. */
  readonly clean: boolean;
  readonly operatorMessage: string;
  readonly remediation: readonly string[];
}

const CRITICAL_DEFAULT = 5;

/** Hours after kickoff before PENDING counts as overdue. Single source of truth. */
export const SETTLEMENT_DEFAULT_GRACE_HOURS = 6;

/**
 * Evaluate settlement health from two counts: how many picks have commenced, and
 * how many of those are overdue to settle. Pure. `overduePending` is clamped to
 * `[0, commencedTotal]` defensively — overdue picks are a subset of commenced ones.
 */
export function evaluateSettlementHealth(input: SettlementHealthInput): SettlementHealth {
  const criticalAt = Math.max(1, Math.floor(input.criticalThreshold ?? CRITICAL_DEFAULT));
  const graceHours = Math.max(0, input.graceHours);

  const commencedTotal = Math.max(0, Math.floor(input.commencedTotal));
  const overduePending = Math.min(commencedTotal, Math.max(0, Math.floor(input.overduePending)));

  if (commencedTotal === 0) {
    return {
      commencedTotal: 0,
      overduePending: 0,
      graceHours,
      health: "NO_DATA",
      clean: false,
      operatorMessage:
        "No commenced, published picks yet. Settlement health is not measurable until games start.",
      remediation: [],
    };
  }

  let health: SettlementHealthBand;
  if (overduePending === 0) health = "HEALTHY";
  else if (overduePending >= criticalAt) health = "CRITICAL";
  else health = "DEGRADED";

  const clean = overduePending === 0;

  const operatorMessage = clean
    ? `Settlement is keeping up: 0 of ${commencedTotal} commenced picks are overdue (grace ${graceHours}h).`
    : `${overduePending} of ${commencedTotal} commenced picks are still PENDING more than ${graceHours}h after kickoff. ` +
      `Settlement is falling behind. These picks will never get a CLV record (or a public outcome) until they settle.`;

  const remediation = clean
    ? []
    : [
        "Settlement or score ingestion is likely failing. Check the settle-picks cron/worker and the scores feed for these games.",
        "Each overdue pick is a played game with no recorded result: it both starves CLV coverage and shows a blank outcome on the public record.",
        "Settle these picks (or void genuinely cancelled games) before treating the beat-close rate or the track record as complete.",
      ];

  return {
    commencedTotal,
    overduePending,
    graceHours,
    health,
    clean,
    operatorMessage,
    remediation,
  };
}

// ───────────────────────── DB loader ─────────────────────────

export interface SettlementHealthClient {
  pick: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface LoadSettlementHealthInput {
  /** Defaults to now(); injectable for deterministic tests. */
  readonly now?: Date;
  /** Hours after kickoff before a still-PENDING pick is overdue. Default 6. */
  readonly graceHours?: number;
  readonly criticalThreshold?: number;
}

/**
 * Load settlement health from the live pick table. Published, non-seed picks only.
 * "Commenced" = the game's commence time is in the past. "Overdue" = commenced more
 * than `graceHours` ago AND still PENDING. Bootstrap picks are intentionally NOT
 * excluded — settlement must run in every mode, so a stuck bootstrap pick is still
 * a real settlement-failure signal.
 */
export async function loadSettlementHealth(
  db: SettlementHealthClient,
  input: LoadSettlementHealthInput = {}
): Promise<SettlementHealth> {
  const graceHours = input.graceHours ?? SETTLEMENT_DEFAULT_GRACE_HOURS;
  const now = input.now ?? new Date();
  const overdueCutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

  const baseWhere = {
    isPublished: true,
    NOT: { modelVersion: { contains: "seed" } },
  } as const;

  const [commencedTotal, overduePending] = await Promise.all([
    db.pick.count({ where: { ...baseWhere, game: { commenceTime: { lt: now } } } }),
    db.pick.count({
      where: { ...baseWhere, result: "PENDING", game: { commenceTime: { lt: overdueCutoff } } },
    }),
  ]);

  return evaluateSettlementHealth({
    commencedTotal,
    overduePending,
    graceHours,
    ...(input.criticalThreshold !== undefined ? { criticalThreshold: input.criticalThreshold } : {}),
  });
}
