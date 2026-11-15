/**
 * Stage-5 publication gate — server-side checkout precondition.
 *
 * A pick is an "official play" for checkout purposes only when ALL of:
 *   - pick.isPublished === true
 *   - pick.result === "PENDING" (not yet settled)
 *   - its game.commenceTime is known and strictly in the future
 *   - pick.factorBreakdown.fiveStageReceipt exists with
 *     schemaVersion === FIVE_STAGE_RECEIPT_SCHEMA_VERSION and
 *     gatePassed === true (strict boolean)
 *
 * The receipt contract mirrors packages/ingestion-pipeline/src/publication-gate.ts
 * (FIVE_STAGE_RECEIPT_SCHEMA_VERSION, read-only reference). The constant is
 * duplicated here because apps/web cannot deep-import that module through the
 * tsconfig path alias; the test suite pins both values together.
 *
 * FAIL CLOSED: any DB error, unknown kickoff, missing/malformed receipt, or
 * stub database yields 0 official plays and checkout disabled. The pure
 * predicate is injectable and unit-testable without a database.
 */

import { db, isStubMode } from "@sports/db";

/** Must stay in sync with publication-gate.ts in packages/ingestion-pipeline. */
export const FIVE_STAGE_RECEIPT_SCHEMA_VERSION = "2026-11-13-v1";

/** Minimal pick shape the predicate needs (injectable for tests). */
export interface Stage5CandidateRow {
  readonly id?: string;
  readonly isPublished: boolean;
  readonly result: string;
  readonly factorBreakdown: unknown;
  readonly gameCommenceTime: Date | string | null;
}

export interface Stage5GateStatus {
  readonly officialPlayCount: number;
  readonly checkoutEnabled: boolean;
  readonly reason: string;
  readonly evaluatedAt: string;
}

function toEpochMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Extract the fiveStageReceipt object from a jsonb factorBreakdown, or null. */
export function extractFiveStageReceipt(
  factorBreakdown: unknown,
): Record<string, unknown> | null {
  if (factorBreakdown === null || typeof factorBreakdown !== "object") return null;
  const receipt = (factorBreakdown as Record<string, unknown>).fiveStageReceipt;
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    return null;
  }
  return receipt as Record<string, unknown>;
}

/**
 * Pure predicate: does this row count as an official Stage-5 play right now?
 * Every axis fails closed — a malformed or missing receipt is never a pass.
 */
export function isOfficialStage5Play(row: Stage5CandidateRow, now: Date = new Date()): boolean {
  if (row.isPublished !== true) return false;
  if (row.result !== "PENDING") return false;

  const kickoffMs = toEpochMs(row.gameCommenceTime);
  if (kickoffMs === null || kickoffMs <= now.getTime()) return false;

  const receipt = extractFiveStageReceipt(row.factorBreakdown);
  if (receipt === null) return false;
  if (receipt.schemaVersion !== FIVE_STAGE_RECEIPT_SCHEMA_VERSION) return false;
  // Strict boolean: the string "true" or 1 must never open checkout.
  if (receipt.gatePassed !== true) return false;

  return true;
}

/** Pure count over injected rows. */
export function countOfficialStage5Plays(
  rows: readonly Stage5CandidateRow[],
  now: Date = new Date(),
): number {
  let count = 0;
  for (const row of rows) {
    if (isOfficialStage5Play(row, now)) count += 1;
  }
  return count;
}

/** Injectable row source so tests never need a database. */
export type Stage5PickSource = (now: Date) => Promise<Stage5CandidateRow[]>;

/**
 * Prisma-backed source: published, pending picks on future games. The pure
 * predicate re-checks every row (including the receipt) so a loose query can
 * never open the gate on its own.
 */
export const prismaStage5PickSource: Stage5PickSource = async (now) => {
  // Stub DB (no DATABASE_URL) must never report official plays — even when
  // demo sample picks are enabled, none of them carry a real receipt.
  if (isStubMode()) return [];
  const rows = await db.pick.findMany({
    where: {
      isPublished: true,
      result: "PENDING",
      game: { commenceTime: { gt: now } },
    },
    select: {
      id: true,
      isPublished: true,
      result: true,
      factorBreakdown: true,
      game: { select: { commenceTime: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    isPublished: r.isPublished,
    result: r.result,
    factorBreakdown: r.factorBreakdown,
    gameCommenceTime: r.game?.commenceTime ?? null,
  }));
};

/**
 * Evaluate the gate. FAIL CLOSED: any source error => 0 official plays,
 * checkout disabled, honest reason. Never throws.
 */
export async function getStage5GateStatus(
  source: Stage5PickSource = prismaStage5PickSource,
  now: Date = new Date(),
): Promise<Stage5GateStatus> {
  const evaluatedAt = now.toISOString();
  try {
    const rows = await source(now);
    const officialPlayCount = countOfficialStage5Plays(rows, now);
    if (officialPlayCount >= 1) {
      return {
        officialPlayCount,
        checkoutEnabled: true,
        reason: `${officialPlayCount} official ${officialPlayCount === 1 ? "play has" : "plays have"} cleared the five-stage check for an upcoming slate.`,
        evaluatedAt,
      };
    }
    return {
      officialPlayCount: 0,
      checkoutEnabled: false,
      reason:
        "No official play has cleared our five-stage check for an upcoming slate yet, so checkout is closed. Passing is a decision, not an absence.",
      evaluatedAt,
    };
  } catch {
    return {
      officialPlayCount: 0,
      checkoutEnabled: false,
      reason:
        "We could not verify the five-stage check right now, so checkout is closed as a precaution. Please check back shortly.",
      evaluatedAt,
    };
  }
}