/**
 * Runway (R6) — pure display-math for the owner's cash-runway dashboard.
 *
 * No DB, no I/O. Every input is owner-supplied (see app/admin/runway/page.tsx
 * for where the numbers come from). This module computes nothing that writes,
 * transfers, or moves money — see the DISPLAY ONLY note on the page itself.
 */

export type RunwayInput = {
  cashInBankCents: number;
  mrrCents: number;
  monthlyBurnCents: number;
  familyFloorCents: number;
};

/**
 * Months of runway at the current net burn rate. Net-positive (MRR covers
 * burn) is indefinite runway → Infinity. Net-negative divides cash on hand by
 * the monthly shortfall.
 */
export function runwayMonths(i: RunwayInput): number {
  const net = i.mrrCents - i.monthlyBurnCents;
  if (net >= 0) return Infinity;
  return i.cashInBankCents / Math.abs(net);
}

/**
 * True when current net (MRR − burn) covers the owner's family-floor draw.
 * Boundary-inclusive: exact equality counts as hitting the floor.
 */
export function canHitFamilyFloor(i: RunwayInput): boolean {
  return i.mrrCents - i.monthlyBurnCents >= i.familyFloorCents;
}
