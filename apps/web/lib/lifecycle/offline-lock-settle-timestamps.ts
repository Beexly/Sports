/**
 * C6 offline lock≠settle lifecycle timestamps (cat:C6).
 *
 * Distinguish pick lock time from market settle / close time for CLV and
 * honesty. Measurement helpers only — no ledger writes, no gate flips.
 */

export type LifecycleStampRow = {
  readonly id: string;
  /** When the pick was locked / published (ISO or epoch ms). */
  readonly lockedAt: string | number;
  /** When the line settled / closed (ISO or epoch ms). */
  readonly settledAt: string | number | null;
  /** Optional opening-line capture time. */
  readonly openedAt?: string | number | null;
};

export type LifecycleStampEnriched = LifecycleStampRow & {
  readonly lockedMs: number | null;
  readonly settledMs: number | null;
  readonly openedMs: number | null;
  /** settled − locked in ms; null if either missing. */
  readonly lockToSettleMs: number | null;
  /** True when settle is missing or not after lock. */
  readonly advisoryInvalidOrder: boolean;
};

function toMs(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

export function enrichLifecycleStamps(
  rows: readonly LifecycleStampRow[],
): LifecycleStampEnriched[] {
  return rows.map((r) => {
    const lockedMs = toMs(r.lockedAt);
    const settledMs = toMs(r.settledAt);
    const openedMs = toMs(r.openedAt ?? null);
    const lockToSettleMs =
      lockedMs != null && settledMs != null ? settledMs - lockedMs : null;
    const advisoryInvalidOrder =
      settledMs == null ||
      lockedMs == null ||
      settledMs < lockedMs ||
      (openedMs != null && lockedMs != null && openedMs > lockedMs);
    return {
      ...r,
      lockedMs,
      settledMs,
      openedMs,
      lockToSettleMs,
      advisoryInvalidOrder,
    };
  });
}

export type LifecycleStampSummary = {
  readonly n: number;
  readonly withSettle: number;
  readonly invalidOrder: number;
  readonly medianLockToSettleMs: number | null;
};

export function summarizeLifecycleStamps(
  rows: readonly LifecycleStampRow[],
): LifecycleStampSummary {
  const enriched = enrichLifecycleStamps(rows);
  const deltas = enriched
    .map((r) => r.lockToSettleMs)
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b);
  const mid = deltas.length ? deltas[Math.floor(deltas.length / 2)]! : null;
  return {
    n: enriched.length,
    withSettle: enriched.filter((r) => r.settledMs != null).length,
    invalidOrder: enriched.filter((r) => r.advisoryInvalidOrder).length,
    medianLockToSettleMs: mid,
  };
}

export const OFFLINE_LIFECYCLE_FIXTURE: readonly LifecycleStampRow[] = [
  {
    id: "a",
    lockedAt: "2026-09-16T16:00:00.000Z",
    settledAt: "2026-09-16T23:30:00.000Z",
    openedAt: "2026-09-16T12:00:00.000Z",
  },
  {
    id: "b",
    lockedAt: "2026-09-16T17:00:00.000Z",
    settledAt: null,
    openedAt: "2026-09-16T11:00:00.000Z",
  },
  {
    id: "c",
    lockedAt: "2026-09-16T18:00:00.000Z",
    settledAt: "2026-09-16T17:00:00.000Z",
    openedAt: "2026-09-16T10:00:00.000Z",
  },
];
