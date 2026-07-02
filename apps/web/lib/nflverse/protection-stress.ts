import type { QbPressureRow } from "./pressure-coverage";

/**
 * Protection Stress Index (Galaxy Data Doctrine stat factory).
 *
 * Definition: how much disruption a QB's pocket suffers, 0–100, from real
 * nflverse pass rows.
 * Formula: 0.7 × pressure share + 0.3 × (sacks/game capped at 4). Pressure
 * share is the anchor (the cleanest protection signal); sacks add the
 * terminal-failure weight.
 * Decision use: matchup stress — a high-stress pocket is a reason to fade a
 * QB's clean-pocket numbers, nothing more.
 * Known weakness (stat commandment): conflates O-line quality, scheme, and
 * the QB's own time-to-throw. High pressure with FEW sacks can mean a mobile
 * QB escaping, not a leaky line — read it with the sack column, not alone.
 * It does NOT measure how the QB PLAYS under pressure (that needs
 * clean-vs-pressured efficiency splits not in this feed — see notes).
 */

export type ProtectionStressBand = "high" | "moderate" | "contained";

const SACK_PER_GAME_CAP = 4;

export interface ProtectionStress {
  readonly index: number; // 0–100
  readonly band: ProtectionStressBand;
}

export function protectionStress(row: Pick<QbPressureRow, "pressurePct" | "sacks" | "games">): ProtectionStress {
  const sacksPerGame = row.games > 0 ? row.sacks / row.games : 0;
  const sackComponent = Math.min(1, sacksPerGame / SACK_PER_GAME_CAP);
  const stress01 = 0.7 * clamp01(row.pressurePct) + 0.3 * sackComponent;
  const index = Math.round(stress01 * 100);
  // Bands track the real NFL spread of this index (~16 best pocket, ~56 worst).
  const band: ProtectionStressBand =
    index >= 45 ? "high" : index >= 28 ? "moderate" : "contained";
  return { index, band };
}

export const PROTECTION_STRESS_TOOLTIP =
  "Protection Stress (0-100): 0.7×pressure share + 0.3×sacks/game. Matchup stress on the pocket. It conflates O-line, scheme, and the QB's own time-to-throw, so read it with the sack column.";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
