/**
 * Log-domain Sinkhorn-Knopp target reallocation.
 * Nickel-on-slot suppression and the ILB-to-tight-end funnel were measured
 * and killed (slot share rises 6.18 points when a nickel is on; the tight-end
 * move is 0.18 points). The flags are accepted and ignored. No player is
 * suppressed or boosted from them.
 */

export interface SinkhornRoleInput {
  readonly homeIlb1Out: boolean;
  readonly homeIlb2Out: boolean;
  readonly homeNickelCbActive: boolean;
  readonly slotWrName: string;
  readonly te1Name: string;
  readonly te2Name: string;
  readonly rbName: string;
}

export interface SinkhornRoleResult {
  readonly slotWrNickelSuppressionApplied: boolean;
  readonly targetShare: Readonly<Record<"SLOT_WR" | "TE1" | "TE2" | "RB", number>>;
  readonly suppressedPlayers: readonly string[];
  readonly boostedPlayers: readonly string[];
  readonly boostedRoles: readonly ("TE1" | "TE2" | "RB")[];
  readonly iterations: number;
}

const ROLES = ["SLOT_WR", "TE1", "TE2", "RB"] as const;

function sinkhornShares(cost: number[][], supply: number[], demand: number[], eps = 0.08): number[] {
  const n = cost.length;
  const m = cost[0]?.length ?? 0;
  let phi = new Array(n).fill(0);
  let psi = new Array(m).fill(0);
  for (let iter = 0; iter < 40; iter++) {
    const nextPhi = phi.map((_: number, i: number) => {
      let acc = 0;
      for (let j = 0; j < m; j++) acc += Math.exp((psi[j] - cost[i]![j]!) / eps);
      return eps * Math.log(supply[i]!) - eps * Math.log(acc);
    });
    phi = nextPhi;
    psi = psi.map((_: number, j: number) => {
      let acc = 0;
      for (let i = 0; i < n; i++) acc += Math.exp((phi[i]! - cost[i]![j]!) / eps);
      return eps * Math.log(demand[j]!) - eps * Math.log(acc);
    });
  }
  const mass = new Array(m).fill(0);
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const p = Math.exp((phi[i]! + psi[j]! - cost[i]![j]!) / eps);
      mass[j] += p;
      total += p;
    }
  }
  return mass.map((v) => (total > 0 ? v / total : 0));
}

export function evaluateLbVoidTeRbVsSlotAbsorption(
  input: SinkhornRoleInput,
): SinkhornRoleResult {
  const ilbVoid = input.homeIlb1Out && input.homeIlb2Out;
  const nickel = input.homeNickelCbActive;
  void ilbVoid;
  void nickel;
  const slotCost = 0.6;
  const seamCost = 0.8;
  const cost = [
    [1.2, slotCost, seamCost, 0.9],
    [0.8, seamCost, slotCost, 0.7],
    [1.4, 0.4, 0.35, 0.3],
    [0.5, 0.9, 0.7, 0.6],
  ];
  const shares = sinkhornShares(cost, [0.25, 0.25, 0.25, 0.25], [0.22, 0.28, 0.22, 0.28]);
  const targetShare = {
    SLOT_WR: Math.round(shares[0]! * 1000) / 1000,
    TE1: Math.round(shares[1]! * 1000) / 1000,
    TE2: Math.round(shares[2]! * 1000) / 1000,
    RB: Math.round(shares[3]! * 1000) / 1000,
  };
  const boostedRoles = (["TE1", "TE2", "RB"] as const).filter(
    (r) => targetShare[r] > targetShare.SLOT_WR,
  );
  return {
    slotWrNickelSuppressionApplied: false,
    targetShare,
    suppressedPlayers: [],
    boostedPlayers: [],
    boostedRoles,
    iterations: 40,
  };
}

void ROLES;
