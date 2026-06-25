/**
 * FANTASY DISCOVERY LAYER — Role Mass Transfer Engine (Invention F2).
 *
 * When a player gains or loses a role, the opportunity does NOT vanish — it redistributes, and not
 * equally. The sharp question is not "the backup gets volume" but "WHO inherits the VALUABLE part
 * of the role?" Targets, carries, routes, and touches are not equal: a goal-line carry, a slot
 * route, a first-read target, and a checkdown carry different fantasy value. Some mass also leaks
 * off-roster (QB scrambles, a run-rate shift, lower efficiency, the opponent). Pure + deterministic.
 */

export interface VacatedRole {
  /** All shares are 0..1 of the team's total in that channel that the departing player held. */
  readonly targets: number;
  readonly carries: number;
  readonly routes: number;
  readonly redZoneTouches: number;
  readonly goalLineTouches: number;
  readonly airYards: number;
  readonly checkdownShare: number;
}

export interface Inheritor {
  readonly id: string;
  /** 0..1 how similar this player's archetype is to the vacated role. */
  readonly roleSimilarity: number;
  readonly coachingTrust: number;
  /** Per-channel fit 0..1: how naturally this player absorbs each opportunity type. */
  readonly fit: { readonly pass: number; readonly rush: number; readonly redZone: number; readonly deep: number; readonly checkdown: number };
}

export interface RoleMassContext {
  /** 0..1 how pass-heavy the team script is expected to be (shifts targets vs carries). */
  readonly passLean: number;
  /** 0..1 share of vacated mass that leaks off-roster (QB scrambles, opponent, efficiency loss, lower pace). */
  readonly teamLevelLeakage: number;
}

export interface InheritedRole {
  readonly id: string;
  readonly inheritedTargets: number;
  readonly inheritedCarries: number;
  readonly inheritedRedZone: number;
  readonly inheritedGoalLine: number;
  readonly inheritedAirYards: number;
  /** 0..1 share of the *valuable* (RZ/GL/air-yard/first-read) portion captured. */
  readonly valuableShare: number;
  readonly note: string;
}

export interface RoleMassResult {
  readonly allocations: readonly InheritedRole[];
  readonly leakage: number;
  readonly note: string;
}

/** Redistribute a vacated role across candidate inheritors, weighting the valuable channels. */
export function redistributeRoleMass(vacated: VacatedRole, inheritors: readonly Inheritor[], context: RoleMassContext): RoleMassResult {
  const leak = Math.max(0, Math.min(1, context.teamLevelLeakage));
  const retained = 1 - leak;

  // Per-channel weight of each inheritor (similarity × coaching trust × channel fit).
  const channelWeights = (channel: keyof Inheritor["fit"]) =>
    inheritors.map((h) => h.roleSimilarity * (0.5 + 0.5 * h.coachingTrust) * h.fit[channel]);

  const alloc = (vac: number, channel: keyof Inheritor["fit"]) => {
    const ws = channelWeights(channel);
    const sum = ws.reduce((a, b) => a + b, 0);
    return ws.map((w) => (sum > 0 ? (vac * retained * w) / sum : 0));
  };

  const passLean = Math.max(0, Math.min(1, context.passLean));
  const tgt = alloc(vacated.targets, "pass");
  const car = alloc(vacated.carries * (1 - 0.3 * passLean), "rush"); // pass scripts slightly suppress vacated carries (passLean clamped to [0,1])
  const rz = alloc(vacated.redZoneTouches, "redZone");
  const gl = alloc(vacated.goalLineTouches, "redZone");
  const ay = alloc(vacated.airYards, "deep");

  const valuableTotal = Math.max(1e-9, (vacated.redZoneTouches + vacated.goalLineTouches + vacated.airYards + 0.5 * vacated.targets) * retained);
  const base: InheritedRole[] = inheritors.map((h, i) => {
    const valuable = (rz[i]! + gl[i]! + ay[i]! + 0.5 * tgt[i]!) / valuableTotal;
    return {
      id: h.id,
      inheritedTargets: Number(tgt[i]!.toFixed(4)),
      inheritedCarries: Number(car[i]!.toFixed(4)),
      inheritedRedZone: Number(rz[i]!.toFixed(4)),
      inheritedGoalLine: Number(gl[i]!.toFixed(4)),
      inheritedAirYards: Number(ay[i]!.toFixed(4)),
      valuableShare: Number(Math.max(0, Math.min(1, valuable)).toFixed(4)),
      note: "",
    };
  });

  const top = base.slice().sort((a, b) => b.valuableShare - a.valuableShare)[0];
  // Only crown a valuable-core inheritor when one actually captured valuable mass; if every share is
  // zero (a pure-checkdown vacancy, or no fit), do not mislabel an arbitrary inheritor as "the edge".
  const hasValuableCore = top !== undefined && top.valuableShare > 0;
  const allocations = base.map((a) => ({
    ...a,
    note: hasValuableCore && a.id === top.id
      ? "Inherits the valuable (RZ/GL/air-yard/first-read) core of the role — the real edge."
      : "Inherits volume, but not the valuable core — beware the over-credited-backup trap.",
  }));

  return { allocations, leakage: Number(leak.toFixed(4)), note: `Redistributed vacated role across ${inheritors.length} inheritors; ${(leak * 100).toFixed(0)}% leaked off-roster.` };
}
