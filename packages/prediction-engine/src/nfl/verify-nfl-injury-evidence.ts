/**
 * Hard pre-publication injury gate. Inactive / IR / 0-GP players publish at 0.
 * A verified activation override is the only exception, and it must be explicit.
 */

export const INACTIVE_STATUSES = ["Out", "Doubtful", "IR", "PUP", "Inactive"] as const;

export interface InjuryRow {
  readonly player_name: string;
  readonly report_status?: string | null;
  readonly player_gp: number;
  readonly activated_from_ir_verified?: boolean;
  readonly projection?: number;
}

export interface InjuryBlock {
  readonly player_name: string;
  readonly proj: number;
  readonly publishAllowed: boolean;
  readonly reason: "BLOCKED_INACTIVE_OR_OUT_PLAYER" | "ACTIVE";
}

const WEEK8_HARD_BLOCK = new Set([
  "richie james",
  "isaiah likely",
  "trey benson",
  "jalen mcmillan",
]);

export function verifyNflInjuryEvidence(row: InjuryRow): InjuryBlock {
  const name = row.player_name.trim().toLowerCase();
  const status = (row.report_status ?? "").trim();
  const blocked =
    WEEK8_HARD_BLOCK.has(name) ||
    (INACTIVE_STATUSES as readonly string[]).includes(status) ||
    (row.player_gp === 0 && row.activated_from_ir_verified !== true);
  if (blocked) {
    return {
      player_name: row.player_name,
      proj: 0,
      publishAllowed: false,
      reason: "BLOCKED_INACTIVE_OR_OUT_PLAYER",
    };
  }
  return {
    player_name: row.player_name,
    proj: row.projection ?? 0,
    publishAllowed: true,
    reason: "ACTIVE",
  };
}
