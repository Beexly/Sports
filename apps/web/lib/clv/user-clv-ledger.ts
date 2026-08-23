import type { db as RealDb } from "@sports/db";

/**
 * Elite CLV ledger — a VIEW of the platform's own already-published,
 * already-graded picks' realized closing-line value.
 *
 * Adds no new data collection and computes no new number: every field
 * rendered here already exists on `Pick`, populated at settlement time by
 * `gradePickClv()` / `gradeFreePathClv()`. This is a read view only — no
 * write, no mutation, no ingestion path touched.
 *
 * Fail-closed by design (CLAUDE.md: "no frontend-only paywalls — enforcement
 * is server-side only"): `canUseClvLedger` is checked HERE, not just by the
 * calling page, so a FREE/PRO viewer gets a locked, empty result even if a
 * future caller forgets to gate — never partial data, and the DB is never
 * even queried for a locked viewer.
 */

export interface ClvLedgerRow {
  readonly id: string;
  readonly sport: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly settledAt: string | null;
  /** null = no closing snapshot was derivable (a real, already-modeled state
   *  in gradePickClv) — render as "not yet graded," never coerced to 0. */
  readonly clvValue: number | null;
  /** "POINTS" | "PROBABILITY" — which unit clvValue is in (points spread/total
   *  vs. probability delta for a moneyline). Not in the card's literal field
   *  list but already exists on Pick, and app/admin/clv/page.tsx already
   *  relies on it for the same reason: omitting it would risk mislabeling a
   *  moneyline's probability delta as a points value. */
  readonly clvKind: string | null;
  readonly clvVerdict: string | null;
  readonly clvCloseLine: number | null;
  readonly clvClosePrice: number | null;
  readonly clvLockLine: number | null;
  readonly clvLockPrice: number | null;
}

export type UserClvLedgerResult =
  | { readonly locked: true; readonly rows: readonly [] }
  | { readonly locked: false; readonly rows: readonly ClvLedgerRow[] };

export interface RawClvPickRow {
  readonly id: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly result: string;
  readonly settledAt: Date | null;
  readonly clvValue: number | null;
  readonly clvKind: string | null;
  readonly clvVerdict: string | null;
  readonly clvCloseLine: number | null;
  readonly clvClosePrice: number | null;
  readonly clvLockLine: number | null;
  readonly clvLockPrice: number | null;
  readonly game: { readonly sport: { readonly name: string } | null } | null;
}

/**
 * Pure shaping step — takes plain already-fetched rows, no DB/client
 * involved, so it is trivially unit-testable with fixture arrays. All the
 * fail-closed and honesty behavior (locked gate, null-clvValue passthrough)
 * lives here.
 */
export function shapeClvLedgerRows(
  picks: readonly RawClvPickRow[],
  canUseClvLedger: boolean,
): UserClvLedgerResult {
  if (!canUseClvLedger) return { locked: true, rows: [] };

  const rows: ClvLedgerRow[] = picks.map((p) => ({
    id: p.id,
    sport: p.game?.sport?.name ?? "Unknown",
    pickType: p.pickType,
    selection: p.selection,
    line: p.line,
    result: p.result as ClvLedgerRow["result"],
    settledAt: p.settledAt ? p.settledAt.toISOString() : null,
    clvValue: p.clvValue,
    clvKind: p.clvKind,
    clvVerdict: p.clvVerdict,
    clvCloseLine: p.clvCloseLine,
    clvClosePrice: p.clvClosePrice,
    clvLockLine: p.clvLockLine,
    clvLockPrice: p.clvLockPrice,
  }));

  return { locked: false, rows };
}

/** Bounded page size — this is a recent-history view, not a full export. */
const LEDGER_TAKE = 200;

/**
 * Server-only loader. Thin by design: the DB query is a plain, directly-typed
 * call against the real `@sports/db` client (no adapter interface — Prisma's
 * findMany is generic enough that a hand-written adapter type can't
 * structurally match it without an `any` escape hatch, which CLAUDE.md
 * forbids). Correctness rides entirely on `shapeClvLedgerRows` above, which
 * carries the actual test coverage; this function does nothing but fetch and
 * delegate, and skips the query entirely when the viewer is not entitled.
 */
export async function loadUserClvLedger(
  db: typeof RealDb,
  canUseClvLedger: boolean,
): Promise<UserClvLedgerResult> {
  if (!canUseClvLedger) return { locked: true, rows: [] };

  const picks = await db.pick.findMany({
    where: { isPublished: true, result: { not: "PENDING" } },
    orderBy: { settledAt: "desc" },
    take: LEDGER_TAKE,
    select: {
      id: true,
      pickType: true,
      selection: true,
      line: true,
      result: true,
      settledAt: true,
      clvValue: true,
      clvKind: true,
      clvVerdict: true,
      clvCloseLine: true,
      clvClosePrice: true,
      clvLockLine: true,
      clvLockPrice: true,
      game: { select: { sport: { select: { name: true } } } },
    },
  });

  return shapeClvLedgerRows(picks, true);
}
