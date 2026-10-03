/**
 * Preferred structural open path — single DB function owns both reads.
 *
 * Complements planSlateOpeningFromDb (RR two-statement Prisma reader).
 * See docs/plans/KERNEL_VS_RR_READER.md.
 *
 * LAW: refuse-default; mint+binding stay in pure planSlateOpening; fence opener cols.
 */

import { planSlateOpening, type SlateOpeningPlan } from "@sports/crypto";

export interface TryOpenSlateRow {
  readonly decision: "REVEAL" | "REFUSE";
  readonly reason: string | null;
  readonly pending_pick_count: number;
  readonly covered_pick_count: number;
  readonly pedersen_aggregate_hex: string | null;
  readonly pedersen_aggregate_value: string | null;
  readonly pedersen_blinding_sum: string | null;
}

/** Port for try_open_slate — production: $queryRaw, tests: memory. */
export interface TryOpenSlatePort {
  tryOpenSlate(slateKey: string): Promise<TryOpenSlateRow | null>;
}

/**
 * Preferred public open once SQL migration is applied.
 * SQL pre-REFUSE for settlement/presence; pure planner still runs mint+binding on REVEAL material.
 */
export async function planSlateOpeningFromSql(
  port: TryOpenSlatePort,
  slateKey: string,
): Promise<SlateOpeningPlan> {
  const row = await port.tryOpenSlate(slateKey);
  if (row == null) {
    return {
      action: "REFUSE",
      reason: "no_opener",
      detail: `try_open_slate returned null for slate ${slateKey}`,
    };
  }

  if (row.decision === "REFUSE") {
    return {
      action: "REFUSE",
      reason: mapSqlReason(row.reason),
      detail: `try_open_slate refused: ${row.reason ?? "unknown"} (pending=${row.pending_pick_count})`,
    };
  }

  return planSlateOpening({
    slateKey,
    aggregateHex: row.pedersen_aggregate_hex,
    aggregateValue: row.pedersen_aggregate_value,
    blindingSum: row.pedersen_blinding_sum,
    coveredPickCount: row.covered_pick_count,
    pendingPickCount: row.pending_pick_count,
  });
}

function mapSqlReason(
  reason: string | null,
): Extract<SlateOpeningPlan, { action: "REFUSE" }>["reason"] {
  switch (reason) {
    case "not_settled":
      return "not_settled";
    case "no_opener":
      return "no_opener";
    case "malformed_input":
      return "malformed_input";
    case "malformed_opener":
      return "malformed_opener";
    case "self_check_failed":
      return "self_check_failed";
    default:
      return "no_opener";
  }
}

/** Memory port mimicking try_open_slate body for unit tests. */
export function createMemoryTryOpenPort(seed: {
  pending: number;
  covered: number;
  hex: string | null;
  value: string | null;
  blinding: string | null;
}): TryOpenSlatePort {
  return {
    async tryOpenSlate(_slateKey: string): Promise<TryOpenSlateRow> {
      const { pending, covered, hex, value, blinding } = seed;
      if (covered <= 0 && hex == null) {
        return {
          decision: "REFUSE",
          reason: "no_opener",
          pending_pick_count: pending,
          covered_pick_count: covered,
          pedersen_aggregate_hex: hex,
          pedersen_aggregate_value: value,
          pedersen_blinding_sum: blinding,
        };
      }
      if (pending !== 0) {
        return {
          decision: "REFUSE",
          reason: "not_settled",
          pending_pick_count: pending,
          covered_pick_count: covered,
          pedersen_aggregate_hex: hex,
          pedersen_aggregate_value: value,
          pedersen_blinding_sum: blinding,
        };
      }
      if (hex == null || value == null || blinding == null) {
        return {
          decision: "REFUSE",
          reason: "no_opener",
          pending_pick_count: pending,
          covered_pick_count: covered,
          pedersen_aggregate_hex: hex,
          pedersen_aggregate_value: value,
          pedersen_blinding_sum: blinding,
        };
      }
      return {
        decision: "REVEAL",
        reason: null,
        pending_pick_count: pending,
        covered_pick_count: covered,
        pedersen_aggregate_hex: hex,
        pedersen_aggregate_value: value,
        pedersen_blinding_sum: blinding,
      };
    },
  };
}
